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
from .tasks import infer_location_from_text
from .services.scraper import (
    fetch_from_dawn,
    fetch_from_daily_express,
    fetch_from_nation,
    fetch_from_pakistan_times,
    fetch_from_pakistan_observer,
    fetch_from_urdu_point,
)
from .services.sentiment import analyze_sentiment
from .tasks import human_like_local_scrape_task
from flask import current_app
import threading
from datetime import datetime
from .models import ScrapeJob
from .tasks import update_dawn_missing_dates

# Create blueprint for advanced search
advanced_search_bp = Blueprint('advanced_search_api', __name__)

# Curated category taxonomy for UI and fallback search
DEFAULT_CATEGORIES = [
    'Crime', 'Sports', 'Health', 'Politics', 'Business', 'Technology',
    'Entertainment', 'Education', 'Environment', 'Weather', 'Accident', 'Science', 'General'
]

# Simple keyword expansions used when category is selected without a keyword
CATEGORY_KEYWORDS = {
    'Crime': ['crime', 'police', 'murder', 'theft', 'investigation'],
    'Sports': ['sport', 'sports', 'cricket', 'football', 'match', 'tournament'],
    'Health': ['health', 'hospital', 'medicine', 'patient', 'disease'],
    'Politics': ['politics', 'government', 'minister', 'parliament', 'election'],
    'Business': ['business', 'economy', 'market', 'trade', 'finance'],
    'Technology': ['technology', 'tech', 'software', 'ai', 'startup'],
    'Entertainment': ['entertainment', 'film', 'movie', 'music', 'celebrity'],
    'Education': ['education', 'school', 'university', 'exam', 'student'],
    'Environment': ['environment', 'climate', 'pollution', 'wildlife'],
    'Weather': ['weather', 'storm', 'rain', 'flood', 'heatwave'],
    'Accident': ['accident', 'collision', 'crash'],
    'Science': ['science', 'research', 'study'],
    'General': ['news']
}

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
        # Support repeated params (?location=a&location=b) and comma-separated lists
        location_list = request.args.getlist('location')
        category_list = request.args.getlist('category')
        source_list = request.args.getlist('source')
        location_param = request.args.get('location', '').strip()
        category_param = request.args.get('category', '').strip()
        source_param = request.args.get('source', '').strip()
        sentiment_list = request.args.getlist('sentiment')
        sentiment_param = request.args.get('sentiment', '').strip()
        limit = min(int(request.args.get('limit', 50)), 100)  # Max 100 results
        page = max(int(request.args.get('page', 1)), 1)
        
        # Start with base query
        query = Article.query
        
        # Apply filters using efficient methods
        filters = []
        
        # If category provided but keyword empty, expand category into a keyword query
        if not keyword and (category_param or category_list):
            cats = [v.strip() for v in (category_list if category_list else category_param.split(',')) if v.strip()]
            expanded = []
            for c in cats:
                # Normalize to Title Case for mapping
                key = c.strip().title()
                expanded += CATEGORY_KEYWORDS.get(key, [])
            if expanded:
                keyword = ' OR '.join(sorted(set(expanded)))

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
        
        # Exact match for location; support multi-value (comma-separated) lists
        if location_param or location_list:
            locations = [v.strip() for v in (location_list if location_list else location_param.split(',')) if v.strip()]
            if len(locations) == 1:
                filters.append(Article.location == locations[0])
            elif locations:
                filters.append(Article.location.in_(locations))
        
        # Exact match for category; support multi-value lists
        if category_param or category_list:
            categories = [v.strip() for v in (category_list if category_list else category_param.split(',')) if v.strip()]
            if len(categories) == 1:
                filters.append(Article.category == categories[0])
            elif categories:
                filters.append(Article.category.in_(categories))
        
        # Exact match for source; support multi-value lists
        if source_param or source_list:
            sources = [v.strip() for v in (source_list if source_list else source_param.split(',')) if v.strip()]
            if len(sources) == 1:
                filters.append(Article.source == sources[0])
            elif sources:
                filters.append(Article.source.in_(sources))
        
        # Exact match for sentiment; support multi-value lists
        if sentiment_param or sentiment_list:
            sentiments = [v.strip().lower() for v in (sentiment_list if sentiment_list else sentiment_param.split(',')) if v.strip()]
            if len(sentiments) == 1:
                filters.append(Article.sentiment_label == sentiments[0])
            elif sentiments:
                filters.append(Article.sentiment_label.in_(sentiments))
        
        # Apply all filters
        if filters:
            query = query.filter(and_(*filters))
            # Bind parameters for any textual filters (e.g., FTS5 MATCH :keyword)
            if keyword:
                query = query.params(keyword=keyword)
        
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
                'location': location_param,
                'category': category_param,
                'source': source_param,
                'sentiment': sentiment_param or ','.join(sentiment_list)
            }
        }
        
        return jsonify(response)
        
    except Exception as e:
        return jsonify({'error': f'Search failed: {str(e)}'}), 500

