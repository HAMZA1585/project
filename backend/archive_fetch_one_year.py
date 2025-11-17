import os
from datetime import datetime, timedelta
from app import create_app
from app.tasks import upsert_articles_task
from app.services.scraper import http_get, normalize_date

def fetch_newsapi_day(date_str, pages=4, page_size=50, q=None):
    api_key = os.getenv('NEWS_API_KEY')
    if not api_key:
        return []
    url = "https://newsapi.org/v2/everything"
    headers = {'X-Api-Key': api_key}
    results = []
    for page in range(1, pages + 1):
        params = {
            'from': date_str,
            'to': date_str,
            'pageSize': page_size,
            'language': 'en',
            'sortBy': 'publishedAt',
            'page': page
        }
        if q:
            params['q'] = q
        try:
            data = http_get(url, params=params, headers=headers)
        except Exception:
            data = {}
        for item in data.get('articles', []):
            results.append({
                'title': item.get('title'),
                'url': item.get('url'),
                'source': 'NewsAPI.org',
                'content': item.get('description') or item.get('content'),
                'date': normalize_date(item.get('publishedAt')),
                'category': None
            })
    return results

def fetch_guardian_day(date_str, pages=4, page_size=50, q=None):
    api_key = os.getenv('GUARDIAN_API_KEY')
    if not api_key:
        return []
    url = "https://content.guardianapis.com/search"
    results = []
    for page in range(1, pages + 1):
        params = {
            'api-key': api_key,
            'page-size': page_size,
            'show-fields': 'trailText,headline',
            'from-date': date_str,
            'to-date': date_str,
            'page': page
        }
        if q:
            params['q'] = q
        try:
            data = http_get(url, params=params)
        except Exception:
            data = {}
        for item in data.get('response', {}).get('results', []):
            fields = item.get('fields', {}) or {}
            results.append({
                'title': fields.get('headline'),
                'url': item.get('webUrl'),
                'source': 'The Guardian',
                'content': fields.get('trailText'),
                'date': normalize_date(item.get('webPublicationDate')),
                'category': item.get('sectionName')
            })
    return results

def collect_one_year_old(target_date_iso, min_count=200):
    collected = {}
    def add_many(items):
        for it in items:
            url = it.get('url')
            if not url:
                continue
            collected[url] = it
    add_many(fetch_newsapi_day(target_date_iso, pages=4, page_size=50))
    add_many(fetch_guardian_day(target_date_iso, pages=4, page_size=50))
    if len(collected) >= min_count:
        return list(collected.values())
    base = datetime.fromisoformat(target_date_iso)
    offsets = [1, -1, 2, -2, 3, -3, 4, -4, 5, -5]
    for off in offsets:
        d = (base + timedelta(days=off)).date().isoformat()
        add_many(fetch_newsapi_day(d, pages=3, page_size=50))
        add_many(fetch_guardian_day(d, pages=3, page_size=50))
        if len(collected) >= min_count:
            break
    return list(collected.values())

def main():
    app = create_app()
    with app.app_context():
        target_day = (datetime.now() - timedelta(days=365)).date().isoformat()
        batch = collect_one_year_old(target_day, min_count=200)
        if not batch:
            print("No articles collected; ensure API keys are set.")
            return
        result = upsert_articles_task(batch)
        inserted = result.get('inserted', 0) if isinstance(result, dict) else 0
        print(f"Collected {len(batch)} articles. Inserted {inserted} into archive.")

if __name__ == '__main__':
    main()