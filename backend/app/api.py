from flask import Blueprint, jsonify
from .models import Article, Trend # Import Trend model
from sqlalchemy import desc

api_bp = Blueprint('api', __name__)

@api_bp.route('/news', methods=['GET'])
def get_articles():
    try:
        latest_articles = Article.query.order_by(desc(Article.date)).limit(100).all()
        latest_trends = Trend.query.order_by(desc(Trend.score)).limit(10).all()

        if not latest_articles:
            return jsonify({'message': 'No articles found in the database', 'articles': [], 'trends': []}), 404

        articles_list = [
            {
                "id": article.id,
                "title": article.title,
                "url": article.url,
                "source": article.source,
                "content": article.content,
                "category": article.category,
                "date": article.date.isoformat() if article.date else None,
                "sentiment": {
                    "label": article.sentiment_label,
                    "score": article.sentiment_score
                }
            } for article in latest_articles
        ]
        
        trends_list = [
            {
                "keyword": trend.keyword,
                "score": trend.score
            } for trend in latest_trends
        ]
        
        response = {
            'articles': articles_list,
            'trends': trends_list
        }
        
        return jsonify(response)

    except Exception as e:
        return jsonify({'error': str(e)}), 500