#!/usr/bin/env python3
"""
Database Management Script for News Monitoring Desk
Provides easy commands for database operations
"""

import sys
from app import create_app, db
from app.models import User, Article, Trend

def show_help():
    """Show available commands"""
    print("🗄️  Database Manager for News Monitoring Desk")
    print("=" * 50)
    print("Available commands:")
    print("  python db_manager.py status     - Show database status")
    print("  python db_manager.py users      - List all users")
    print("  python db_manager.py articles   - List all articles")
    print("  python db_manager.py trends     - List all trends")
    print("  python db_manager.py stats      - Show statistics")
    print("  python db_manager.py fix_sentiment - Normalize and re-queue sentiment analysis")
    print("  python db_manager.py reset      - Reset database (WARNING: deletes all data)")
    print("  python db_manager.py backup     - Create backup")
    print("  python db_manager.py help       - Show this help")

def show_status():
    """Show database status"""
    app = create_app()
    with app.app_context():
        print("📊 Database Status:")
        print("-" * 30)
        print(f"   Users: {User.query.count()}")
        print(f"   Articles: {Article.query.count()}")
        print(f"   Trends: {Trend.query.count()}")
        print(f"   Database file: instance/site.db")

def list_users():
    """List all users"""
    app = create_app()
    with app.app_context():
        print("👥 Users:")
        print("-" * 30)
        for user in User.query.all():
            print(f"   {user.id}: {user.username} ({user.role}) - {user.email}")

def list_articles():
    """List all articles"""
    app = create_app()
    with app.app_context():
        print("📰 Articles:")
        print("-" * 30)
        for article in Article.query.limit(10).all():
            print(f"   {article.id}: {article.title[:50]}... ({article.source})")

def list_trends():
    """List all trends"""
    app = create_app()
    with app.app_context():
        print("🔥 Trends:")
        print("-" * 30)
        for trend in Trend.query.order_by(Trend.score.desc()).all():
            print(f"   {trend.keyword}: {trend.score:.2f}")

def show_stats():
    """Show detailed statistics"""
    app = create_app()
    with app.app_context():
        from sqlalchemy import func
        from datetime import datetime, timedelta
        
        print("📈 Detailed Statistics:")
        print("-" * 30)
        
        # User stats
        print(f"   Total Users: {User.query.count()}")
        admin_count = User.query.filter_by(role="admin").count()
        editor_count = User.query.filter_by(role="editor").count()
        user_count = User.query.filter_by(role="user").count()
        print(f"     - Admins: {admin_count}")
        print(f"     - Editors: {editor_count}")
        print(f"     - Users: {user_count}")
        
        # Article stats
        print(f"\n   Total Articles: {Article.query.count()}")
        
        # Articles by source
        sources = db.session.query(
            Article.source,
            func.count(Article.id).label('count')
        ).group_by(Article.source).all()
        
        print("     Articles by source:")
        for source, count in sources:
            print(f"       - {source}: {count}")
        
        # Articles by sentiment
        sentiments = db.session.query(
            Article.sentiment_label,
            func.count(Article.id).label('count')
        ).group_by(Article.sentiment_label).all()
        
        print("     Articles by sentiment:")
        for sentiment, count in sentiments:
            print(f"       - {sentiment}: {count}")
        
        # Recent articles
        week_ago = datetime.now() - timedelta(days=7)
        recent_count = Article.query.filter(Article.date >= week_ago).count()
        print(f"     Recent articles (7 days): {recent_count}")
        
        # Trend stats
        print(f"\n   Total Trends: {Trend.query.count()}")
        top_trend = Trend.query.order_by(Trend.score.desc()).first()
        if top_trend:
            print(f"     Top trend: {top_trend.keyword} ({top_trend.score:.2f})")

def reset_database():
    """Reset database (WARNING: deletes all data)"""
    print("⚠️  WARNING: This will delete ALL data!")
    confirm = input("Type 'DELETE' to confirm: ")
    
    if confirm == "DELETE":
        app = create_app()
        with app.app_context():
            print("🗑️  Deleting all data...")
            Article.query.delete()
            Trend.query.delete()
            User.query.delete()
            db.session.commit()
            print("✅ Database reset completed!")
    else:
        print("❌ Operation cancelled.")

def create_backup():
    """Create database backup"""
    import shutil
    from datetime import datetime
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = f"backup_site_{timestamp}.db"
    
    try:
        shutil.copy2("instance/site.db", backup_file)
        print(f"✅ Backup created: {backup_file}")
    except Exception as e:
        print(f"❌ Backup failed: {e}")

def main():
    """Main function"""
    if len(sys.argv) < 2:
        show_help()
        return
    
    command = sys.argv[1].lower()
    
    if command == "status":
        show_status()
    elif command == "users":
        list_users()
    elif command == "articles":
        list_articles()
    elif command == "trends":
        list_trends()
    elif command == "stats":
        show_stats()
    elif command == "fix_sentiment":
        from fix_db_data import fix_sentiment_data
        fix_sentiment_data()
    elif command == "reset":
        reset_database()
    elif command == "backup":
        create_backup()
    elif command == "help":
        show_help()
    else:
        print(f"❌ Unknown command: {command}")
        show_help()

if __name__ == "__main__":
    main()

