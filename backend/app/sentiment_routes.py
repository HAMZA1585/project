from flask import Blueprint, request, jsonify
from .services.sentiment import add_sentiments_to_news, analyze_sentiment

sentiment_bp = Blueprint('sentiment_bp', __name__, url_prefix='/api/sentiment')

@sentiment_bp.route('/', methods=['GET', 'POST'])
def analyze_sentiment_endpoint():
    """
    GET: Return sentiment analysis status
    POST: Expects JSON of the form:
    {
        "news_data": {
            "BBC": [
                {"title": "Some headline", "content": "Some article content"},
                ...
            ],
            "CNN": [
                {"title": "Another headline", "content": "Another article content"},
                ...
            ]
        }
    }
    """
    if request.method == 'GET':
        return jsonify({
            "message": "Sentiment analysis service is running",
            "status": "active"
        }), 200
    
    # POST method
    data = request.get_json()
    if not data or 'news_data' not in data:
        return jsonify({"error": "'news_data' field is required"}), 400

    news_data = data['news_data']

    try:
        enriched_news = add_sentiments_to_news(news_data)
        return jsonify(enriched_news), 200
    except Exception as e:
        return jsonify({"error": f"Error processing sentiment: {str(e)}"}), 500

@sentiment_bp.route('/analyze', methods=['POST'])
def analyze_single_text():
    """
    Analyze sentiment of a single text
    Expects JSON: {"text": "Your text here"}
    """
    data = request.get_json()
    if not data or 'text' not in data:
        return jsonify({"error": "'text' field is required"}), 400
    
    try:
        result = analyze_sentiment(data['text'])
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": f"Error analyzing sentiment: {str(e)}"}), 500
