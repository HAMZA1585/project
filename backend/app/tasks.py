"""
Background tasks for news processing pipeline using RQ (Redis Queue).
This module contains individual task functions that can be queued and executed
asynchronously, making the system fault-tolerant and scalable.
"""

import logging
from datetime import datetime
from app import create_app, db, rq
from app.models import Article, Trend, SystemNotification
from app.services.scraper import (
    fetch_from_dawn, fetch_from_daily_express, fetch_from_nation,
    fetch_from_pakistan_times, fetch_from_pakistan_observer, fetch_from_urdu_point
)
from app.services.sentiment import analyze_sentiment
from app.services.trend import analyze_news_trends
import os
import requests

logger = logging.getLogger(__name__)

# Source mapping for dynamic task creation (Pakistan-only sources)
SOURCE_FUNCTIONS = {
    'dawn': fetch_from_dawn,
    'daily_express': fetch_from_daily_express,
    'nation': fetch_from_nation,
    'pakistan_times': fetch_from_pakistan_times,
    'pakistan_observer': fetch_from_pakistan_observer,
    'urdu_point': fetch_from_urdu_point
}

@rq.job('scraping', timeout='5m')
def scrape_source_task(source_name, limit=10):
    """
    Scrape articles from a specific news source.
    
    Args:
        source_name (str): Name of the source to scrape
        limit (int): Maximum number of articles to fetch
    
    Returns:
        dict: Results of the scraping operation
    """
    app = create_app()
    with app.app_context():
        try:
            logger.info(f"Starting scraping task for source: {source_name}")
            
            # Get the appropriate scraping function
            scrape_func = SOURCE_FUNCTIONS.get(source_name)
            if not scrape_func:
                raise ValueError(f"Unknown source: {source_name}")
            
            # Scrape articles
            articles = scrape_func(limit=limit)
            
            if not articles:
                logger.warning(f"No articles found for source: {source_name}")
                return {
                    'source': source_name,
                    'status': 'completed',
                    'articles_found': 0,
                    'articles_added': 0,
                    'errors': []
                }
            
            # Process and store articles
            articles_added = 0
            errors = []
            
            for article_data in articles:
                try:
                    # Check if article already exists
                    existing_article = Article.query.filter_by(url=article_data.get('url')).first()
                    if existing_article:
                        continue
                    
                    # Parse date
                    article_date = None
                    if article_data.get('date'):
                        try:
                            article_date = datetime.fromisoformat(article_data['date'].replace('Z', '+00:00'))
                        except (ValueError, TypeError):
                            logger.warning(f"Could not parse date: {article_data['date']}")
                            article_date = None
                    
                    # Create new article
                    new_article = Article(
                        title=article_data.get('title'),
                        url=article_data.get('url'),
                        source=article_data.get('source'),
                        content=article_data.get('content'),
                        category=article_data.get('category'),
                        date=article_date
                    )
                    
                    db.session.add(new_article)
                    db.session.commit()
                    
                    articles_added += 1
                    
                    # Queue sentiment analysis task for the new article
                    analyze_article_sentiment_task.queue(new_article.id)
                    
                    logger.info(f"Added article {new_article.id} from {source_name}")
                    
                except Exception as e:
                    error_msg = f"Error processing article from {source_name}: {str(e)}"
                    logger.error(error_msg)
                    errors.append(error_msg)
                    db.session.rollback()
                    continue
            
            result = {
                'source': source_name,
                'status': 'completed',
                'articles_found': len(articles),
                'articles_added': articles_added,
                'errors': errors
            }
            
            logger.info(f"Completed scraping task for {source_name}: {articles_added} articles added")
            return result
            
        except Exception as e:
            error_msg = f"Scraping task failed for {source_name}: {str(e)}"
            logger.error(error_msg)
            
            # Create system notification for admin visibility
            try:
                notification = SystemNotification(
                    level='ERROR',
                    message=error_msg,
                    source=f'scraper:{source_name}'
                )
                db.session.add(notification)
                db.session.commit()
            except Exception as db_err:
                logger.error(f"Failed to write notification to DB: {db_err}")
                db.session.rollback()

            # Attempt to send push notification via FCM if configured
            try:
                fcm_key = os.getenv('FCM_SERVER_KEY')
                if fcm_key:
                    headers = {
                        'Authorization': f'key={fcm_key}',
                        'Content-Type': 'application/json'
                    }
                    payload = {
                        'to': '/topics/alerts',
                        'notification': {
                            'title': 'Scraper Failure',
                            'body': error_msg
                        },
                        'data': {
                            'source': source_name,
                            'severity': 'error',
                        }
                    }
                    requests.post('https://fcm.googleapis.com/fcm/send', headers=headers, json=payload, timeout=5)
            except Exception as fcm_err:
                logger.warning(f"Failed to send FCM push: {fcm_err}")
            
            return {
                'source': source_name,
                'status': 'failed',
                'articles_found': 0,
                'articles_added': 0,
                'errors': [error_msg]
            }

