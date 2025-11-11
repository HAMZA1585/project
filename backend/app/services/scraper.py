import os
import logging
import requests
from datetime import datetime
from bs4 import BeautifulSoup
import re
from concurrent.futures import ThreadPoolExecutor, as_completed

logger = logging.getLogger(__name__)

# Headers to make requests look like a real browser (fixes 403 errors)
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
    'Connection': 'keep-alive'
}

# Import notification helper (will be None if app context not available)
try:
    from ..utils import create_system_notification
except ImportError:
    create_system_notification = None

NEWS_API_KEY = os.getenv('NEWS_API_KEY')
CURRENTS_API_KEY = os.getenv('CURRENTS_API_KEY')
GUARDIAN_API_KEY = os.getenv('GUARDIAN_API_KEY')

DEFAULT_TIMEOUT_SECONDS = 15

def http_get(url, *, headers=None, params=None, timeout=DEFAULT_TIMEOUT_SECONDS):
    try:
        response = requests.get(url, headers=headers, params=params, timeout=timeout)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as err:
        logger.error(f"HTTP GET request failed for {url}. Error: {str(err)}")
        raise

def normalize_date(date_string):
    if not date_string or not isinstance(date_string, str):
        return None
    try:
        dt = datetime.fromisoformat(date_string.replace('Z', '+00:00'))
        return dt.isoformat()
    except ValueError:
        logger.warning(f"Could not parse date: {date_string}")
        return None

def fetch_article_content(article_info, headers, content_selectors, source_name):
    """Fetches and parses a single article page concurrently."""
    try:
        article_url = article_info['url']
        title = article_info['title']
        
        article_page = requests.get(article_url, headers=HEADERS, timeout=DEFAULT_TIMEOUT_SECONDS)
        article_page.raise_for_status()
        article_soup = BeautifulSoup(article_page.content, 'html.parser')
        
        # Try multiple content selectors
        content_container = None
        for selector in content_selectors:
            content_container = article_soup.select_one(selector)
            if content_container:
                break
        
        if not content_container:
            logger.warning(f"No content container found for {article_url}")
            return None
            
        paragraphs = content_container.find_all('p')
        full_content = '\n'.join(p.get_text(strip=True) for p in paragraphs)
        
        if not full_content or len(full_content.strip()) < 50:
            logger.warning(f"Insufficient content for {article_url}")
            return None
            
        return {
            "title": title,
            "url": article_url,
            "source": source_name,
            "content": full_content,
            "date": datetime.now().isoformat(),
            "category": "Pakistan News"
        }
    except requests.RequestException as page_err:
        logger.warning(f"Failed to fetch content for {article_info['url']}: {str(page_err)}")
        return None
    except Exception as e:
        logger.warning(f"Error processing article content from {article_info['url']}: {str(e)}")
        return None

def fetch_from_newsapi(limit=10):
    if not NEWS_API_KEY:
        logger.warning("NewsAPI key not found. Skipping.")
        if create_system_notification:
            create_system_notification(
                'WARNING',
                'NewsAPI key not found. NewsAPI scraper is disabled.',
                source='scraper'
            )
        return []
    
    url = "https://newsapi.org/v2/top-headlines"
    params = {'country': 'pk', 'pageSize': limit, 'apiKey': NEWS_API_KEY}  # Changed to Pakistan
    
    try:
        data = http_get(url, params=params)
        articles = []
        for item in data.get('articles', []):
            articles.append({
                "title": item.get('title'),
                "url": item.get('url'),
                "source": "NewsAPI.org",
                "content": item.get('description') or item.get('content'),
                "date": normalize_date(item.get('publishedAt')),
                "category": item.get('source', {}).get('name')
            })
        return articles
    except Exception as e:
        error_msg = f"Failed to fetch from NewsAPI.org. Error: {str(e)}"
        logger.error(error_msg)
        if create_system_notification:
            create_system_notification(
                'ERROR',
                error_msg,
                source='scraper'
            )
        return []

