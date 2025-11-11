from flask import Blueprint, jsonify
from .services.trend import analyze_news_trends  # Corrected to relative import

# Define the blueprint for trend analysis with /api/trends prefix
trend_analysis = Blueprint('trend_analysis', __name__, url_prefix='/api/trends')

@trend_analysis.route('/generate', methods=['GET'])
def generate_trend():
    # Example data simulating scraped headlines
    news_data = {
        "BBC": [
            "Bitcoin price hits new high",
            "Crypto market boom",
            "Blockchain adoption grows"
        ],
        "CNN": [
            "Stock market hits record high",
            "Tech stocks surge",
            "Investment in AI rises"
        ]
    }

    # Use the imported service to analyze trends
    trend_data = analyze_news_trends(news_data)
    return jsonify(trend_data)

# Lightweight wrapper used by templates/routes to analyze a list of article dicts
def analyze_trends(articles):
    try:
        titles = [a.get('title') for a in articles if isinstance(a, dict) and a.get('title')]
        news_map = {"BBC": titles}
        return analyze_news_trends(news_map)
    except Exception:
        return {"BBC": []}