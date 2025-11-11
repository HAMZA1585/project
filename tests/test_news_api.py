import pytest
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

from backend.app.api.news_routes import NewsAPI
from backend.app import create_app, db
from backend.app.models import Article
import tempfile

class TestNewsAPI:
    def setup_method(self):
        """Set up test fixtures before each test method."""
        self.app = create_app()
        self.app.config['TESTING'] = True
        self.app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        self.app_context = self.app.app_context()
        self.app_context.push()
        db.create_all()
        
        self.news_api = NewsAPI()
        self.client = self.app.test_client()
    
    def teardown_method(self):
        """Clean up after each test method."""
        db.session.remove()
        db.drop_all()
        self.app_context.pop()
    
    def test_get_news_success(self):
        """Test successful news retrieval."""
        # Create test articles
        article1 = Article(
            title="Test Article 1",
            content="This is test content 1",
            source="Test Source",
            url="http://test.com/1",
            category="Test",
            sentiment_label="Positive",
            sentiment_score=0.8
        )
        article2 = Article(
            title="Test Article 2",
            content="This is test content 2",
            source="Test Source",
            url="http://test.com/2",
            category="Test",
            sentiment_label="Negative",
            sentiment_score=0.2
        )
        
        db.session.add(article1)
        db.session.add(article2)
        db.session.commit()
        
        # Test API endpoint
        response = self.client.get('/api/v1/news')
        
        assert response.status_code == 200
        data = response.get_json()
        assert 'articles' in data
        assert len(data['articles']) == 2
    
    def test_get_news_with_filters(self):
        """Test news retrieval with filters."""
        # Create test articles
        article1 = Article(
            title="Positive Article",
            content="This is positive content",
            source="Test Source",
            url="http://test.com/1",
            category="Test",
            sentiment_label="Positive",
            sentiment_score=0.8
        )
        article2 = Article(
            title="Negative Article",
            content="This is negative content",
            source="Test Source",
            url="http://test.com/2",
            category="Test",
            sentiment_label="Negative",
            sentiment_score=0.2
        )
        
        db.session.add(article1)
        db.session.add(article2)
        db.session.commit()
        
        # Test with sentiment filter
        response = self.client.get('/api/v1/news?sentiment=Positive')
        
        assert response.status_code == 200
        data = response.get_json()
        assert 'articles' in data
        assert len(data['articles']) == 1
        assert data['articles'][0]['sentiment_label'] == 'Positive'
    
    def test_get_news_pagination(self):
        """Test news retrieval with pagination."""
        # Create multiple test articles
        for i in range(25):
            article = Article(
                title=f"Test Article {i}",
                content=f"This is test content {i}",
                source="Test Source",
                url=f"http://test.com/{i}",
                category="Test",
                sentiment_label="Neutral",
                sentiment_score=0.5
            )
            db.session.add(article)
        
        db.session.commit()
        
        # Test pagination
        response = self.client.get('/api/v1/news?page=1&per_page=10')
        
        assert response.status_code == 200
        data = response.get_json()
        assert 'articles' in data
        assert len(data['articles']) == 10
        assert 'pagination' in data
        assert data['pagination']['total'] == 25
        assert data['pagination']['page'] == 1
        assert data['pagination']['per_page'] == 10
    
    def test_get_news_empty_result(self):
        """Test news retrieval with no articles."""
        response = self.client.get('/api/v1/news')
        
        assert response.status_code == 200
        data = response.get_json()
        assert 'articles' in data
        assert len(data['articles']) == 0
    
    def test_get_news_invalid_filters(self):
        """Test news retrieval with invalid filters."""
        response = self.client.get('/api/v1/news?page=-1&per_page=0')
        
        assert response.status_code == 400
        data = response.get_json()
        assert 'error' in data
    
    def test_get_news_stats(self):
        """Test news statistics endpoint."""
        # Create test articles with different sentiments
        sentiments = ['Positive', 'Negative', 'Neutral']
        for i, sentiment in enumerate(sentiments):
            article = Article(
                title=f"Test Article {i}",
                content=f"This is test content {i}",
                source="Test Source",
                url=f"http://test.com/{i}",
                category="Test",
                sentiment_label=sentiment,
                sentiment_score=0.3 + i * 0.3
            )
            db.session.add(article)
        
        db.session.commit()
        
        response = self.client.get('/api/v1/news/stats')
        
        assert response.status_code == 200
        data = response.get_json()
        assert 'total_articles' in data
        assert 'sentiment_distribution' in data
        assert data['total_articles'] == 3
        assert len(data['sentiment_distribution']) == 3
    
    def test_search_news(self):
        """Test news search functionality."""
        # Create test articles
        article1 = Article(
            title="Breaking News About Technology",
            content="This is about technology and innovation",
            source="Tech News",
            url="http://test.com/1",
            category="Technology",
            sentiment_label="Positive",
            sentiment_score=0.8
        )
        article2 = Article(
            title="Sports Update",
            content="This is about sports and games",
            source="Sports News",
            url="http://test.com/2",
            category="Sports",
            sentiment_label="Neutral",
            sentiment_score=0.5
        )
        
        db.session.add(article1)
        db.session.add(article2)
        db.session.commit()
        
        # Test search
        response = self.client.get('/api/v1/news/search?q=technology')
        
        assert response.status_code == 200
        data = response.get_json()
        assert 'articles' in data
        assert len(data['articles']) == 1
        assert 'technology' in data['articles'][0]['title'].lower()
    
    def test_get_article_by_id(self):
        """Test getting article by ID."""
        # Create test article
        article = Article(
            title="Test Article",
            content="This is test content",
            source="Test Source",
            url="http://test.com/1",
            category="Test",
            sentiment_label="Positive",
            sentiment_score=0.8
        )
        
        db.session.add(article)
        db.session.commit()
        
        # Test getting article by ID
        response = self.client.get(f'/api/v1/news/{article.id}')
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['title'] == "Test Article"
        assert data['content'] == "This is test content"
    
    def test_get_article_by_id_not_found(self):
        """Test getting non-existent article by ID."""
        response = self.client.get('/api/v1/news/99999')
        
        assert response.status_code == 404
        data = response.get_json()
        assert 'error' in data
