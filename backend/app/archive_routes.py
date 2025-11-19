from flask import Blueprint, jsonify, request
from datetime import datetime, timedelta
from sqlalchemy import desc, and_, func, or_
from .models import Article, Trend
from . import db
from .tasks import upsert_articles_task
from .services.scraper import fetch_from_newsapi_window, fetch_from_guardian_window

archive_bp = Blueprint('archive', __name__)

@archive_bp.route('/archive/range', methods=['GET'])
def get_articles_by_date_range():
    """Get articles within a specific date range"""
    try:
        # Get query parameters
        start_date_str = request.args.get('start_date')
        end_date_str = request.args.get('end_date')
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 50))
        source = request.args.get('source')
        category = request.args.get('category')
        sentiment = request.args.get('sentiment')
        location = request.args.get('location')
        
        # Parse dates
        start_date = None
        end_date = None
        
        if start_date_str:
            try:
                start_date = datetime.fromisoformat(start_date_str)
            except ValueError:
                return jsonify({'error': 'Invalid start_date format. Use YYYY-MM-DD'}), 400
        
        if end_date_str:
            try:
                end_date = datetime.fromisoformat(end_date_str)
                # Add 23:59:59 to end_date to include the entire day
                end_date = end_date.replace(hour=23, minute=59, second=59)
            except ValueError:
                return jsonify({'error': 'Invalid end_date format. Use YYYY-MM-DD'}), 400
        
        # Build query
        query = Article.query
        
        # Apply date filters
        if start_date:
            query = query.filter(Article.date >= start_date)
        if end_date:
            query = query.filter(Article.date <= end_date)
        
        # Apply other filters
        if source:
            query = query.filter(Article.source == source)
        if category:
            query = query.filter(Article.category == category)
        if sentiment:
            query = query.filter(Article.sentiment_label == sentiment)
        if location:
            # Search for location in title, content, or category
            location_filter = or_(
                Article.title.ilike(f'%{location}%'),
                Article.content.ilike(f'%{location}%'),
                Article.category.ilike(f'%{location}%')
            )
            query = query.filter(location_filter)
        
        # Order by date (newest first)
        query = query.order_by(desc(Article.date))
        
        # Get total count before pagination
        total_count = query.count()
        
        # Apply pagination
        articles = query.paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        # Format response
        articles_list = []
        for article in articles.items:
            articles_list.append({
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
                },
                "created_at": article.created_at.isoformat() if article.created_at else None
            })
        
        return jsonify({
            'articles': articles_list,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': total_count,
                'pages': articles.pages,
                'has_next': articles.has_next,
                'has_prev': articles.has_prev
            },
            'filters': {
                'start_date': start_date_str,
                'end_date': end_date_str,
                'source': source,
                'category': category,
                'sentiment': sentiment,
                'location': location
            }
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@archive_bp.route('/archive/month', methods=['GET'])
def get_articles_by_month():
    """Get articles for a specific month"""
    try:
        year = int(request.args.get('year'))
        month = int(request.args.get('month'))
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 50))
        location = request.args.get('location')
        
        # Create date range for the month
        start_date = datetime(year, month, 1)
        if month == 12:
            end_date = datetime(year + 1, 1, 1) - timedelta(days=1)
        else:
            end_date = datetime(year, month + 1, 1) - timedelta(days=1)
        
        # Build query
        query = Article.query.filter(
            and_(
                Article.date >= start_date,
                Article.date <= end_date
            )
        )
        
        # Apply location filter if provided
        if location:
            location_filter = or_(
                Article.title.ilike(f'%{location}%'),
                Article.content.ilike(f'%{location}%'),
                Article.category.ilike(f'%{location}%')
            )
            query = query.filter(location_filter)
        
        query = query.order_by(desc(Article.date))
        
        # Get total count
        total_count = query.count()
        
        # Apply pagination
        articles = query.paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        # Format response
        articles_list = []
        for article in articles.items:
            articles_list.append({
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
            })
        
        return jsonify({
            'articles': articles_list,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': total_count,
                'pages': articles.pages,
                'has_next': articles.has_next,
                'has_prev': articles.has_prev
            },
            'month_info': {
                'year': year,
                'month': month,
                'month_name': start_date.strftime('%B'),
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat()
            }
        })
        
    except ValueError as e:
        return jsonify({'error': 'Invalid year or month parameter'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@archive_bp.route('/archive/period', methods=['GET'])
def get_articles_by_period():
    """Get articles for predefined periods (last_week, last_month, last_quarter, last_year)"""
    try:
        period = request.args.get('period', 'last_month')
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 50))
        location = request.args.get('location')
        
        # Calculate date range based on period
        now = datetime.now()
        
        if period == 'last_week':
            start_date = now - timedelta(days=7)
        elif period == 'last_month':
            start_date = now - timedelta(days=30)
        elif period == 'last_quarter':
            start_date = now - timedelta(days=90)
        elif period == 'last_year':
            start_date = now - timedelta(days=365)
        else:
            return jsonify({'error': 'Invalid period. Use: last_week, last_month, last_quarter, last_year'}), 400
        
        # Build query
        query = Article.query.filter(
            Article.date >= start_date
        )
        
        # Apply location filter if provided
        if location:
            location_filter = or_(
                Article.title.ilike(f'%{location}%'),
                Article.content.ilike(f'%{location}%'),
                Article.category.ilike(f'%{location}%')
            )
            query = query.filter(location_filter)
        
        query = query.order_by(desc(Article.date))
        
        # Get total count
        total_count = query.count()
        
        # Apply pagination
        articles = query.paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        # Format response
        articles_list = []
        for article in articles.items:
            articles_list.append({
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
            })
        
        return jsonify({
            'articles': articles_list,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': total_count,
                'pages': articles.pages,
                'has_next': articles.has_next,
                'has_prev': articles.has_prev
            },
            'period_info': {
                'period': period,
                'start_date': start_date.isoformat(),
                'end_date': now.isoformat()
            }
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@archive_bp.route('/archive/stats', methods=['GET'])
def get_archive_stats():
    """Get statistics about archived articles"""
    try:
        # Get date range if provided
        start_date_str = request.args.get('start_date')
        end_date_str = request.args.get('end_date')

        start_date = None
        end_date = None

        if start_date_str:
            start_date = datetime.fromisoformat(start_date_str)
        if end_date_str:
            end_date = datetime.fromisoformat(end_date_str)

        # Build base query
        query = Article.query
        if start_date:
            query = query.filter(Article.date >= start_date)
        if end_date:
            query = query.filter(Article.date <= end_date)

        # Get basic stats
        total_articles = query.count()

        # Articles by source
        sources = db.session.query(
            Article.source,
            func.count(Article.id).label('count')
        ).group_by(Article.source)

        if start_date:
            sources = sources.filter(Article.date >= start_date)
        if end_date:
            sources = sources.filter(Article.date <= end_date)

        sources = sources.all()

        # Articles by sentiment
        sentiments = db.session.query(
            Article.sentiment_label,
            func.count(Article.id).label('count')
        ).group_by(Article.sentiment_label)

        if start_date:
            sentiments = sentiments.filter(Article.date >= start_date)
        if end_date:
            sentiments = sentiments.filter(Article.date <= end_date)

        sentiments = sentiments.all()

        monthly_query = db.session.query(
            func.strftime('%Y-%m', Article.date).label('month'),
            func.count(Article.id).label('count')
        )
        if start_date:
            monthly_query = monthly_query.filter(Article.date >= start_date)
        if end_date:
            monthly_query = monthly_query.filter(Article.date <= end_date)
        if not start_date and not end_date:
            window_start = datetime.now() - timedelta(days=365)
            monthly_query = monthly_query.filter(Article.date >= window_start)
        monthly_stats = monthly_query.group_by(
            func.strftime('%Y-%m', Article.date)
        ).order_by('month').all()

        return jsonify({
            'total_articles': total_articles,
            'sources': [{'source': s[0], 'count': s[1]} for s in sources],
            'sentiments': [{'sentiment': s[0], 'count': s[1]} for s in sentiments],
            'monthly_stats': [{'month': m[0], 'count': m[1]} for m in monthly_stats],
            'date_range': {
                'start_date': start_date_str,
                'end_date': end_date_str
            }
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@archive_bp.route('/archive/available-dates', methods=['GET'])
def get_available_dates():
    """Get available date ranges in the archive"""
    try:
        # Get earliest and latest dates
        earliest = db.session.query(func.min(Article.date)).scalar()
        latest = db.session.query(func.max(Article.date)).scalar()
        
        # Get unique months with articles
        months = db.session.query(
            func.strftime('%Y-%m', Article.date).label('month'),
            func.count(Article.id).label('count')
        ).filter(
            Article.date.isnot(None)
        ).group_by(
            func.strftime('%Y-%m', Article.date)
        ).order_by('month').all()
        
        return jsonify({
            'earliest_date': earliest.isoformat() if earliest else None,
            'latest_date': latest.isoformat() if latest else None,
            'available_months': [
                {
                    'month': m[0],
                    'count': m[1],
                    'year': int(m[0].split('-')[0]),
                    'month_num': int(m[0].split('-')[1])
                } for m in months
            ]
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@archive_bp.route('/archive/live-fetch', methods=['POST'])
def live_fetch_window():
    try:
        payload = request.get_json() or {}
        t = payload.get('type')
        period = payload.get('period')
        year = payload.get('year')
        month = payload.get('month')
        start_date_str = payload.get('start_date')
        end_date_str = payload.get('end_date')
        q = payload.get('q')
        now = datetime.now()
        start_dt = None
        end_dt = None
        if t == 'period':
            if period == 'last_week':
                start_dt = now - timedelta(days=7)
                end_dt = now
            elif period == 'last_month':
                start_dt = now - timedelta(days=30)
                end_dt = now
            elif period == 'last_quarter':
                start_dt = now - timedelta(days=90)
                end_dt = now
            elif period == 'last_year':
                start_dt = now - timedelta(days=365)
                end_dt = now
            else:
                return jsonify({'error': 'Invalid period'}), 400
        elif t == 'month':
            y = int(year)
            m = int(month)
            start_dt = datetime(y, m, 1)
            if m == 12:
                end_dt = datetime(y + 1, 1, 1) - timedelta(seconds=1)
            else:
                end_dt = datetime(y, m + 1, 1) - timedelta(seconds=1)
        elif t == 'range':
            if start_date_str:
                start_dt = datetime.fromisoformat(start_date_str)
            if end_date_str:
                end_dt = datetime.fromisoformat(end_date_str)
            if start_dt and not end_dt:
                end_dt = now
            if not start_dt and not end_dt:
                return jsonify({'error': 'start_date or end_date required'}), 400
        else:
            return jsonify({'error': 'Invalid type'}), 400
        from_iso = start_dt.isoformat()
        to_iso = end_dt.isoformat()
        live_articles = []
        live_articles += fetch_from_newsapi_window(from_iso, to_iso, q=q, limit=50)
        live_articles += fetch_from_guardian_window(from_iso, to_iso, q=q, page_size=50)
        existing_urls_query = db.session.query(Article.url)
        if start_dt:
            existing_urls_query = existing_urls_query.filter(Article.date >= start_dt)
        if end_dt:
            existing_urls_query = existing_urls_query.filter(Article.date <= end_dt)
        existing_urls = set(u[0] for u in existing_urls_query.all())
        deduped = []
        seen = set()
        for a in live_articles:
            u = a.get('url')
            if not u or u in seen or u in existing_urls:
                continue
            seen.add(u)
            deduped.append(a)
        try:
            upsert_articles_task.queue(deduped)
        except Exception:
            pass
        return jsonify({'live': deduped, 'window': {'start_date': from_iso, 'end_date': to_iso}})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@archive_bp.route('/archive/backfill-last-year', methods=['POST'])
def backfill_last_year():
    try:
        payload = request.get_json() or {}
        q = payload.get('q')
        per_chunk = int(payload.get('per_chunk', 50))
        now = datetime.now()
        start = now.replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=365)
        cursor = start
        total_found = 0
        total_inserted = 0
        while cursor < now:
            if cursor.month == 12:
                month_end = datetime(cursor.year + 1, 1, 1) - timedelta(seconds=1)
            else:
                month_end = datetime(cursor.year, cursor.month + 1, 1) - timedelta(seconds=1)
            from_iso = cursor.isoformat()
            to_iso = month_end.isoformat()
            batch = []
            batch += fetch_from_newsapi_window(from_iso, to_iso, q=q, limit=per_chunk)
            batch += fetch_from_guardian_window(from_iso, to_iso, q=q, page_size=per_chunk)
            existing_urls_query = db.session.query(Article.url).filter(
                Article.date >= cursor, Article.date <= month_end
            )
            existing_urls = set(u[0] for u in existing_urls_query.all())
            deduped = []
            seen = set()
            for a in batch:
                u = a.get('url')
                if not u or u in seen or u in existing_urls:
                    continue
                seen.add(u)
                deduped.append(a)
            total_found += len(deduped)
            if deduped:
                result = upsert_articles_task(deduped)
                if isinstance(result, dict):
                    total_inserted += int(result.get('inserted', 0) or 0)
            cursor = month_end + timedelta(seconds=1)
        return jsonify({'status': 'completed', 'found': total_found, 'inserted': total_inserted})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
