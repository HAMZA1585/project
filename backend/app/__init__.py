from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
from flask_rq2 import RQ
import os
from .config import DevelopmentConfig, ProductionConfig, TestingConfig
from .utils import setup_logging
from flask_cors import CORS 
from flask import request, jsonify
import threading
import time

# Initialize extensions
db = SQLAlchemy()
jwt = JWTManager()
migrate = Migrate()
rq = RQ()

_autoscrape_started = False

def create_app():
    app = Flask(__name__)

    # Load config based on FLASK_ENV
    flask_env = os.getenv('FLASK_ENV', '').lower()
    if flask_env == 'production':
        app.config.from_object(ProductionConfig)
        prod_db_url = app.config.get('SQLALCHEMY_DATABASE_URI', '')
        if not prod_db_url or not prod_db_url.startswith('postgresql'):
            raise ValueError(
                "PRODUCTION ERROR: DATABASE_URL environment variable is not set or is not a PostgreSQL URI. "
                "Production requires PostgreSQL. Example: postgresql://user:password@localhost:5432/dbname"
            )
    elif flask_env == 'testing':
        app.config.from_object(TestingConfig)
    else:
        app.config.from_object(DevelopmentConfig)

    # Setup logging early
    setup_logging()

    CORS(
        app,
        origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174"],
        supports_credentials=True
    )

    # Initialize extensions
    db.init_app(app)
    jwt.init_app(app)
    migrate.init_app(app, db)
    rq.init_app(app)

    # Cookie security configuration based on environment
    env = app.config.get("ENV", "production")
    if env == "production":
        app.config["SESSION_COOKIE_SECURE"] = True

    # Register core blueprints
    from .auth import auth
    # from .routes import admin # This is the old one, we can remove it.
    from .admin import admin_api # This is our new API blueprint
    app.register_blueprint(auth, url_prefix='/api/v1/auth')
    # app.register_blueprint(admin, url_prefix='/admin') # This is the old one, we can remove it.
    app.register_blueprint(admin_api, url_prefix='/api/v1/admin') # Register the new API

    # ✅ Register analysis blueprints
    from .sentiment_routes import sentiment_bp
    from .trend_analysis import trend_analysis
    from .api import api_bp
    from .report import report_bp
    from .notification_routes import notification_bp
    from .ai_curation_routes import ai_curation_bp
    from .advanced_search_api import advanced_search_bp as advanced_search_api_bp
    from .archive_routes import archive_bp
    app.register_blueprint(sentiment_bp, url_prefix='/api/v1/sentiment')
    app.register_blueprint(trend_analysis, url_prefix='/api/v1/trends')
    app.register_blueprint(api_bp, url_prefix='/api/v1')
    app.register_blueprint(report_bp, url_prefix='/api/v1/report')
    app.register_blueprint(notification_bp, url_prefix='/api/v1/notifications')
    app.register_blueprint(ai_curation_bp, url_prefix='/api/v1/curation')
    app.register_blueprint(advanced_search_api_bp, url_prefix='/api/v1/advanced-search')
    app.register_blueprint(archive_bp, url_prefix='/api/v1')

    # Import models here to avoid circular imports
    with app.app_context():
        from .models import User
        # Create all database tables
        db.create_all()
        print("DEBUG: Database tables created/verified")

        try:
            # Ensure FTS5 virtual table exists for advanced search
            exists = db.session.execute(
                db.text("""
                    SELECT name FROM sqlite_master WHERE type='table' AND name='articles_fts'
                """)
            ).fetchone()
            if not exists:
                db.session.execute(db.text("""
                    CREATE VIRTUAL TABLE articles_fts USING fts5(
                        title,
                        content,
                        content='articles',
                        content_rowid='id'
                    )
                """))
                db.session.execute(db.text("""
                    CREATE TRIGGER articles_ai AFTER INSERT ON articles BEGIN
                        INSERT INTO articles_fts(rowid, title, content)
                        VALUES (new.id, new.title, new.content);
                    END
                """))
                db.session.execute(db.text("""
                    CREATE TRIGGER articles_au AFTER UPDATE ON articles BEGIN
                        UPDATE articles_fts SET title = new.title, content = new.content
                        WHERE rowid = new.id;
                    END
                """))
                db.session.execute(db.text("""
                    CREATE TRIGGER articles_ad AFTER DELETE ON articles BEGIN
                        DELETE FROM articles_fts WHERE rowid = old.id;
                    END
                """))
                db.session.execute(db.text("""
                    INSERT INTO articles_fts(rowid, title, content)
                    SELECT id, title, content FROM articles
                """))
                db.session.commit()
                print("DEBUG: FTS5 table and triggers created/populated")
        except Exception as fts_err:
            print(f"DEBUG: FTS5 setup error: {fts_err}")

        try:
            enable_auto = os.getenv('AUTOSCRAPE_DAWN', 'true').lower() in ['1','true','yes']
            if enable_auto and not globals().get('_autoscrape_started', False):
                interval_min = int(os.getenv('AUTOSCRAPE_INTERVAL_MINUTES', '30'))
                limit = int(os.getenv('AUTOSCRAPE_LIMIT', '8'))
                from .tasks import run_dawn_scrape_sync
                from .tasks import update_dawn_missing_dates
                def _loop(app_ref):
                    while True:
                        try:
                            with app_ref.app_context():
                                run_dawn_scrape_sync(limit)
                                update_dawn_missing_dates(50)
                        except Exception:
                            pass
                        time.sleep(max(5, interval_min * 60))
                t = threading.Thread(target=_loop, args=(app,), daemon=True)
                t.start()
                globals()['_autoscrape_started'] = True
        except Exception:
            pass

    # Error handling helpers
    def _wants_json_response():
        try:
            # JSON if request is JSON, or Accept prefers JSON, or XHR
            if request.is_json:
                return True
            accepts_json = request.accept_mimetypes and (
                request.accept_mimetypes['application/json'] or 0
            ) >= (request.accept_mimetypes['text/html'] or 0)
            is_xhr = request.headers.get('X-Requested-With') == 'XMLHttpRequest'
            return accepts_json or is_xhr or request.path.startswith('/api')
        except Exception:
            return False

    @app.errorhandler(400)
    def handle_400(error):
        return jsonify({"error": "Bad request"}), 400

    @app.errorhandler(401)
    def handle_401(error):
        return jsonify({"error": "Unauthorized"}), 401

    @app.errorhandler(403)
    def handle_403(error):
        return jsonify({"error": "Forbidden"}), 403

    @app.errorhandler(404)
    def handle_404(error):
        return jsonify({"error": "Not found"}), 404

    @app.errorhandler(405)
    def handle_405(error):
        return jsonify({"error": "Method not allowed"}), 405

    @app.errorhandler(422)
    def handle_422(error):
        return jsonify({"error": "Unprocessable entity"}), 422

    @app.errorhandler(500)
    def server_error(e):
        return jsonify({"error": "Internal Server Error"}), 500

    @app.errorhandler(Exception)
    def handle_exception(e):
        return jsonify({"error": "An unexpected error occurred"}), 500

    return app