@rq.job('analysis', timeout='2m')
def analyze_article_sentiment_task(article_id):
    """
    Analyze sentiment for a specific article.
    
    Args:
        article_id (int): ID of the article to analyze
    
    Returns:
        dict: Results of the sentiment analysis
    """
    app = create_app()
    with app.app_context():
        try:
            logger.info(f"Starting sentiment analysis for article {article_id}")
            
            # Get the article
            article = Article.query.get(article_id)
            if not article:
                raise ValueError(f"Article {article_id} not found")
            
            # Analyze sentiment
            text_to_analyze = article.content or article.title or ''
            if not text_to_analyze:
                logger.warning(f"No content to analyze for article {article_id}")
                return {
                    'article_id': article_id,
                    'status': 'skipped',
                    'reason': 'No content to analyze'
                }
            
            sentiment = analyze_sentiment(text_to_analyze)
            
            # Update article with sentiment data
            article.sentiment_label = sentiment.get('label', '').capitalize()
            article.sentiment_score = sentiment.get('score', 0.0)
            
            db.session.commit()
            
            result = {
                'article_id': article_id,
                'status': 'completed',
                'sentiment_label': article.sentiment_label,
                'sentiment_score': article.sentiment_score
            }
            
            logger.info(f"Completed sentiment analysis for article {article_id}: {article.sentiment_label}")
            return result
            
        except Exception as e:
            error_msg = f"Sentiment analysis failed for article {article_id}: {str(e)}"
            logger.error(error_msg)
            return {
                'article_id': article_id,
                'status': 'failed',
                'error': error_msg
            }

@rq.job('trends', timeout='10m')
def run_trend_analysis_task():
    """
    Perform trend analysis on recent articles.
    
    Returns:
        dict: Results of the trend analysis
    """
    app = create_app()
    with app.app_context():
        try:
            logger.info("Starting trend analysis task")
            
            # Get the 500 most recent articles for trend analysis
            recent_articles = Article.query.order_by(Article.date.desc()).limit(500).all()
            
            if not recent_articles:
                logger.warning("No recent articles found for trend analysis")
                return {
                    'status': 'skipped',
                    'reason': 'No articles available',
                    'trends_found': 0
                }
            
            # Extract article content strings
            article_contents = []
            for article in recent_articles:
                if article.content:
                    article_contents.append(article.content)
                elif article.title:
                    article_contents.append(article.title)
            
            if not article_contents:
                logger.warning("No article content available for trend analysis")
                return {
                    'status': 'skipped',
                    'reason': 'No content available',
                    'trends_found': 0
                }
            
            # Perform TF-IDF trend analysis
            trend_results = analyze_news_trends(article_contents, top_n=20)
            
            if not trend_results:
                logger.warning("No trends found from recent articles")
                return {
                    'status': 'completed',
                    'trends_found': 0,
                    'message': 'No trends detected'
                }
            
            # Store new trends (without deleting existing ones)
            trends_added = 0
            for trend_data in trend_results:
                # Check if trend already exists recently
                existing_trend = Trend.query.filter_by(
                    keyword=trend_data['keyword']
                ).filter(
                    Trend.created_at >= datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
                ).first()
                
                if not existing_trend:
                    trend = Trend(
                        keyword=trend_data['keyword'],
                        score=trend_data['score']
                    )
                    db.session.add(trend)
                    trends_added += 1
            
            db.session.commit()
            
            result = {
                'status': 'completed',
                'articles_analyzed': len(article_contents),
                'trends_found': len(trend_results),
                'trends_added': trends_added
            }
            
            # Log top trends for monitoring
            top_5_trends = trend_results[:5]
            trend_summary = ", ".join([f"{item['keyword']} ({item['score']:.3f})" for item in top_5_trends])
            logger.info(f"Completed trend analysis: {trends_added} new trends added. Top 5: {trend_summary}")
            
            return result
            
        except Exception as e:
            error_msg = f"Trend analysis task failed: {str(e)}"
            logger.error(error_msg)
            return {
                'status': 'failed',
                'error': error_msg,
                'trends_found': 0
            }

@rq.job('default', timeout='1m')
def health_check_task():
    """
    Simple health check task to verify the queue system is working.
    
    Returns:
        dict: Health check results
    """
    app = create_app()
    with app.app_context():
        try:
            # Check database connection
            article_count = Article.query.count()
            trend_count = Trend.query.count()
            
            return {
                'status': 'healthy',
                'timestamp': datetime.now().isoformat(),
                'database': 'connected',
                'articles_in_db': article_count,
                'trends_in_db': trend_count
            }
            
        except Exception as e:
            return {
                'status': 'unhealthy',
                'timestamp': datetime.now().isoformat(),
                'error': str(e)
            }

def queue_all_scraping_tasks(limit=10):
    """
    Queue scraping tasks for all available news sources.
    
    Args:
        limit (int): Maximum articles per source
    
    Returns:
        list: List of job IDs for the queued tasks
    """
    app = create_app()
    with app.app_context():
        job_ids = []
        
        for source_name in SOURCE_FUNCTIONS.keys():
            try:
                job = scrape_source_task.queue(source_name, limit)
                job_ids.append(job.id)
                logger.info(f"Queued scraping task for {source_name} (Job ID: {job.id})")
            except Exception as e:
                logger.error(f"Failed to queue task for {source_name}: {str(e)}")
        
        return job_ids

def queue_trend_analysis_task():
    """
    Queue a trend analysis task.
    
    Returns:
        str: Job ID for the queued task
    """
    app = create_app()
    with app.app_context():
        try:
            job = run_trend_analysis_task.queue()
            logger.info(f"Queued trend analysis task (Job ID: {job.id})")
            return job.id
        except Exception as e:
            logger.error(f"Failed to queue trend analysis task: {str(e)}")
            return None