def fetch_from_currents(limit=10):
    if not CURRENTS_API_KEY:
        logger.warning("Currents API key not found. Skipping.")
        if create_system_notification:
            create_system_notification(
                'WARNING',
                'Currents API key not found. Currents scraper is disabled.',
                source='scraper'
            )
        return []
        
    url = "https://api.currentsapi.services/v1/latest-news"
    params = {'language': 'en', 'limit': limit}
    headers = {'Authorization': CURRENTS_API_KEY}

    try:
        data = http_get(url, params=params, headers=headers)
        articles = []
        for item in data.get('news', []):
            articles.append({
                "title": item.get('title'),
                "url": item.get('url'),
                "source": "CurrentsAPI",
                "content": item.get('description'),
                "date": normalize_date(item.get('published')),
                "category": item.get('category', [None])[0]
            })
        return articles
    except Exception as e:
        error_msg = f"Failed to fetch from Currents API. Error: {str(e)}"
        logger.error(error_msg)
        if create_system_notification:
            create_system_notification(
                'ERROR',
                error_msg,
                source='scraper'
            )
        return []

def fetch_from_guardian(limit=10):
    if not GUARDIAN_API_KEY:
        logger.warning("The Guardian API key not found. Skipping.")
        if create_system_notification:
            create_system_notification(
                'WARNING',
                'The Guardian API key not found. Guardian scraper is disabled.',
                source='scraper'
            )
        return []

    url = "https://content.guardianapis.com/search"
    params = {'api-key': GUARDIAN_API_KEY, 'page-size': limit, 'show-fields': 'trailText,headline'}

    try:
        data = http_get(url, params=params)
        articles = []
        for item in data.get('response', {}).get('results', []):
            articles.append({
                "title": item.get('fields', {}).get('headline'),
                "url": item.get('webUrl'),
                "source": "The Guardian",
                "content": item.get('fields', {}).get('trailText'),
                "date": normalize_date(item.get('webPublicationDate')),
                "category": item.get('sectionName')
            })
        return articles
    except Exception as e:
        error_msg = f"Failed to fetch from The Guardian. Error: {str(e)}"
        logger.error(error_msg)
        if create_system_notification:
            create_system_notification(
                'ERROR',
                error_msg,
                source='scraper'
            )
        return []

def fetch_from_dawn(limit=10):
    """Fetch news from DAWN Pakistan concurrently."""
    try:
        url = "https://www.dawn.com/"
        
        response = requests.get(url, headers=HEADERS, timeout=DEFAULT_TIMEOUT_SECONDS)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, 'html.parser')
        
        articles_to_fetch = []
        article_links = soup.select('a[href*="/news/"]', limit=limit * 2)  # Fetch more links to ensure we get enough valid ones

        for link in article_links:
            if len(articles_to_fetch) >= limit:
                break

            title = link.get_text(strip=True)
            article_url = link.get('href')

            if not article_url or not title or len(title) < 20:
                continue

            if not article_url.startswith('http'):
                article_url = 'https://www.dawn.com' + article_url
            
            articles_to_fetch.append({'url': article_url, 'title': title})

        # DAWN-specific content selectors
        content_selectors = ['.story__content', '.story-content', '.article-content', 'article', '.content']
        
        articles = []
        with ThreadPoolExecutor(max_workers=5) as executor:
            future_to_article = {
                executor.submit(fetch_article_content, article, HEADERS, content_selectors, "DAWN"): article 
                for article in articles_to_fetch
            }
            
            for future in as_completed(future_to_article):
                try:
                    result = future.result()
                    if result:
                        articles.append(result)
                except Exception as exc:
                    article_info = future_to_article[future]
                    logger.error(f"{article_info['url']} generated an exception: {exc}")

        logger.info(f"Successfully scraped {len(articles)} full articles from DAWN.")
        return articles
    except Exception as e:
        logger.error(f"Failed to fetch from DAWN. Error: {str(e)}")
        return []