@advanced_search_bp.route('/scrape-pakistan', methods=['POST'])
def scrape_pakistan_local():
    try:
        payload = request.get_json() or {}
        limit = int(payload.get('limit', 8))
        limit = max(1, min(limit, 20))
        sources = [
            ('DAWN', fetch_from_dawn),
        ]

        added = 0
        found = 0
        processed_sources = []
        for name, func in sources:
            articles = []
            try:
                articles = func(limit=limit)
            except Exception:
                articles = []
            found += len(articles)
            added_for_source = 0
            for a in articles:
                url = a.get('url')
                if not url:
                    continue
                from .services.scraper import canonicalize_url
                canon = canonicalize_url(url)
                existing = Article.query.filter_by(url=canon).first()
                if existing:
                    continue
                date_val = None
                if a.get('date'):
                    try:
                        from datetime import datetime
                        date_val = datetime.fromisoformat(a.get('date').replace('Z', '+00:00'))
                    except Exception:
                        date_val = None
                text_to_analyze = a.get('content') or a.get('title') or ''
                sent = analyze_sentiment(text_to_analyze) if text_to_analyze else {'label': None, 'score': None}
                loc = a.get('location') or infer_location_from_text(a.get('title'), a.get('content'))
                article = Article(
                    title=a.get('title') or '',
                    url=canon,
                    source=a.get('source') or name,
                    content=a.get('content'),
                    category=a.get('category'),
                    date=date_val,
                    location=loc,
                    sentiment_label=(sent.get('label').capitalize() if sent.get('label') else None),
                    sentiment_score=sent.get('score')
                )
                try:
                    db.session.add(article)
                    db.session.commit()
                    added_for_source += 1
                except Exception:
                    db.session.rollback()
                    continue
            added += added_for_source
            processed_sources.append({'source': name, 'added': added_for_source})
        return jsonify({'status': 'completed', 'found': found, 'added': added, 'sources': processed_sources})
    except Exception as e:
        return jsonify({'error': f'Pakistan scrape failed: {str(e)}'}), 500

@advanced_search_bp.route('/scrape-pakistan-agent', methods=['POST'])
def scrape_pakistan_local_agent():
    try:
        payload = request.get_json() or {}
        limit = int(payload.get('limit', 8))
        job = ScrapeJob(status='queued')
        db.session.add(job)
        db.session.commit()
        app = current_app._get_current_object()
        def _run(job_id, lim):
            with app.app_context():
                j = ScrapeJob.query.get(job_id)
                if not j:
                    return
                j.status = 'running'
                j.started_at = datetime.now()
                db.session.commit()
                sources = [
                    ('DAWN', fetch_from_dawn),
                ]
                added = 0
                found = 0
                processed_sources = []
                for name, func in sources:
                    articles = []
                    try:
                        articles = func(limit=lim)
                    except Exception:
                        articles = []
                    found += len(articles)
                    added_for_source = 0
                    for a in articles:
                        url = a.get('url')
                        if not url:
                            continue
                        existing = Article.query.filter_by(url=url).first()
                        if existing:
                            continue
                        date_val = None
                        if a.get('date'):
                            try:
                                date_val = datetime.fromisoformat(a.get('date').replace('Z', '+00:00'))
                            except Exception:
                                date_val = None
                        text_to_analyze = a.get('content') or a.get('title') or ''
                        sent = analyze_sentiment(text_to_analyze) if text_to_analyze else {'label': None, 'score': None}
                        loc = a.get('location') or infer_location_from_text(a.get('title'), a.get('content'))
                        article = Article(
                            title=a.get('title') or '',
                            url=url,
                            source=a.get('source') or name,
                            content=a.get('content'),
                            category=a.get('category'),
                            date=date_val,
                            location=loc,
                            sentiment_label=(sent.get('label').capitalize() if sent.get('label') else None),
                            sentiment_score=sent.get('score')
                        )
                        try:
                            db.session.add(article)
                            db.session.commit()
                            added_for_source += 1
                        except Exception:
                            db.session.rollback()
                            continue
                    added += added_for_source
                    processed_sources.append({'source': name, 'added': added_for_source})
                j.status = 'completed'
                j.finished_at = datetime.now()
                j.found = found
                j.added = added
                j.sources = processed_sources
                db.session.commit()
        t = threading.Thread(target=_run, args=(job.id, limit), daemon=True)
        t.start()
        return jsonify({'status': 'queued', 'job_id': job.id, 'mode': 'sql'})
    except Exception as e:
        return jsonify({'error': f'Agent queue failed: {str(e)}'}), 500

@advanced_search_bp.route('/scrape-pakistan-agent/<int:job_id>', methods=['GET'])
def scrape_pakistan_local_agent_status(job_id):
    j = ScrapeJob.query.get(job_id)
    if not j:
        return jsonify({'error': 'Not found'}), 404
    return jsonify({
        'job_id': j.id,
        'status': j.status,
        'found': j.found,
        'added': j.added,
        'sources': j.sources,
        'queued_at': j.queued_at.isoformat() if j.queued_at else None,
        'started_at': j.started_at.isoformat() if j.started_at else None,
        'finished_at': j.finished_at.isoformat() if j.finished_at else None,
    })

@advanced_search_bp.route('/fix-dawn-dates', methods=['POST'])
def fix_dawn_dates():
    try:
        payload = request.get_json() or {}
        max_rows = int(payload.get('max_rows', 50))
        res = update_dawn_missing_dates(max_rows)
        return jsonify(res)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

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
    """Get list of available categories for filtering"""
    try:
        # Present a clean, curated taxonomy only
        merged = sorted(set(DEFAULT_CATEGORIES))
        return jsonify({
            'categories': merged,
            'count': len(merged)
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