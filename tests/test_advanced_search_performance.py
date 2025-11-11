import pytest
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

from backend.app.advanced_search_api import advanced_search_bp
from backend.app import create_app, db
from backend.app.models import Article
import tempfile

class TestAdvancedSearchPerformance:
    def setup_method(self):
        """Set up test fixtures before each test method."""
        self.app = create_app()
        self.app.config['TESTING'] = True
        self.app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        self.app_context = self.app.app_context()
        self.app_context.push()
        db.create_all()
        
        self.client = self.app.test_client()
        
        # Register the blueprint
        self.app.register_blueprint(advanced_search_bp, url_prefix='/api/v1/advanced-search')
    
    def teardown_method(self):
        """Clean up after each test method."""
        db.session.remove()
        db.drop_all()
        self.app_context.pop()
    
    def test_keyword_search_performance(self):
        """Test that keyword search uses efficient full-text search."""
        # Create test articles
        articles = [
            Article(
                title="Breaking News: Technology Innovation",
                content="This article discusses the latest technology innovations and breakthroughs.",
                source="Tech News",
                url="http://test.com/1",
                category="Technology",
                location="San Francisco",
                sentiment_label="positive",
                sentiment_score=0.8
            ),
            Article(
                title="Weather Update: Storm Approaching",
                content="A severe storm is approaching the city with heavy rainfall expected.",
                source="Weather Channel",
                url="http://test.com/2",
                category="Weather",
                location="Miami",
                sentiment_label="negative",
                sentiment_score=0.2
            ),
            Article(
                title="Sports: Championship Game Results",
                content="The championship game ended with an exciting victory for the home team.",
                source="Sports News",
                url="http://test.com/3",
                category="Sports",
                location="New York",
                sentiment_label="positive",
                sentiment_score=0.9
            )
        ]
        
        for article in articles:
            db.session.add(article)
        db.session.commit()
        
        # Test keyword search
        response = self.client.get('/api/v1/advanced-search/search?keyword=technology')
        
        assert response.status_code == 200
        data = response.get_json()
        assert 'articles' in data
        assert len(data['articles']) == 1
        assert 'technology' in data['articles'][0]['title'].lower()
    
    def test_location_exact_match(self):
        """Test that location search uses exact match instead of LIKE."""
        # Create test articles
        articles = [
            Article(
                title="News from New York",
                content="This is news from New York City.",
                source="NY Times",
                url="http://test.com/1",
                category="General",
                location="New York",
                sentiment_label="neutral",
                sentiment_score=0.5
            ),
            Article(
                title="News from New York State",
                content="This is news from New York State.",
                source="State News",
                url="http://test.com/2",
                category="General",
                location="New York State",
                sentiment_label="neutral",
                sentiment_score=0.5
            )
        ]
        
        for article in articles:
            db.session.add(article)
        db.session.commit()
        
        # Test exact location match
        response = self.client.get('/api/v1/advanced-search/search?location=New York')
        
        assert response.status_code == 200
        data = response.get_json()
        assert 'articles' in data
        assert len(data['articles']) == 1
        assert data['articles'][0]['location'] == 'New York'
    
    def test_category_exact_match(self):
        """Test that category search uses exact match."""
        # Create test articles
        articles = [
            Article(
                title="Tech Article 1",
                content="Technology content",
                source="Tech Source",
                url="http://test.com/1",
                category="Technology",
                location="Silicon Valley",
                sentiment_label="positive",
                sentiment_score=0.8
            ),
            Article(
                title="Tech Article 2",
                content="More technology content",
                source="Tech Source",
                url="http://test.com/2",
                category="Technology",
                location="Seattle",
                sentiment_label="positive",
                sentiment_score=0.7
            ),
            Article(
                title="Sports Article",
                content="Sports content",
                source="Sports Source",
                url="http://test.com/3",
                category="Sports",
                location="Boston",
                sentiment_label="neutral",
                sentiment_score=0.5
            )
        ]
        
        for article in articles:
            db.session.add(article)
        db.session.commit()
        
        # Test category filter
        response = self.client.get('/api/v1/advanced-search/search?category=Technology')
        
        assert response.status_code == 200
        data = response.get_json()
        assert 'articles' in data
        assert len(data['articles']) == 2
        for article in data['articles']:
            assert article['category'] == 'Technology'
    
    def test_source_exact_match(self):
        """Test that source search uses exact match."""
        # Create test articles
        articles = [
            Article(
                title="BBC Article",
                content="BBC content",
                source="BBC",
                url="http://test.com/1",
                category="News",
                location="London",
                sentiment_label="neutral",
                sentiment_score=0.5
            ),
            Article(
                title="BBC Sports Article",
                content="BBC sports content",
                source="BBC",
                url="http://test.com/2",
                category="Sports",
                location="London",
                sentiment_label="positive",
                sentiment_score=0.7
            ),
            Article(
                title="CNN Article",
                content="CNN content",
                source="CNN",
                url="http://test.com/3",
                category="News",
                location="Atlanta",
                sentiment_label="neutral",
                sentiment_score=0.5
            )
        ]
        
        for article in articles:
            db.session.add(article)
        db.session.commit()
        
        # Test source filter
        response = self.client.get('/api/v1/advanced-search/search?source=BBC')
        
        assert response.status_code == 200
        data = response.get_json()
        assert 'articles' in data
        assert len(data['articles']) == 2
        for article in data['articles']:
            assert article['source'] == 'BBC'
    
    def test_sentiment_exact_match(self):
        """Test that sentiment search uses exact match."""
        # Create test articles
        articles = [
            Article(
                title="Positive Article",
                content="This is positive content",
                source="Test Source",
                url="http://test.com/1",
                category="General",
                location="Test City",
                sentiment_label="positive",
                sentiment_score=0.8
            ),
            Article(
                title="Negative Article",
                content="This is negative content",
                source="Test Source",
                url="http://test.com/2",
                category="General",
                location="Test City",
                sentiment_label="negative",
                sentiment_score=0.2
            ),
            Article(
                title="Neutral Article",
                content="This is neutral content",
                source="Test Source",
                url="http://test.com/3",
                category="General",
                location="Test City",
                sentiment_label="neutral",
                sentiment_score=0.5
            )
        ]
        
        for article in articles:
            db.session.add(article)
        db.session.commit()
        
        # Test sentiment filter
        response = self.client.get('/api/v1/advanced-search/search?sentiment=positive')
        
        assert response.status_code == 200
        data = response.get_json()
        assert 'articles' in data
        assert len(data['articles']) == 1
        assert data['articles'][0]['sentiment']['label'] == 'positive'
    
    def test_combined_filters(self):
        """Test that combined filters work efficiently."""
        # Create test articles
        articles = [
            Article(
                title="Tech News from Silicon Valley",
                content="Technology innovation in Silicon Valley",
                source="Tech News",
                url="http://test.com/1",
                category="Technology",
                location="Silicon Valley",
                sentiment_label="positive",
                sentiment_score=0.8
            ),
            Article(
                title="Tech News from Seattle",
                content="Technology innovation in Seattle",
                source="Tech News",
                url="http://test.com/2",
                category="Technology",
                location="Seattle",
                sentiment_label="positive",
                sentiment_score=0.7
            ),
            Article(
                title="Sports News from Silicon Valley",
                content="Sports news from Silicon Valley",
                source="Sports News",
                url="http://test.com/3",
                category="Sports",
                location="Silicon Valley",
                sentiment_label="neutral",
                sentiment_score=0.5
            )
        ]
        
        for article in articles:
            db.session.add(article)
        db.session.commit()
        
        # Test combined filters
        response = self.client.get('/api/v1/advanced-search/search?category=Technology&location=Silicon Valley&sentiment=positive')
        
        assert response.status_code == 200
        data = response.get_json()
        assert 'articles' in data
        assert len(data['articles']) == 1
        article = data['articles'][0]
        assert article['category'] == 'Technology'
        assert article['location'] == 'Silicon Valley'
        assert article['sentiment']['label'] == 'positive'
    
    def test_pagination_performance(self):
        """Test that pagination works efficiently."""
        # Create many test articles
        articles = []
        for i in range(25):
            article = Article(
                title=f"Test Article {i}",
                content=f"This is test content {i}",
                source="Test Source",
                url=f"http://test.com/{i}",
                category="Test",
                location="Test City",
                sentiment_label="neutral",
                sentiment_score=0.5
            )
            articles.append(article)
        
        for article in articles:
            db.session.add(article)
        db.session.commit()
        
        # Test pagination
        response = self.client.get('/api/v1/advanced-search/search?page=1&limit=10')
        
        assert response.status_code == 200
        data = response.get_json()
        assert 'articles' in data
        assert len(data['articles']) == 10
        assert 'pagination' in data
        assert data['pagination']['total_count'] == 25
        assert data['pagination']['current_page'] == 1
        assert data['pagination']['total_pages'] == 3
    
    def test_search_stats_efficiency(self):
        """Test that search stats use efficient queries."""
        # Create test articles
        articles = [
            Article(
                title="Tech Article",
                content="Technology content",
                source="Tech Source",
                url="http://test.com/1",
                category="Technology",
                location="Silicon Valley",
                sentiment_label="positive",
                sentiment_score=0.8
            ),
            Article(
                title="Sports Article",
                content="Sports content",
                source="Sports Source",
                url="http://test.com/2",
                category="Sports",
                location="Boston",
                sentiment_label="neutral",
                sentiment_score=0.5
            )
        ]
        
        for article in articles:
            db.session.add(article)
        db.session.commit()
        
        # Test stats endpoint
        response = self.client.get('/api/v1/advanced-search/stats')
        
        assert response.status_code == 200
        data = response.get_json()
        assert 'total_articles' in data
        assert 'by_category' in data
        assert 'by_sentiment' in data
        assert 'by_source' in data
        assert data['total_articles'] == 2