def fetch_from_daily_express(limit=10):
    """Fetch news from Daily Express Pakistan concurrently."""
    try:
        url = "https://www.express.com.pk/"
        
        response = requests.get(url, headers=HEADERS, timeout=DEFAULT_TIMEOUT_SECONDS)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, 'html.parser')
        
        articles_to_fetch = []
        article_links = soup.select('a[href*="/story/"]', limit=limit * 2)

        for link in article_links:
            if len(articles_to_fetch) >= limit:
                break

            title = link.get_text(strip=True)
            article_url = link.get('href')

            if not article_url or not title or len(title) < 20:
                continue

            if not article_url.startswith('http'):
                article_url = 'https://www.express.com.pk' + article_url
            
            articles_to_fetch.append({'url': article_url, 'title': title})

        # Daily Express-specific content selectors
        content_selectors = ['.story-content', '.article-content', '.content', 'article', '.post-content']
        
        articles = []
        with ThreadPoolExecutor(max_workers=5) as executor:
            future_to_article = {
                executor.submit(fetch_article_content, article, HEADERS, content_selectors, "Daily Express"): article 
                for article in articles_to_fetch
            }
            
            for future in as_completed(future_to_article):
                try:
                    result = future.result()
                    if result:
                        articles.append(result)
                except Exception as exc:
                    article_info = future_to_article[future]
                    logger.error(f"{article_info['url']} generated an exception: {exc}")

        logger.info(f"Successfully scraped {len(articles)} full articles from Daily Express.")
        return articles
    except Exception as e:
        logger.error(f"Failed to fetch from Daily Express. Error: {str(e)}")
        return []

def fetch_from_nation(limit=10):
    """Fetch news from The Nation Pakistan concurrently."""
    try:
        url = "https://nation.com.pk/"
        
        response = requests.get(url, headers=HEADERS, timeout=DEFAULT_TIMEOUT_SECONDS)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, 'html.parser')
        
        articles_to_fetch = []
        article_links = soup.select('a[href*="/news/"]', limit=limit * 2)

        for link in article_links:
            if len(articles_to_fetch) >= limit:
                break

            title = link.get_text(strip=True)
            article_url = link.get('href')

            if not article_url or not title or len(title) < 20:
                continue

            if not article_url.startswith('http'):
                article_url = 'https://nation.com.pk' + article_url
            
            articles_to_fetch.append({'url': article_url, 'title': title})

        # The Nation-specific content selectors
        content_selectors = ['.article-content', '.story-content', '.content', 'article', '.post-content', '.entry-content']
        
        articles = []
        with ThreadPoolExecutor(max_workers=5) as executor:
            future_to_article = {
                executor.submit(fetch_article_content, article, HEADERS, content_selectors, "The Nation"): article 
                for article in articles_to_fetch
            }
            
            for future in as_completed(future_to_article):
                try:
                    result = future.result()
                    if result:
                        articles.append(result)
                except Exception as exc:
                    article_info = future_to_article[future]
                    logger.error(f"{article_info['url']} generated an exception: {exc}")

        logger.info(f"Successfully scraped {len(articles)} full articles from The Nation.")
        return articles
    except Exception as e:
        logger.error(f"Failed to fetch from The Nation. Error: {str(e)}")
        return []

def fetch_from_pakistan_times(limit=10):
    """Fetch news from Pakistan Times concurrently."""
    try:
        url = "https://pakistantimes.com.pk/"
        
        response = requests.get(url, headers=HEADERS, timeout=DEFAULT_TIMEOUT_SECONDS)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, 'html.parser')
        
        articles_to_fetch = []
        article_links = soup.select('a[href*="/news/"]', limit=limit * 2)

        for link in article_links:
            if len(articles_to_fetch) >= limit:
                break

            title = link.get_text(strip=True)
            article_url = link.get('href')

            if not article_url or not title or len(title) < 20:
                continue

            if not article_url.startswith('http'):
                article_url = 'https://pakistantimes.com.pk' + article_url
            
            articles_to_fetch.append({'url': article_url, 'title': title})

        # Pakistan Times-specific content selectors
        content_selectors = ['.article-content', '.story-content', '.content', 'article', '.post-content', '.entry-content', '.news-content']
        
        articles = []
        with ThreadPoolExecutor(max_workers=5) as executor:
            future_to_article = {
                executor.submit(fetch_article_content, article, HEADERS, content_selectors, "Pakistan Times"): article 
                for article in articles_to_fetch
            }
            
            for future in as_completed(future_to_article):
                try:
                    result = future.result()
                    if result:
                        articles.append(result)
                except Exception as exc:
                    article_info = future_to_article[future]
                    logger.error(f"{article_info['url']} generated an exception: {exc}")

        logger.info(f"Successfully scraped {len(articles)} full articles from Pakistan Times.")
        return articles
    except Exception as e:
        logger.error(f"Failed to fetch from Pakistan Times. Error: {str(e)}")
        return []

