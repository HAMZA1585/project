import logging
import sys

logger = logging.getLogger(__name__)

# CRITICAL: Sentiment analysis is a core dependency
# If the model fails to load, the application MUST fail
# No silent fallbacks that produce garbage data

sentiment_model = None

def initialize_sentiment_model():
    """Initialize the sentiment analysis model. FAILS LOUDLY if unable to load."""
    global sentiment_model
    
    try:
        from transformers import pipeline
        logger.info("Loading Hugging Face sentiment analysis model...")
        
        sentiment_model = pipeline(
            "sentiment-analysis",
            model="cardiffnlp/twitter-roberta-base-sentiment-latest"
        )
        
        logger.info("Sentiment analysis model loaded successfully")
        return True
        
    except ImportError as e:
        logger.critical("❌ CRITICAL ERROR: transformers library not available")
        logger.critical(f"Import error: {str(e)}")
        logger.critical("Install with: pip install transformers torch")
        raise RuntimeError("Sentiment analysis model failed to load - transformers library missing")
        
    except Exception as e:
        logger.critical("❌ CRITICAL ERROR: Failed to load sentiment analysis model")
        logger.critical(f"Model loading error: {str(e)}")
        logger.critical("This is a core dependency. The application cannot function without it.")
        raise RuntimeError(f"Sentiment analysis model failed to load: {str(e)}")

def analyze_sentiment(text: str):
    """
    Analyze sentiment of text using Hugging Face model.
    
    CRITICAL: This function will FAIL LOUDLY if the model is not available.
    No silent fallbacks that produce unreliable data.
    
    Args:
        text: Text to analyze
        
    Returns:
        dict: {"score": float, "label": "positive|neutral|negative"}
        
    Raises:
        RuntimeError: If sentiment model is not available
    """
    if sentiment_model is None:
        logger.critical("❌ CRITICAL ERROR: Sentiment model not initialized")
        raise RuntimeError("Sentiment analysis model not available - application cannot function")
    
    if not isinstance(text, str) or not text.strip():
        logger.warning("Empty or invalid text provided for sentiment analysis")
        return {"score": 0.0, "label": "neutral"}
    
    try:
        result = sentiment_model(text)[0]
        raw_label = str(result.get('label', ''))
        score = float(result.get('score', 0.0))

        label_map = {
            'LABEL_0': 'negative',
            'LABEL_1': 'neutral',
            'LABEL_2': 'positive',
            'NEGATIVE': 'negative',
            'NEUTRAL': 'neutral',
            'POSITIVE': 'positive'
        }
        normalized = label_map.get(raw_label, raw_label.lower())
        
        logger.debug(f"Sentiment analysis completed: {normalized} (score: {score})")
        return {"score": round(score, 3), "label": normalized}
        
    except Exception as e:
        logger.critical(f"❌ CRITICAL ERROR: Sentiment analysis failed: {str(e)}")
        raise RuntimeError(f"Sentiment analysis failed: {str(e)}")

def add_sentiments_to_news(news_data):
    """Add sentiment analysis to news data. FAILS LOUDLY if model unavailable."""
    if sentiment_model is None:
        logger.critical("❌ CRITICAL ERROR: Cannot add sentiments - model not available")
        raise RuntimeError("Sentiment analysis model not available")
    
    for source, articles in (news_data or {}).items():
        for article in articles:
            content = article.get("content", "")
            try:
                article["sentiment"] = analyze_sentiment(content)
            except Exception as e:
                logger.critical(f"❌ CRITICAL ERROR: Failed to analyze sentiment for article: {str(e)}")
                raise RuntimeError(f"Sentiment analysis failed for article: {str(e)}")
    
    return news_data

# Initialize the model on import - FAIL LOUDLY if it doesn't work
try:
    initialize_sentiment_model()
except Exception as e:
    logger.critical("❌ CRITICAL ERROR: Application startup failed - sentiment model unavailable")
    logger.critical("The application cannot start without a working sentiment analysis model")
    logger.critical("Fix the model loading issue and restart the application")
    sys.exit(1)

if __name__ == "__main__":
    from scraper import get_news_from_sources

    raw_news = get_news_from_sources()
    enriched_news = add_sentiments_to_news(raw_news)

    import json
    logger.debug(json.dumps(enriched_news, indent=2))
