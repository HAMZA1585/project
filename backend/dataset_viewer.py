#!/usr/bin/env python3
"""
Dataset Viewer for News Monitoring Desk
Provides various ways to view and explore the generated datasets
"""

import sys
import json
import csv
from datetime import datetime
from app import create_app, db
from app.models import User, Article, Trend

class DatasetViewer:
    def __init__(self):
        self.app = create_app()

    def show_help(self):
        """Show available commands"""
        print("📊 Dataset Viewer for News Monitoring Desk")
        print("=" * 50)
        print("Available commands:")
        print("  python dataset_viewer.py overview     - Show dataset overview")
        print("  python dataset_viewer.py users        - List all users")
        print("  python dataset_viewer.py articles     - List articles with details")
        print("  python dataset_viewer.py trends       - Show trending topics")
        print("  python dataset_viewer.py sentiment    - Show sentiment analysis")
        print("  python dataset_viewer.py sources      - Show articles by source")
        print("  python dataset_viewer.py categories   - Show articles by category")
        print("  python dataset_viewer.py recent        - Show recent articles")
        print("  python dataset_viewer.py export csv   - Export to CSV")
        print("  python dataset_viewer.py export json  - Export to JSON")
        print("  python dataset_viewer.py search [term] - Search articles")
        print("  python dataset_viewer.py help          - Show this help")

    def show_overview(self):
        """Show comprehensive dataset overview"""
        with self.app.app_context():
            print("📈 Dataset Overview")
            print("=" * 50)
            
            # Basic counts
            total_users = User.query.count()
            total_articles = Article.query.count()
            total_trends = Trend.query.count()
            
            print(f"📊 Total Records:")
            print(f"   Users: {total_users}")
            print(f"   Articles: {total_articles}")
            print(f"   Trends: {total_trends}")
            
            # User breakdown
            admin_count = User.query.filter_by(role='admin').count()
            editor_count = User.query.filter_by(role='editor').count()
            user_count = User.query.filter_by(role='user').count()
            
            print(f"\n👥 Users by Role:")
            print(f"   Admins: {admin_count}")
            print(f"   Editors: {editor_count}")
            print(f"   Regular Users: {user_count}")
            
            # Article breakdown
            from sqlalchemy import func
            sources = db.session.query(
                Article.source,
                func.count(Article.id).label('count')
            ).group_by(Article.source).order_by(func.count(Article.id).desc()).all()
            
            print(f"\n📰 Top News Sources:")
            for source, count in sources[:5]:
                print(f"   {source}: {count} articles")
            
            # Sentiment breakdown
            sentiments = db.session.query(
                Article.sentiment_label,
                func.count(Article.id).label('count')
            ).group_by(Article.sentiment_label).all()
            
            print(f"\n😊 Sentiment Distribution:")
            for sentiment, count in sentiments:
                print(f"   {sentiment}: {count} articles")
            
            # Recent articles
            from datetime import datetime, timedelta
            week_ago = datetime.now() - timedelta(days=7)
            recent_count = Article.query.filter(Article.date >= week_ago).count()
            
            print(f"\n⏰ Recent Activity:")
            print(f"   Articles in last 7 days: {recent_count}")
            
            # Top trends
            top_trends = Trend.query.order_by(Trend.score.desc()).limit(5).all()
            print(f"\n🔥 Top Trending Topics:")
            for trend in top_trends:
                print(f"   {trend.keyword}: {trend.score:.2f}")

    def show_users(self):
        """Show all users with details"""
        with self.app.app_context():
            print("👥 Users")
            print("=" * 50)
            
            users = User.query.all()
            for user in users:
                print(f"ID: {user.id}")
                print(f"Username: {user.username}")
                print(f"Email: {user.email}")
                print(f"Role: {user.role}")
                print("-" * 30)

    def show_articles(self, limit=10):
        """Show articles with details"""
        with self.app.app_context():
            print("📰 Articles")
            print("=" * 50)
            
            articles = Article.query.order_by(Article.date.desc()).limit(limit).all()
            
            for article in articles:
                print(f"ID: {article.id}")
                print(f"Title: {article.title}")
                print(f"Source: {article.source}")
                print(f"Category: {article.category}")
                print(f"Date: {article.date.strftime('%Y-%m-%d %H:%M') if article.date else 'N/A'}")
                print(f"Sentiment: {article.sentiment_label} ({article.sentiment_score:.2f})")
                print(f"URL: {article.url}")
                print(f"Content Preview: {article.content[:100]}..." if article.content else "No content")
                print("-" * 50)

    def show_trends(self):
        """Show trending topics"""
        with self.app.app_context():
            print("🔥 Trending Topics")
            print("=" * 50)
            
            trends = Trend.query.order_by(Trend.score.desc()).all()
            
            for i, trend in enumerate(trends, 1):
                print(f"{i:2d}. {trend.keyword:<25} Score: {trend.score:.2f}")

    def show_sentiment(self):
        """Show sentiment analysis details"""
        with self.app.app_context():
            print("😊 Sentiment Analysis")
            print("=" * 50)
            
            from sqlalchemy import func
            
            # Sentiment distribution
            sentiments = db.session.query(
                Article.sentiment_label,
                func.count(Article.id).label('count'),
                func.avg(Article.sentiment_score).label('avg_score')
            ).group_by(Article.sentiment_label).all()
            
            for sentiment, count, avg_score in sentiments:
                print(f"{sentiment.capitalize():<10}: {count:3d} articles (avg score: {avg_score:.2f})")
            
            # Most positive articles
            print(f"\n😊 Most Positive Articles:")
            positive_articles = Article.query.filter(
                Article.sentiment_label == 'positive'
            ).order_by(Article.sentiment_score.desc()).limit(3).all()
            
            for article in positive_articles:
                print(f"   {article.title[:50]}... (Score: {article.sentiment_score:.2f})")
            
            # Most negative articles
            print(f"\n😞 Most Negative Articles:")
            negative_articles = Article.query.filter(
                Article.sentiment_label == 'negative'
            ).order_by(Article.sentiment_score.asc()).limit(3).all()
            
            for article in negative_articles:
                print(f"   {article.title[:50]}... (Score: {article.sentiment_score:.2f})")

    def show_sources(self):
        """Show articles grouped by source"""
        with self.app.app_context():
            print("📰 Articles by Source")
            print("=" * 50)
            
            from sqlalchemy import func
            
            sources = db.session.query(
                Article.source,
                func.count(Article.id).label('count')
            ).group_by(Article.source).order_by(func.count(Article.id).desc()).all()
            
            for source, count in sources:
                print(f"{source:<25}: {count:3d} articles")

    def show_categories(self):
        """Show articles grouped by category"""
        with self.app.app_context():
            print("📂 Articles by Category")
            print("=" * 50)
            
            from sqlalchemy import func
            
            categories = db.session.query(
                Article.category,
                func.count(Article.id).label('count')
            ).group_by(Article.category).order_by(func.count(Article.id).desc()).all()
            
            for category, count in categories:
                print(f"{category:<20}: {count:3d} articles")

    def show_recent(self, days=7):
        """Show recent articles"""
        with self.app.app_context():
            print(f"⏰ Recent Articles (Last {days} days)")
            print("=" * 50)
            
            from datetime import datetime, timedelta
            cutoff_date = datetime.now() - timedelta(days=days)
            
            articles = Article.query.filter(
                Article.date >= cutoff_date
            ).order_by(Article.date.desc()).all()
            
            for article in articles:
                print(f"Date: {article.date.strftime('%Y-%m-%d %H:%M') if article.date else 'N/A'}")
                print(f"Title: {article.title}")
                print(f"Source: {article.source}")
                print(f"Sentiment: {article.sentiment_label}")
                print("-" * 30)

    def search_articles(self, search_term):
        """Search articles by title or content"""
        with self.app.app_context():
            print(f"🔍 Search Results for: '{search_term}'")
            print("=" * 50)
            
            articles = Article.query.filter(
                Article.title.contains(search_term) | 
                Article.content.contains(search_term)
            ).all()
            
            if not articles:
                print("No articles found matching your search term.")
                return
            
            for article in articles:
                print(f"Title: {article.title}")
                print(f"Source: {article.source}")
                print(f"Date: {article.date.strftime('%Y-%m-%d') if article.date else 'N/A'}")
                print(f"Sentiment: {article.sentiment_label}")
                print("-" * 30)

    def export_csv(self):
        """Export dataset to CSV files"""
        with self.app.app_context():
            print("📁 Exporting to CSV files...")
            
            # Export articles
            articles = Article.query.all()
            with open('dataset_articles.csv', 'w', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                writer.writerow(['ID', 'Title', 'Source', 'Category', 'Date', 'Sentiment_Label', 'Sentiment_Score', 'URL', 'Content'])
                
                for article in articles:
                    writer.writerow([
                        article.id,
                        article.title,
                        article.source,
                        article.category,
                        article.date.strftime('%Y-%m-%d %H:%M') if article.date else '',
                        article.sentiment_label,
                        article.sentiment_score,
                        article.url,
                        article.content
                    ])
            
            # Export users
            users = User.query.all()
            with open('dataset_users.csv', 'w', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                writer.writerow(['ID', 'Username', 'Email', 'Role'])
                
                for user in users:
                    writer.writerow([user.id, user.username, user.email, user.role])
            
            # Export trends
            trends = Trend.query.all()
            with open('dataset_trends.csv', 'w', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                writer.writerow(['ID', 'Keyword', 'Score', 'Created_At'])
                
                for trend in trends:
                    writer.writerow([trend.id, trend.keyword, trend.score, trend.created_at])
            
            print("✅ CSV files exported:")
            print("   - dataset_articles.csv")
            print("   - dataset_users.csv")
            print("   - dataset_trends.csv")

    def export_json(self):
        """Export dataset to JSON file"""
        with self.app.app_context():
            print("📁 Exporting to JSON file...")
            
            data = {
                'export_date': datetime.now().isoformat(),
                'users': [],
                'articles': [],
                'trends': []
            }
            
            # Export users
            users = User.query.all()
            for user in users:
                data['users'].append({
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'role': user.role
                })
            
            # Export articles
            articles = Article.query.all()
            for article in articles:
                data['articles'].append({
                    'id': article.id,
                    'title': article.title,
                    'source': article.source,
                    'category': article.category,
                    'date': article.date.isoformat() if article.date else None,
                    'sentiment_label': article.sentiment_label,
                    'sentiment_score': article.sentiment_score,
                    'url': article.url,
                    'content': article.content
                })
            
            # Export trends
            trends = Trend.query.all()
            for trend in trends:
                data['trends'].append({
                    'id': trend.id,
                    'keyword': trend.keyword,
                    'score': trend.score,
                    'created_at': trend.created_at.isoformat() if trend.created_at else None
                })
            
            with open('dataset_export.json', 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            
            print("✅ JSON file exported: dataset_export.json")

def main():
    """Main function"""
    if len(sys.argv) < 2:
        DatasetViewer().show_help()
        return
    
    viewer = DatasetViewer()
    command = sys.argv[1].lower()
    
    if command == "overview":
        viewer.show_overview()
    elif command == "users":
        viewer.show_users()
    elif command == "articles":
        viewer.show_articles()
    elif command == "trends":
        viewer.show_trends()
    elif command == "sentiment":
        viewer.show_sentiment()
    elif command == "sources":
        viewer.show_sources()
    elif command == "categories":
        viewer.show_categories()
    elif command == "recent":
        viewer.show_recent()
    elif command == "export":
        if len(sys.argv) > 2 and sys.argv[2].lower() == "csv":
            viewer.export_csv()
        elif len(sys.argv) > 2 and sys.argv[2].lower() == "json":
            viewer.export_json()
        else:
            print("❌ Please specify format: csv or json")
    elif command == "search":
        if len(sys.argv) > 2:
            search_term = ' '.join(sys.argv[2:])
            viewer.search_articles(search_term)
        else:
            print("❌ Please provide a search term")
    elif command == "help":
        viewer.show_help()
    else:
        print(f"❌ Unknown command: {command}")
        viewer.show_help()

if __name__ == "__main__":
    main()
