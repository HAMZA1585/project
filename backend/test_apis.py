#!/usr/bin/env python3
"""
Test script to check API functionality and status
"""
from dotenv import load_dotenv
load_dotenv()
import os
import sys
import requests
from datetime import datetime

# Add the app directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

def test_api_keys():
    """Test if API keys are configured"""
    print("=== API Key Configuration ===")
    news_api_key = os.getenv('NEWS_API_KEY')
    currents_api_key = os.getenv('CURRENTS_API_KEY')
    guardian_api_key = os.getenv('GUARDIAN_API_KEY')
    
    print(f"NEWS_API_KEY: {'✓ SET' if news_api_key else '✗ NOT SET'}")
    print(f"CURRENTS_API_KEY: {'✓ SET' if currents_api_key else '✗ NOT SET'}")
    print(f"GUARDIAN_API_KEY: {'✓ SET' if guardian_api_key else '✗ NOT SET'}")
    
    return {
        'news_api': bool(news_api_key),
        'currents_api': bool(currents_api_key),
        'guardian_api': bool(guardian_api_key)
    }

def test_news_api():
    """Test NewsAPI.org"""
    print("\n=== Testing NewsAPI.org ===")
    api_key = os.getenv('NEWS_API_KEY')
    if not api_key:
        print("✗ API key not configured")
        return False
    
    try:
        url = "https://newsapi.org/v2/top-headlines"
        params = {'country': 'us', 'pageSize': 1, 'apiKey': api_key}
        response = requests.get(url, params=params, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ API working - Status: {response.status_code}")
            print(f"  Total articles available: {data.get('totalResults', 'Unknown')}")
            return True
        elif response.status_code == 401:
            print("✗ API key invalid or expired")
            return False
        elif response.status_code == 429:
            print("✗ API rate limit exceeded")
            return False
        else:
            print(f"✗ API error - Status: {response.status_code}")
            print(f"  Response: {response.text[:200]}")
            return False
    except requests.RequestException as e:
        print(f"✗ Network error: {str(e)}")
        return False

def test_currents_api():
    """Test CurrentsAPI"""
    print("\n=== Testing CurrentsAPI ===")
    api_key = os.getenv('CURRENTS_API_KEY')
    if not api_key:
        print("✗ API key not configured")
        return False
    
    try:
        url = "https://api.currentsapi.services/v1/latest-news"
        params = {'language': 'en', 'limit': 1}
        headers = {'Authorization': api_key}
        response = requests.get(url, params=params, headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ API working - Status: {response.status_code}")
            print(f"  News count: {len(data.get('news', []))}")
            return True
        elif response.status_code == 401:
            print("✗ API key invalid or expired")
            return False
        elif response.status_code == 429:
            print("✗ API rate limit exceeded")
            return False
        else:
            print(f"✗ API error - Status: {response.status_code}")
            print(f"  Response: {response.text[:200]}")
            return False
    except requests.RequestException as e:
        print(f"✗ Network error: {str(e)}")
        return False

def test_guardian_api():
    """Test The Guardian API"""
    print("\n=== Testing The Guardian API ===")
    api_key = os.getenv('GUARDIAN_API_KEY')
    if not api_key:
        print("✗ API key not configured")
        return False
    
    try:
        url = "https://content.guardianapis.com/search"
        params = {'api-key': api_key, 'page-size': 1, 'show-fields': 'trailText,headline'}
        response = requests.get(url, params=params, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ API working - Status: {response.status_code}")
            results = data.get('response', {}).get('results', [])
            print(f"  Articles available: {len(results)}")
            return True
        elif response.status_code == 401:
            print("✗ API key invalid or expired")
            return False
        elif response.status_code == 429:
            print("✗ API rate limit exceeded")
            return False
        else:
            print(f"✗ API error - Status: {response.status_code}")
            print(f"  Response: {response.text[:200]}")
            return False
    except requests.RequestException as e:
        print(f"✗ Network error: {str(e)}")
        return False

def test_internal_apis():
    """Test internal API endpoints"""
    print("\n=== Testing Internal APIs ===")
    try:
        from app.services.scraper import get_news_from_sources
        result = get_news_from_sources()
        print(f"✓ Internal scraper working - {len(result)} sources")
        for source, articles in result.items():
            print(f"  {source}: {len(articles)} articles")
        return True
    except Exception as e:
        print(f"✗ Internal API error: {str(e)}")
        return False

def main():
    print("News Monitoring Desk - API Status Check")
    print("=" * 50)
    print(f"Test run at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Test API key configuration
    key_status = test_api_keys()
    
    # Test external APIs
    news_api_ok = test_news_api()
    currents_api_ok = test_currents_api()
    guardian_api_ok = test_guardian_api()
    
    # Test internal APIs
    internal_api_ok = test_internal_apis()
    
    # Summary
    print("\n" + "=" * 50)
    print("SUMMARY:")
    print(f"API Keys Configured: {sum(key_status.values())}/3")
    print(f"External APIs Working: {sum([news_api_ok, currents_api_ok, guardian_api_ok])}/3")
    print(f"Internal APIs Working: {'✓' if internal_api_ok else '✗'}")
    
    if not any(key_status.values()):
        print("\n⚠️  WARNING: No API keys are configured!")
        print("   You need to set environment variables:")
        print("   - NEWS_API_KEY")
        print("   - CURRENTS_API_KEY") 
        print("   - GUARDIAN_API_KEY")
    
    if not any([news_api_ok, currents_api_ok, guardian_api_ok]):
        print("\n⚠️  WARNING: No external APIs are working!")
        print("   Check your API keys and internet connection.")

if __name__ == "__main__":
    main()
