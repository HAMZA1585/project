import pytest
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

from backend.app.services.sentiment import SentimentAnalyzer
import numpy as np

class TestSentimentAnalyzer:
    def setup_method(self):
        """Set up test fixtures before each test method."""
        self.analyzer = SentimentAnalyzer()
    
    def test_positive_sentiment(self):
        """Test positive sentiment detection."""
        text = "This is amazing! I love it so much!"
        result = self.analyzer.analyze(text)
        
        assert result['label'] == 'Positive'
        assert result['score'] > 0.5
        assert result['confidence'] > 0.7
    
    def test_negative_sentiment(self):
        """Test negative sentiment detection."""
        text = "This is terrible! I hate it so much!"
        result = self.analyzer.analyze(text)
        
        assert result['label'] == 'Negative'
        assert result['score'] < 0.5
        assert result['confidence'] > 0.7
    
    def test_neutral_sentiment(self):
        """Test neutral sentiment detection."""
        text = "The weather is okay today."
        result = self.analyzer.analyze(text)
        
        assert result['label'] == 'Neutral'
        assert 0.3 <= result['score'] <= 0.7
        assert result['confidence'] > 0.5
    
    def test_empty_text(self):
        """Test handling of empty text."""
        result = self.analyzer.analyze("")
        
        assert result['label'] == 'Neutral'
        assert result['score'] == 0.5
        assert result['confidence'] == 0.0
    
    def test_none_text(self):
        """Test handling of None text."""
        result = self.analyzer.analyze(None)
        
        assert result['label'] == 'Neutral'
        assert result['score'] == 0.5
        assert result['confidence'] == 0.0
    
    def test_long_text(self):
        """Test handling of very long text."""
        long_text = "This is a very long text. " * 1000
        result = self.analyzer.analyze(long_text)
        
        assert result['label'] in ['Positive', 'Negative', 'Neutral']
        assert 0.0 <= result['score'] <= 1.0
        assert result['confidence'] >= 0.0
    
    def test_special_characters(self):
        """Test handling of special characters."""
        text = "This is @#$%^&*() amazing!!!"
        result = self.analyzer.analyze(text)
        
        assert result['label'] in ['Positive', 'Negative', 'Neutral']
        assert 0.0 <= result['score'] <= 1.0
    
    def test_multilingual_text(self):
        """Test handling of multilingual text."""
        text = "This is amazing! ¡Esto es increíble! C'est incroyable!"
        result = self.analyzer.analyze(text)
        
        assert result['label'] in ['Positive', 'Negative', 'Neutral']
        assert 0.0 <= result['score'] <= 1.0
    
    def test_batch_analysis(self):
        """Test batch sentiment analysis."""
        texts = [
            "I love this!",
            "This is terrible.",
            "The weather is okay."
        ]
        results = self.analyzer.analyze_batch(texts)
        
        assert len(results) == 3
        assert results[0]['label'] == 'Positive'
        assert results[1]['label'] == 'Negative'
        assert results[2]['label'] == 'Neutral'
    
    def test_confidence_threshold(self):
        """Test confidence threshold functionality."""
        text = "This is somewhat okay."
        result = self.analyzer.analyze(text, confidence_threshold=0.8)
        
        assert result['confidence'] >= 0.0
        if result['confidence'] < 0.8:
            assert result['label'] == 'Neutral'
