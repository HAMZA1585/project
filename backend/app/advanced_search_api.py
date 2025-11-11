#!/usr/bin/env python3
"""
Advanced Search API for News Monitoring Desk
Provides efficient keyword and location-based search functionality using SQLite FTS5
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import or_, and_, desc, func, text
from .models import Article
from . import db

# Create blueprint for advanced search
advanced_search_bp = Blueprint('advanced_search_api', __name__)

@advanced_search_bp.route('/search', methods=['GET'])
def advanced_search():
    """
    Advanced search endpoint with efficient full-text search using SQLite FTS5
    
    Query Parameters:
    - keyword: Search term (e.g., "crime", "storm", "technology")
    - location: City name (e.g., "Islamabad", "Lahore", "Karachi")
    - category: Article category filter
    - source: News source filter
    - sentiment: Sentiment filter (positive, negative, neutral)
    - limit: Number of results to return (default: 50)
    - page: Page number for pagination (default: 1)
    """
    try:
        # Get query parameters
        keyword = request.args.get('keyword', '').strip()
        location = request.args.get('location', '').strip()
        category = request.args.get('category', '').strip()
        source = request.args.get('source', '').strip()
        sentiment = request.args.get('sentiment', '').strip()
        limit = min(int(request.args.get('limit', 50)), 100)  # Max 100 results
        page = max(int(request.args.get('page', 1)), 1)
        
        # Start with base query
        query = Article.query
        
        # Apply filters using efficient methods
        filters = []
        
        # Full-text search for keywords using SQLite FTS5
        if keyword:
            # Use SQLite FTS5 for efficient text searching
            # FTS5 provides much better performance than LIKE queries
            keyword_filter = text("""
                articles.id IN (
                    SELECT rowid FROM articles_fts 
                    WHERE articles_fts MATCH :keyword
                )
            """)
            filters.append(keyword_filter)
        
        # Exact match for location (much more efficient than LIKE)
        if location:
            location_filter = Article.location == location
            filters.append(location_filter)
        
        # Exact match for category
        if category:
            category_filter = Article.category == category
            filters.append(category_filter)
        
        # Exact match for source
        if source:
            source_filter = Article.source == source
            filters.append(source_filter)
        
        # Exact match for sentiment
        if sentiment:
            sentiment_filter = Article.sentiment_label == sentiment.lower()
            filters.append(sentiment_filter)
        
        # Apply all filters
        if filters:
            query = query.filter(and_(*filters))
        
        # Order by date (newest first) with index support
        query = query.order_by(desc(Article.date))
        
        # Apply pagination
        offset = (page - 1) * limit
        articles = query.offset(offset).limit(limit).all()
        
        # Get total count for pagination info (efficient count)
        total_count = query.count()
        
        # Format response
        articles_list = []
        for article in articles:
            articles_list.append({
                'id': article.id,
                'title': article.title,
                'url': article.url,
                'source': article.source,
                'content': article.content,
                'category': article.category,
                'location': article.location,
                'date': article.date.isoformat() if article.date else None,
                'sentiment': {
                    'label': article.sentiment_label,
                    'score': article.sentiment_score
                }
            })
        
        # Pagination info
        total_pages = (total_count + limit - 1) // limit
        has_next = page < total_pages
        has_prev = page > 1
        
        response = {
            'articles': articles_list,
            'pagination': {
                'current_page': page,
                'total_pages': total_pages,
                'total_count': total_count,
                'limit': limit,
                'has_next': has_next,
                'has_prev': has_prev
            },
            'filters_applied': {
                'keyword': keyword,
                'location': location,
                'category': category,
                'source': source,
                'sentiment': sentiment
            }
        }
        
        return jsonify(response)
        
    except Exception as e:
        return jsonify({'error': f'Search failed: {str(e)}'}), 500

@advanced_search_bp.route('/locations', methods=['GET'])
def get_locations():
    """Get list of available locations"""
    try:
        # Get unique locations from database
        locations = db.session.query(Article.location).filter(
            Article.location.isnot(None)
        ).distinct().all()
        
        location_list = [loc[0] for loc in locations if loc[0]]
        location_list.sort()
        
        return jsonify({
            'locations': location_list,
            'count': len(location_list)
        })
        
    except Exception as e:
        return jsonify({'error': f'Failed to get locations: {str(e)}'}), 500

@advanced_search_bp.route('/categories', methods=['GET'])
def get_categories():
    """Get list of available categories"""
    try:
        # Get unique categories from database
        categories = db.session.query(Article.category).filter(
            Article.category.isnot(None)
        ).distinct().all()
        
        category_list = [cat[0] for cat in categories if cat[0]]
        category_list.sort()
        
        return jsonify({
            'categories': category_list,
            'count': len(category_list)
        })
        
    except Exception as e:
        return jsonify({'error': f'Failed to get categories: {str(e)}'}), 500

@advanced_search_bp.route('/sources', methods=['GET'])
def get_sources():
    """Get list of available sources"""
    try:
        # Get unique sources from database
        sources = db.session.query(Article.source).distinct().all()
        
        source_list = [src[0] for src in sources if src[0]]
        source_list.sort()
        
        return jsonify({
            'sources': source_list,
            'count': len(source_list)
        })
        
    except Exception as e:
        return jsonify({'error': f'Failed to get sources: {str(e)}'}), 500

@advanced_search_bp.route('/stats', methods=['GET'])
def get_search_stats():
    """Get search statistics with efficient queries"""
    try:
        # Get location parameter for location-specific stats
        location = request.args.get('location', '').strip()
        
        # Base query with efficient filtering
        base_query = Article.query
        if location:
            base_query = base_query.filter(Article.location == location)  # Exact match instead of LIKE
        
        # Get counts by category (efficient aggregation)
        categories = db.session.query(
            Article.category,
            func.count(Article.id).label('count')
        ).filter(Article.category.isnot(None))
        
        if location:
            categories = categories.filter(Article.location == location)
            
        categories = categories.group_by(Article.category).all()
        
        # Get counts by sentiment (efficient aggregation)
        sentiments = db.session.query(
            Article.sentiment_label,
            func.count(Article.id).label('count')
        ).filter(Article.sentiment_label.isnot(None))
        
        if location:
            sentiments = sentiments.filter(Article.location == location)
            
        sentiments = sentiments.group_by(Article.sentiment_label).all()
        
        # Get counts by source (efficient aggregation)
        sources = db.session.query(
            Article.source,
            func.count(Article.id).label('count')
        ).filter(Article.source.isnot(None))
        
        if location:
            sources = sources.filter(Article.location == location)
            
        sources = sources.group_by(Article.source).all()
        
        # Get total count efficiently
        total_count = base_query.count()
        
        stats = {
            'total_articles': total_count,
            'by_category': [{'category': cat[0], 'count': cat[1]} for cat in categories],
            'by_sentiment': [{'sentiment': sent[0], 'count': sent[1]} for sent in sentiments],
            'by_source': [{'source': src[0], 'count': src[1]} for src in sources],
            'location_filter': location
        }
        
        return jsonify(stats)
        
    except Exception as e:
        return jsonify({'error': f'Failed to get stats: {str(e)}'}), 500

@advanced_search_bp.route('/saved-queries', methods=['GET', 'POST'])
def saved_queries():
    from flask_jwt_extended import jwt_required, get_jwt_identity
    from .models import SavedQuery

    if request.method == 'GET':
        # Optional auth; if JWT present, filter by user
        try:
            user_id = get_jwt_identity()
        except Exception:
            user_id = None
        q = SavedQuery.query
        if user_id:
            q = q.filter(SavedQuery.user_id == int(user_id))
        items = q.order_by(SavedQuery.created_at.desc()).all()
        return jsonify({
            'saved_queries': [
                {
                    'id': it.id,
                    'name': it.name,
                    'description': it.description,
                    'query': it.query,
                    'filters': it.filters,
                    'created_at': it.created_at.isoformat() if it.created_at else None
                } for it in items
            ]
        })

    # POST (requires auth)
    from flask_jwt_extended import jwt_required, get_jwt_identity
    @jwt_required()
    def _create():
        user_id = int(get_jwt_identity())
        payload = request.get_json() or {}
        name = payload.get('name')
        query_str = payload.get('query')
        if not name or not query_str:
            return jsonify({'error': 'name and query are required'}), 400
        sq = SavedQuery(
            user_id=user_id,
            name=name,
            description=payload.get('description'),
            query=query_str,
            filters=payload.get('filters')
        )
        db.session.add(sq)
        db.session.commit()
        return jsonify({'message': 'Saved query created', 'id': sq.id}), 201
    return _create()

@advanced_search_bp.route('/saved-queries/<int:query_id>', methods=['DELETE'])
@jwt_required()
def delete_saved_query(query_id):
    from .models import SavedQuery
    user_id = int(get_jwt_identity())
    sq = SavedQuery.query.get(query_id)
    if not sq or sq.user_id != user_id:
        return jsonify({'error': 'Not found'}), 404
    db.session.delete(sq)
    db.session.commit()
    return jsonify({'message': 'Saved query deleted'}), 200

@advanced_search_bp.route('/alerts', methods=['GET', 'POST'])
def search_alerts():
    from flask_jwt_extended import jwt_required, get_jwt_identity
    from .models import SearchAlert

    if request.method == 'GET':
        try:
            user_id = get_jwt_identity()
        except Exception:
            user_id = None
        q = SearchAlert.query
        if user_id:
            q = q.filter(SearchAlert.user_id == int(user_id))
        items = q.order_by(SearchAlert.created_at.desc()).all()
        return jsonify({
            'alerts': [
                {
                    'id': it.id,
                    'name': it.name,
                    'query': it.query,
                    'filters': it.filters,
                    'frequency': it.frequency,
                    'is_active': it.is_active,
                    'last_triggered_at': it.last_triggered_at.isoformat() if it.last_triggered_at else None,
                    'created_at': it.created_at.isoformat() if it.created_at else None
                } for it in items
            ]
        })

    @jwt_required()
    def _create():
        user_id = int(get_jwt_identity())
        payload = request.get_json() or {}
        name = payload.get('name')
        query_str = payload.get('query')
        if not name or not query_str:
            return jsonify({'error': 'name and query are required'}), 400
        from .models import SearchAlert
        alert = SearchAlert(
            user_id=user_id,
            name=name,
            query=query_str,
            filters=payload.get('filters'),
            frequency=payload.get('frequency', 'daily'),
            is_active=bool(payload.get('is_active', True))
        )
        db.session.add(alert)
        db.session.commit()
        return jsonify({'message': 'Alert created', 'id': alert.id}), 201
    return _create()

@advanced_search_bp.route('/alerts/<int:alert_id>', methods=['DELETE', 'PATCH'])
@jwt_required()
def update_or_delete_alert(alert_id):
    from .models import SearchAlert
    user_id = int(get_jwt_identity())
    alert = SearchAlert.query.get(alert_id)
    if not alert or alert.user_id != user_id:
        return jsonify({'error': 'Not found'}), 404
    if request.method == 'DELETE':
        db.session.delete(alert)
        db.session.commit()
        return jsonify({'message': 'Alert deleted'}), 200
    # PATCH toggle/update fields
    payload = request.get_json() or {}
    if 'is_active' in payload:
        alert.is_active = bool(payload['is_active'])
    if 'frequency' in payload:
        alert.frequency = payload['frequency']
    db.session.commit()
    return jsonify({'message': 'Alert updated'}), 200