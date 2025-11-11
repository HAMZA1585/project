import pytest
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

from backend.app.tasks import queue_news_scraping_task, queue_sentiment_analysis_task, queue_trend_analysis_task
from backend.app import create_app
import tempfile

class TestBackgroundTasks:
    def setup_method(self):
        """Set up test fixtures before each test method."""
        self.app = create_app()
        self.app.config['TESTING'] = True
        self.app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        self.app_context = self.app.app_context()
        self.app_context.push()
    
    def teardown_method(self):
        """Clean up after each test method."""
        self.app_context.pop()
    
    def test_queue_news_scraping_task(self):
        """Test queuing news scraping task."""
        with self.app.app_context():
            # Test basic task queuing
            result = queue_news_scraping_task()
            assert result is not None
    
    def test_queue_sentiment_analysis_task(self):
        """Test queuing sentiment analysis task."""
        with self.app.app_context():
            # Test basic task queuing
            result = queue_sentiment_analysis_task()
            assert result is not None
    
    def test_queue_trend_analysis_task(self):
        """Test queuing trend analysis task."""
        with self.app.app_context():
            # Test basic task queuing
            result = queue_trend_analysis_task()
            assert result is not None
    
    def test_task_queue_integration(self):
        """Test integration of multiple task queues."""
        with self.app.app_context():
            # Queue multiple tasks
            scraping_result = queue_news_scraping_task()
            sentiment_result = queue_sentiment_analysis_task()
            trend_result = queue_trend_analysis_task()
            
            # All should succeed
            assert scraping_result is not None
            assert sentiment_result is not None
            assert trend_result is not None
