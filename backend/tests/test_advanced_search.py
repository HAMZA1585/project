import pytest
from app import create_app, db
from app.models import Article, User
from sqlalchemy import text


@pytest.fixture
def app():
    app = create_app()
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    app.config['JWT_SECRET_KEY'] = 'test-secret'

    with app.app_context():
        db.create_all()

        # Ensure clean FTS5 setup
        db.session.execute(text("DROP TRIGGER IF EXISTS articles_ad"))
        db.session.execute(text("DROP TRIGGER IF EXISTS articles_au"))
        db.session.execute(text("DROP TRIGGER IF EXISTS articles_ai"))
        db.session.execute(text("DROP TABLE IF EXISTS articles_fts"))

        # Create FTS5 virtual table and triggers (mirror migration)
        db.session.execute(text(
            """
            CREATE VIRTUAL TABLE articles_fts USING fts5(
                title,
                content,
                content='articles',
                content_rowid='id'
            )
            """
        ))
        db.session.execute(text(
            """
            CREATE TRIGGER articles_ai AFTER INSERT ON articles BEGIN
                INSERT INTO articles_fts(rowid, title, content)
                VALUES (new.id, new.title, new.content);
            END
            """
        ))
        db.session.execute(text(
            """
            CREATE TRIGGER articles_au AFTER UPDATE ON articles BEGIN
                UPDATE articles_fts SET title = new.title, content = new.content
                WHERE rowid = new.id;
            END
            """
        ))
        db.session.execute(text(
            """
            CREATE TRIGGER articles_ad AFTER DELETE ON articles BEGIN
                DELETE FROM articles_fts WHERE rowid = old.id;
            END
            """
        ))

        # Seed sample articles
        articles = [
            Article(title='Crime surge in Karachi', url='http://a', source='DAWN', content='Reported crime incidents rise', category='Crime', location='Karachi'),
            Article(title='Technology fair in Islamabad', url='http://b', source='Express', content='Latest gadgets showcased', category='Technology', location='Islamabad'),
            Article(title='Storm hits Lahore', url='http://c', source='Nation', content='Severe storm warning issued', category='Weather', location='Lahore'),
        ]
        db.session.add_all(articles)
        db.session.commit()

        yield app

        # Teardown: drop FTS5 structures and tables
        db.session.execute(text("DROP TRIGGER IF EXISTS articles_ad"))
        db.session.execute(text("DROP TRIGGER IF EXISTS articles_au"))
        db.session.execute(text("DROP TRIGGER IF EXISTS articles_ai"))
        db.session.execute(text("DROP TABLE IF EXISTS articles_fts"))
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


def login(client, email, password):
    app = client.application
    with app.app_context():
        user = User(username=email.split('@')[0], email=email, role='user')
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
    return client.post('/api/v1/auth/login', json={'email': email, 'password': password})


def test_advanced_search_keyword(client):
    resp = client.get('/api/v1/advanced-search/search', query_string={'keyword': 'crime'})
    assert resp.status_code == 200
    data = resp.get_json()
    assert 'articles' in data
    titles = [a['title'] for a in data['articles']]
    assert any('Crime' in t or 'crime' in t for t in titles)


def test_advanced_search_filters(client):
    resp = client.get('/api/v1/advanced-search/search', query_string={'location': 'Islamabad', 'category': 'Technology'})
    assert resp.status_code == 200
    data = resp.get_json()
    assert all(a['location'] == 'Islamabad' for a in data['articles'])
    assert all(a['category'] == 'Technology' for a in data['articles'])


def test_saved_queries_requires_auth(client):
    resp = client.post('/api/v1/advanced-search/saved-queries', json={'name': 'q1', 'query': 'crime'})
    assert resp.status_code == 401


# Note: deletion flows are covered elsewhere; focus here is auth-restriction and search functionality