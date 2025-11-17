import os
from dotenv import load_dotenv

load_dotenv()
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))


class Config:
    # SECURITY: Require environment variables for secrets
    SECRET_KEY = os.getenv('SECRET_KEY')
    if not SECRET_KEY:
        raise ValueError("SECRET_KEY environment variable is required for security")
    
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'sqlite:///site.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SESSION_COOKIE_SAMESITE = 'Lax'
    SESSION_COOKIE_SECURE = False

    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', SECRET_KEY)
    if not JWT_SECRET_KEY:
        raise ValueError("JWT_SECRET_KEY environment variable is required for security")
    JWT_ACCESS_TOKEN_EXPIRES = 3600
    JWT_REFRESH_TOKEN_EXPIRES = 2592000
    JWT_ALGORITHM = 'HS256'

    # JWT Cookie Configuration
    JWT_TOKEN_LOCATION = ['cookies']
    JWT_ACCESS_COOKIE_NAME = 'access_token_cookie'
    JWT_REFRESH_COOKIE_NAME = 'refresh_token_cookie'
    JWT_COOKIE_SECURE = False  # Overridden in ProductionConfig
    JWT_COOKIE_CSRF_PROTECT = False  # Consider True with CSRF setup
    JWT_COOKIE_SAMESITE = 'Lax'  # Allow cookies with same-site requests
    JWT_COOKIE_PATH = '/'  # Explicitly set cookie path

    NEWS_API_KEY = os.getenv('NEWS_API_KEY')
    CURRENTS_API_KEY = os.getenv('CURRENTS_API_KEY')
    GUARDIAN_API_KEY = os.getenv('GUARDIAN_API_KEY')

    # Redis configuration for RQ
    RQ_REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
    RQ_QUEUES = ['default', 'scraping', 'analysis', 'trends']


class DevelopmentConfig(Config):
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.getenv('DEV_DATABASE_URL', 'sqlite:///site.db')
    SESSION_COOKIE_SECURE = False
    JWT_COOKIE_SECURE = False
    JWT_COOKIE_SAMESITE = 'Lax'  # Allow cookies with same-site requests


class ProductionConfig(Config):
    DEBUG = False
    
    # Require a production PostgreSQL database URI
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL')
    
    SESSION_COOKIE_SECURE = True
    JWT_COOKIE_SECURE = True
    JWT_COOKIE_SAMESITE = 'None'  # Required when Secure=True for cross-origin


class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    SESSION_COOKIE_SECURE = False
    JWT_COOKIE_SECURE = False