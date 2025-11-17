import os
import logging
import requests
from datetime import datetime
from bs4 import BeautifulSoup
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.parse import urlparse, urlunparse

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

# Cache for NewsAPI sources → category mapping
NEWSAPI_SOURCE_CATEGORY_MAP = {}

def _load_newsapi_source_category_map():
    global NEWSAPI_SOURCE_CATEGORY_MAP
    if not NEWS_API_KEY:
        return
    if NEWSAPI_SOURCE_CATEGORY_MAP:
        return
    try:
        url = "https://newsapi.org/v2/top-headlines/sources"
        params = {"language": "en"}
        headers = {"X-Api-Key": NEWS_API_KEY}
        data = http_get(url, params=params, headers=headers)
        mapping = {}
        for src in data.get("sources", []):
            cat = src.get("category")
            src_id = src.get("id")
            name = src.get("name")
            if cat:
                if src_id:
                    mapping[src_id.lower()] = cat
                if name:
                    mapping[name.lower()] = cat
        NEWSAPI_SOURCE_CATEGORY_MAP = mapping
    except Exception as e:
        logger.warning(f"Failed to load NewsAPI source categories: {str(e)}")

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
        
        # Early dedupe: skip if URL already exists in DB
        try:
            from ..models import Article
            from .. import db
            canon_pre = canonicalize_url(article_url)
            exists = Article.query.filter_by(url=canon_pre).first()
            if exists:
                return None
        except Exception:
            pass

        article_page = requests.get(article_url, headers=HEADERS, timeout=DEFAULT_TIMEOUT_SECONDS)
        article_page.raise_for_status()
        article_soup = BeautifulSoup(article_page.content, 'html.parser')
        
        # Try multiple content selectors (broader for DAWN)
        candidates = list(content_selectors) + [
            '.story-body', '#story-content', '.story', '[class*="story"]',
            '.article__body', 'main'
        ]
        content_container = None
        for selector in candidates:
            try:
                node = article_soup.select_one(selector)
            except Exception:
                node = None
            if node:
                content_container = node
                break
        
        paragraphs = []
        if content_container:
            paragraphs = content_container.find_all('p') or []
        if not paragraphs:
            paragraphs = article_soup.find_all('p') or []
        full_content = '\n'.join(p.get_text(strip=True) for p in paragraphs)
        
        if not full_content or len(full_content.strip()) < 10:
            # Fallback to meta description
            try:
                meta_desc = article_soup.select_one('meta[name="description"]')
                if meta_desc and meta_desc.get('content'):
                    full_content = meta_desc.get('content').strip()
            except Exception:
                pass
        if not full_content:
            logger.warning(f"No usable content extracted for {article_url}")
            return None
            
        pub_iso = None
        try:
            tnode = article_soup.select_one('.story__time .timestamp--time')
            if tnode and tnode.get('title'):
                raw = tnode.get('title').strip()
                try:
                    dt = datetime.strptime(raw, "%d %b, %Y %I:%M%p")
                    pub_iso = dt.isoformat()
                except Exception:
                    pub_iso = None
            if not pub_iso:
                m = article_soup.select_one('meta[property="article:published_time"]')
                if m and m.get('content'):
                    c = m.get('content').strip()
                    try:
                        pub_iso = datetime.fromisoformat(c.replace('Z', '+00:00')).isoformat()
                    except Exception:
                        pub_iso = None
        except Exception:
            pub_iso = None
        # Use canonical URL from meta if present
        canon_url = canonicalize_url(article_url)
        try:
            og = article_soup.select_one('meta[property="og:url"]')
            if og and og.get('content'):
                canon_url = canonicalize_url(og.get('content').strip())
        except Exception:
            pass
        # Final dedupe before returning
        try:
            from ..models import Article
            exists2 = Article.query.filter_by(url=canon_url).first()
            if exists2:
                return None
        except Exception:
            pass

        return {
            "title": title,
            "url": canon_url,
            "source": source_name,
            "content": full_content,
            "date": pub_iso,
            "category": "general"
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
        # Preload source → category map
        _load_newsapi_source_category_map()
        data = http_get(url, params=params)
        articles = []
        for item in data.get('articles', []):
            src_info = item.get('source', {}) or {}
            src_id = (src_info.get('id') or '').lower() if src_info.get('id') else ''
            src_name = (src_info.get('name') or '').lower() if src_info.get('name') else ''
            cat = (
                NEWSAPI_SOURCE_CATEGORY_MAP.get(src_id)
                or NEWSAPI_SOURCE_CATEGORY_MAP.get(src_name)
                or 'general'
            )
            articles.append({
                "title": item.get('title'),
                "url": item.get('url'),
                "source": "NewsAPI.org",
                "content": item.get('description') or item.get('content'),
                "date": normalize_date(item.get('publishedAt')),
                "category": cat
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

def fetch_from_newsapi_window(from_date, to_date, q=None, limit=50):
    if not NEWS_API_KEY:
        return []
    url = "https://newsapi.org/v2/everything"
    params = {
        'from': from_date,
        'to': to_date,
        'pageSize': limit,
        'language': 'en',
        'sortBy': 'publishedAt'
    }
    if q:
        params['q'] = q
    headers = {'X-Api-Key': NEWS_API_KEY}
    try:
        _load_newsapi_source_category_map()
        data = http_get(url, params=params, headers=headers)
        articles = []
        for item in data.get('articles', []):
            src_info = item.get('source', {}) or {}
            src_id = (src_info.get('id') or '').lower() if src_info.get('id') else ''
            src_name = (src_info.get('name') or '').lower() if src_info.get('name') else ''
            cat = (
                NEWSAPI_SOURCE_CATEGORY_MAP.get(src_id)
                or NEWSAPI_SOURCE_CATEGORY_MAP.get(src_name)
                or 'general'
            )
            articles.append({
                "title": item.get('title'),
                "url": item.get('url'),
                "source": "NewsAPI.org",
                "content": item.get('description') or item.get('content'),
                "date": normalize_date(item.get('publishedAt')),
                "category": cat
            })
        return articles
    except Exception:
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

def fetch_from_guardian_window(from_date, to_date, q=None, page_size=50):
    if not GUARDIAN_API_KEY:
        return []
    url = "https://content.guardianapis.com/search"
    params = {
        'api-key': GUARDIAN_API_KEY,
        'page-size': page_size,
        'show-fields': 'trailText,headline',
        'from-date': from_date,
        'to-date': to_date
    }
    if q:
        params['q'] = q
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
    except Exception:
        return []

def fetch_from_dawn(limit=10):
    try:
        url = "https://www.dawn.com/"
        response = requests.get(url, headers=HEADERS, timeout=DEFAULT_TIMEOUT_SECONDS)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, 'html.parser')
        anchors = soup.select('div.tabs__pane#all article.story h2.story__title a.story__link')
        if not anchors:
            anchors = soup.select('article.story h2.story__title a.story__link')
        if not anchors:
            anchors = soup.select('a[href*="/news/"]')
        articles_to_fetch = []
        for a in anchors:
            if len(articles_to_fetch) >= limit:
                break
            href = a.get('href')
            title = a.get_text(strip=True)
            if not href or not title or len(title) < 10:
                continue
            if not href.startswith('http'):
                href = 'https://www.dawn.com' + href
            if 'www.dawn.com/news/' not in href:
                continue
            articles_to_fetch.append({'url': canonicalize_url(href), 'title': title})
        content_selectors = ['.story__content', '.story-content', '.article-content', 'article', '.content']
        articles = []
        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(fetch_article_content, item, HEADERS, content_selectors, "DAWN") for item in articles_to_fetch]
            for f in as_completed(futures):
                try:
                    r = f.result()
                    if r:
                        articles.append(r)
                except Exception:
                    continue
        return articles
    except Exception:
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
def canonicalize_url(url):
    try:
        if not url:
            return url
        p = urlparse(url)
        # strip query and fragment
        path = p.path or ''
        # remove trailing slash
        if path != '/' and path.endswith('/'):
            path = path[:-1]
        # remove AMP suffix
        if path.endswith('/amp'):
            path = path[:-4]
        # reconstruct without params, query, fragment
        canon = urlunparse((p.scheme, p.netloc.lower(), path, '', '', ''))
        return canon
    except Exception:
        return url