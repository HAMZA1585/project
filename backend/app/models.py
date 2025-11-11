from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from . import db

class Article(db.Model):
    __tablename__ = 'articles'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(500), nullable=False)
    url = db.Column(db.String(500), unique=True, nullable=False)
    source = db.Column(db.String(50), nullable=False)
    content = db.Column(db.Text, nullable=True)
    category = db.Column(db.String(100), nullable=True)
    location = db.Column(db.String(100), nullable=True)  # Added location field
    date = db.Column(db.DateTime, nullable=True)
    sentiment_label = db.Column(db.String(20), nullable=True)
    sentiment_score = db.Column(db.Float, nullable=True)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())

    def __repr__(self):
        return f"<Article {self.id}: {self.title}>"

class User(db.Model, UserMixin):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), unique=True, nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    role = db.Column(db.String(20), default="user", nullable=False)
    preferences = db.Column(db.JSON, nullable=True)  # User preferences (e.g., favorite category)

    def __repr__(self):
        return f"<User {self.username}>"

    def set_password(self, password):
        self.password = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password, password)

class Trend(db.Model):
    __tablename__ = 'trends'
    id = db.Column(db.Integer, primary_key=True)
    keyword = db.Column(db.String(100), nullable=False)
    score = db.Column(db.Float, nullable=False)
    # We can track trends by the date they were calculated
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())

    def __repr__(self):
        return f"<Trend {self.keyword} ({self.score})>"

class SystemNotification(db.Model):
    __tablename__ = 'system_notifications'
    id = db.Column(db.Integer, primary_key=True)
    level = db.Column(db.String(50), nullable=False, default='ERROR')  # ERROR, WARNING, INFO
    message = db.Column(db.String(500), nullable=False)
    source = db.Column(db.String(100), nullable=True)  # e.g., 'scraper', 'sentiment'
    is_resolved = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())

    def __repr__(self):
        return f"<SystemNotification {self.level}: {self.message[:50]}>"

class SavedQuery(db.Model):
    __tablename__ = 'saved_queries'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    name = db.Column(db.String(120), nullable=False)
    description = db.Column(db.String(500), nullable=True)
    query = db.Column(db.String(1000), nullable=False)
    filters = db.Column(db.JSON, nullable=True)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())

    def __repr__(self):
        return f"<SavedQuery {self.name}>"

class SearchAlert(db.Model):
    __tablename__ = 'search_alerts'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    name = db.Column(db.String(120), nullable=False)
    query = db.Column(db.String(1000), nullable=False)
    filters = db.Column(db.JSON, nullable=True)
    frequency = db.Column(db.String(50), default='daily', nullable=False)  # instant, hourly, daily
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    last_triggered_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())

    def __repr__(self):
        return f"<SearchAlert {self.name} active={self.is_active}>"

