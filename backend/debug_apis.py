#!/usr/bin/env python3
import os
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.services.scraper import get_news_from_sources

print("Testing scraper without API keys...")
result = get_news_from_sources()

print(f"Number of sources: {len(result)}")
for source, articles in result.items():
    print(f"\n{source}: {len(articles)} articles")
    if articles:
        print(f"  Sample title: {articles[0].get('title', 'No title')}")
        print(f"  Sample URL: {articles[0].get('url', 'No URL')}")
        print(f"  Sample date: {articles[0].get('date', 'No date')}")