def fetch_from_pakistan_observer(limit=10):
    """Fetch news from Pakistan Observer concurrently."""
    try:
        url = "https://pakobserver.net/"
        
        response = requests.get(url, headers=HEADERS, timeout=DEFAULT_TIMEOUT_SECONDS)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, 'html.parser')
        
        articles_to_fetch = []
        article_links = soup.select('a[href*="/news/"]', limit=limit * 2)

        for link in article_links:
            if len(articles_to_fetch) >= limit:
                break

            title = link.get_text(strip=True)
            article_url = link.get('href')

            if not article_url or not title or len(title) < 20:
                continue

            if not article_url.startswith('http'):
                article_url = 'https://pakobserver.net' + article_url
            
            articles_to_fetch.append({'url': article_url, 'title': title})

        # Pakistan Observer-specific content selectors
        content_selectors = ['.article-content', '.story-content', '.content', 'article', '.post-content', '.entry-content', '.news-content', '.observer-content']
        
        articles = []
        with ThreadPoolExecutor(max_workers=5) as executor:
            future_to_article = {
                executor.submit(fetch_article_content, article, HEADERS, content_selectors, "Pakistan Observer"): article 
                for article in articles_to_fetch
            }
            
            for future in as_completed(future_to_article):
                try:
                    result = future.result()
                    if result:
                        articles.append(result)
                except Exception as exc:
                    article_info = future_to_article[future]
                    logger.error(f"{article_info['url']} generated an exception: {exc}")

        logger.info(f"Successfully scraped {len(articles)} full articles from Pakistan Observer.")
        return articles
    except Exception as e:
        logger.error(f"Failed to fetch from Pakistan Observer. Error: {str(e)}")
        return []

def fetch_from_urdu_point(limit=10):
    """Fetch news from Urdu Point concurrently."""
    try:
        url = "https://www.urdupoint.com/"
        
        response = requests.get(url, headers=HEADERS, timeout=DEFAULT_TIMEOUT_SECONDS)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, 'html.parser')
        
        articles_to_fetch = []
        article_links = soup.select('a[href*="/news/"]', limit=limit * 2)

        for link in article_links:
            if len(articles_to_fetch) >= limit:
                break

            title = link.get_text(strip=True)
            article_url = link.get('href')

            if not article_url or not title or len(title) < 20:
                continue

            if not article_url.startswith('http'):
                article_url = 'https://www.urdupoint.com' + article_url
            
            articles_to_fetch.append({'url': article_url, 'title': title})

        # Urdu Point-specific content selectors
        content_selectors = ['.article-content', '.story-content', '.content', 'article', '.post-content', '.entry-content', '.news-content', '.urdu-content', '.detail-content']
        
        articles = []
        with ThreadPoolExecutor(max_workers=5) as executor:
            future_to_article = {
                executor.submit(fetch_article_content, article, HEADERS, content_selectors, "Urdu Point"): article 
                for article in articles_to_fetch
            }
            
            for future in as_completed(future_to_article):
                try:
                    result = future.result()
                    if result:
                        articles.append(result)
                except Exception as exc:
                    article_info = future_to_article[future]
                    logger.error(f"{article_info['url']} generated an exception: {exc}")

        logger.info(f"Successfully scraped {len(articles)} full articles from Urdu Point.")
        return articles
    except Exception as e:
        logger.error(f"Failed to fetch from Urdu Point. Error: {str(e)}")
        return []

def get_news_from_sources():
    api_sources = [
        fetch_from_newsapi,
        fetch_from_currents,
        fetch_from_guardian,
        # Pakistani news sources
        fetch_from_dawn,
        fetch_from_daily_express,
        fetch_from_nation,
        fetch_from_pakistan_times,
        fetch_from_pakistan_observer,
        fetch_from_urdu_point,
    ]

    result = {}
    for fetch_func in api_sources:
        try:
            articles = fetch_func()
            if articles:
                source_name = articles[0]['source']
                result[source_name] = articles
        except Exception as err:
            logger.error(f"Error in source aggregation for {fetch_func.__name__}: {str(err)}")
    
    return result