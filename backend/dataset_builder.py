#!/usr/bin/env python3
"""
Dataset Builder for News Monitoring Desk
Generates realistic sample data for testing and development
"""

import random
import sys
from datetime import datetime, timedelta
from faker import Faker
import requests
from app import create_app, db
from app.models import User, Article, Trend
from app.services.sentiment import analyze_sentiment

# Initialize Faker for generating realistic data
fake = Faker()

class DatasetBuilder:
    def __init__(self):
        self.app = create_app()
        self.sources = [
            'DAWN', 'Daily Express', 'The Nation', 'Pakistan Times', 'Pakistan Observer', 'Urdu Point'
        ]
        
        self.categories = [
            'Technology', 'Business', 'Politics', 'Health', 'Science',
            'Sports', 'Entertainment', 'World News', 'Economy', 'Environment',
            'Education', 'Crime', 'Weather', 'Travel', 'Food'
        ]
        
        self.sentiment_labels = ['positive', 'negative', 'neutral']
        
        # Pakistani cities and locations
        self.locations = [
            'Islamabad', 'Lahore', 'Karachi', 'Rawalpindi', 'Faisalabad',
            'Multan', 'Peshawar', 'Quetta', 'Sialkot', 'Gujranwala',
            'Hyderabad', 'Sukkur', 'Larkana', 'Nawabshah', 'Mirpur Khas',
            'Rahim Yar Khan', 'Sargodha', 'Bahawalpur', 'Sheikhupura',
            'Jhang', 'Gujrat', 'Kasur', 'Mardan', 'Mingora', 'Nawabshah',
            'Chiniot', 'Kotri', 'Kāmoke', 'Hafizabad', 'Kohat',
            'Jacobabad', 'Shikarpur', 'Muzaffargarh', 'Khanpur', 'Hassan Abdal',
            'Kamalia', 'Tando Adam', 'Jhelum', 'Sahiwal', 'Okara',
            'Wah Cantonment', 'Dera Ghazi Khan', 'Chakwal', 'Gojra', 'Bahawalnagar'
        ]
        
        # Sample trending keywords
        self.trending_keywords = [
            'artificial intelligence', 'climate change', 'cryptocurrency',
            'renewable energy', 'space exploration', 'cybersecurity',
            'quantum computing', 'electric vehicles', 'sustainable living',
            'remote work', 'digital transformation', 'healthcare innovation',
            'financial technology', 'social media', 'data privacy',
            'machine learning', 'blockchain', 'virtual reality',
            'augmented reality', '5G technology', 'smart cities',
            'biotechnology', 'nanotechnology', 'robotics', 'automation'
        ]

    def generate_users(self, count=10):
        """Generate sample users with different roles"""
        print(f"Generating {count} users...")
        
        # Generate secure random passwords
        import secrets
        import string
        
        def generate_secure_password(length=12):
            """Generate a secure random password"""
            alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
            return ''.join(secrets.choice(alphabet) for _ in range(length))
        
        # Create admin user with secure password
        admin_password = generate_secure_password()
        admin = User(
            username='admin',
            email='admin@newsdesk.com',
            role='admin'
        )
        admin.set_password(admin_password)
        print(f"⚠️  SECURITY: Admin password generated: {admin_password}")
        print("⚠️  SECURITY: Save this password securely - it will not be shown again!")
        
        # Create editor user with secure password
        editor_password = generate_secure_password()
        editor = User(
            username='editor',
            email='editor@newsdesk.com',
            role='editor'
        )
        editor.set_password(editor_password)
        print(f"⚠️  SECURITY: Editor password generated: {editor_password}")
        print("⚠️  SECURITY: Save this password securely - it will not be shown again!")
        
        # Create regular users with secure passwords
        users = [admin, editor]
        
        for i in range(count - 2):
            user_password = generate_secure_password()
            user = User(
                username=fake.user_name(),
                email=fake.email(),
                role='user'
            )
            user.set_password(user_password)
            users.append(user)
        
        return users

    def generate_articles(self, count=100):
        """Generate sample news articles"""
        print(f"Generating {count} articles...")
        
        articles = []
        
        # Sample article titles and content templates
        tech_titles = [
            "New AI Breakthrough Promises Revolutionary Changes",
            "Tech Giants Invest Billions in Quantum Computing",
            "Cybersecurity Threats Reach All-Time High",
            "Smartphone Sales Decline for Third Consecutive Quarter",
            "Cloud Computing Market Shows Strong Growth",
            "5G Network Rollout Accelerates Across Major Cities",
            "Electric Vehicle Sales Surge Despite Supply Chain Issues",
            "Social Media Platforms Face Increased Regulation",
            "Data Privacy Laws Impact Tech Industry",
            "Machine Learning Transforms Healthcare Diagnostics"
        ]
        
        business_titles = [
            "Stock Market Reaches New Record High",
            "Central Banks Announce Interest Rate Changes",
            "Global Supply Chain Disruptions Continue",
            "Cryptocurrency Market Shows Volatility",
            "Renewable Energy Investments Surge",
            "E-commerce Growth Slows After Pandemic Boom",
            "Inflation Concerns Impact Consumer Spending",
            "Corporate Earnings Beat Expectations",
            "Trade Wars Affect Global Markets",
            "Startup Funding Reaches Record Levels"
        ]
        
        politics_titles = [
            "New Legislation Aims to Address Climate Crisis",
            "International Summit Addresses Global Challenges",
            "Election Results Show Surprising Outcomes",
            "Policy Changes Impact Healthcare Sector",
            "Diplomatic Relations Improve Between Nations",
            "Government Announces Infrastructure Investment",
            "Public Opinion Shifts on Key Issues",
            "Regulatory Changes Affect Multiple Industries",
            "International Cooperation on Security Issues",
            "Economic Policies Show Mixed Results"
        ]
        
        all_titles = tech_titles + business_titles + politics_titles
        
        for i in range(count):
            # Generate random date within last 365 days (1 year)
            days_ago = random.randint(0, 365)
            article_date = datetime.now() - timedelta(days=days_ago)
            
            # Select random title and generate content
            title = random.choice(all_titles)
            if i < len(all_titles):
                title = all_titles[i]
            
            # Generate realistic content
            content = self.generate_article_content(title)
            
            # Use real sentiment analysis on content
            text_to_analyze = content or title
            sentiment = analyze_sentiment(text_to_analyze)
            sentiment_label = sentiment.get('label').capitalize()
            sentiment_score = sentiment.get('score')
            
            # Select source first, then generate URL
            source = random.choice(self.sources)
            url = self.generate_realistic_url(source, i+1)
            
            article = Article(
                title=title,
                url=url,
                source=source,
                content=content,
                category=random.choice(self.categories),
                location=random.choice(self.locations),
                date=article_date,
                sentiment_label=sentiment_label,
                sentiment_score=sentiment_score
            )
            articles.append(article)
        
        return articles

    def generate_realistic_url(self, source, article_id):
        """Generate realistic URLs based on the news source"""
        # Create URL mappings for Pakistani news sources
        url_templates = {
            'DAWN': f'https://www.dawn.com/news/{article_id}',
            'Daily Express': f'https://www.express.com.pk/story/{article_id}',
            'The Nation': f'https://nation.com.pk/news/{article_id}',
            'Pakistan Times': f'https://pakistantimes.com.pk/news/{article_id}',
            'Pakistan Observer': f'https://pakobserver.net/news/{article_id}',
            'Urdu Point': f'https://www.urdupoint.com/news/{article_id}'
        }
        
        # Return the URL template for the source, or a generic one if not found
        return url_templates.get(source, f'https://news.example.com/article/{article_id}')

    def generate_article_content(self, title):
        """Generate realistic article content based on title"""
        content_templates = {
            'AI': f"""
            {fake.paragraph(nb_sentences=3)}
            
            The breakthrough represents a significant advancement in the field, with experts predicting widespread adoption within the next few years. 
            {fake.paragraph(nb_sentences=2)}
            
            Industry leaders have expressed optimism about the potential applications, while also calling for careful consideration of ethical implications.
            {fake.paragraph(nb_sentences=2)}
            """,
            'Business': f"""
            {fake.paragraph(nb_sentences=3)}
            
            Market analysts suggest this development could have far-reaching implications for the global economy. 
            {fake.paragraph(nb_sentences=2)}
            
            The announcement comes at a time when businesses are adapting to new market conditions and consumer behaviors.
            {fake.paragraph(nb_sentences=2)}
            """,
            'Politics': f"""
            {fake.paragraph(nb_sentences=3)}
            
            The decision has been met with mixed reactions from various stakeholders and interest groups. 
            {fake.paragraph(nb_sentences=2)}
            
            Political observers note that this development could influence upcoming policy discussions and legislative priorities.
            {fake.paragraph(nb_sentences=2)}
            """
        }
        
        # Determine content type based on keywords in title
        if any(keyword in title.lower() for keyword in ['ai', 'technology', 'tech', 'digital', 'cyber']):
            return content_templates['AI']
        elif any(keyword in title.lower() for keyword in ['market', 'business', 'economy', 'financial', 'investment']):
            return content_templates['Business']
        elif any(keyword in title.lower() for keyword in ['government', 'policy', 'legislation', 'political']):
            return content_templates['Politics']
        else:
            return fake.text(max_nb_chars=500)


    def generate_trends(self, count=20):
        """Generate trending topics"""
        print(f"Generating {count} trending topics...")
        
        trends = []
        
        for i in range(count):
            keyword = random.choice(self.trending_keywords)
            # Generate realistic trend scores (higher scores for more popular topics)
            score = random.uniform(0.1, 0.95)
            
            trend = Trend(
                keyword=keyword,
                score=score
            )
            trends.append(trend)
        
        return trends

    def build_dataset(self, users_count=10, articles_count=100, trends_count=20):
        """
        Build complete dataset - SAFE VERSION
        
        This method adds data WITHOUT destroying existing data.
        For destructive operations, use destroy_and_rebuild_dataset().
        """
        print("Building News Monitoring Desk Dataset (SAFE MODE)")
        print("=" * 50)
        
        with self.app.app_context():
            # Check existing data
            existing_users = User.query.count()
            existing_articles = Article.query.count()
            existing_trends = Trend.query.count()
            
            if existing_users > 0 or existing_articles > 0 or existing_trends > 0:
                print(f"⚠️  WARNING: Database contains existing data:")
                print(f"   - {existing_users} users")
                print(f"   - {existing_articles} articles")
                print(f"   - {existing_trends} trends")
                print("   This operation will ADD to existing data, not replace it.")
                print("   Use 'destroy_and_rebuild_dataset()' to clear and rebuild.")
                print()
            
            # Generate new data
            users = self.generate_users(users_count)
            articles = self.generate_articles(articles_count)
            trends = self.generate_trends(trends_count)
            
            # Add to database
            print("Saving to database...")
            
            for user in users:
                db.session.add(user)
            
            for article in articles:
                db.session.add(article)
            
            for trend in trends:
                db.session.add(trend)
            
            db.session.commit()
            
            print("Dataset built successfully!")
            print(f"   - {len(users)} users added")
            print(f"   - {len(articles)} articles added")
            print(f"   - {len(trends)} trends added")
    
    def destroy_and_rebuild_dataset(self, users_count=10, articles_count=100, trends_count=20, force=False):
        """
        DESTRUCTIVE OPERATION: Clear all data and rebuild
        
        This method will PERMANENTLY DELETE all existing data.
        Use with extreme caution!
        """
        print("🚨 DESTRUCTIVE OPERATION: Destroy and Rebuild Dataset")
        print("=" * 60)
        print("⚠️  WARNING: This will PERMANENTLY DELETE all existing data!")
        print("⚠️  This includes ALL users, articles, and trends!")
        print("⚠️  This action cannot be undone!")
        print()
        
        with self.app.app_context():
            # Show what will be deleted
            existing_users = User.query.count()
            existing_articles = Article.query.count()
            existing_trends = Trend.query.count()
            
            print(f"Data to be DELETED:")
            print(f"   - {existing_users} users")
            print(f"   - {existing_articles} articles")
            print(f"   - {existing_trends} trends")
            print()
            
            # Require --force flag for safety
            if not force:
                print("❌ DESTRUCTIVE OPERATION BLOCKED!")
                print("   This operation requires the --force flag to proceed.")
                print("   Usage: python dataset_builder.py destroy-and-rebuild --force")
                print("   This prevents accidental data loss in scripts and automation.")
                return
            
            print("🗑️  Deleting all existing data...")
            Article.query.delete()
            Trend.query.delete()
            User.query.delete()
            db.session.commit()
            
            print("✅ All existing data deleted.")
            print()
            
            # Generate new data
            users = self.generate_users(users_count)
            articles = self.generate_articles(articles_count)
            trends = self.generate_trends(trends_count)
            
            # Add to database
            print("Saving new data to database...")
            
            for user in users:
                db.session.add(user)
            
            for article in articles:
                db.session.add(article)
            
            for trend in trends:
                db.session.add(trend)
            
            db.session.commit()
            
            print("✅ Dataset rebuilt successfully!")
            print(f"   - {len(users)} users created")
            print(f"   - {len(articles)} articles created")
            print(f"   - {len(trends)} trends created")

    def show_dataset_stats(self):
        """Show statistics about the generated dataset"""
        with self.app.app_context():
            print("\nDataset Statistics:")
            print("-" * 30)
            
            # User stats
            total_users = User.query.count()
            admin_count = User.query.filter_by(role='admin').count()
            editor_count = User.query.filter_by(role='editor').count()
            user_count = User.query.filter_by(role='user').count()
            
            print(f"Users: {total_users}")
            print(f"  - Admins: {admin_count}")
            print(f"  - Editors: {editor_count}")
            print(f"  - Regular Users: {user_count}")
            
            # Article stats
            total_articles = Article.query.count()
            print(f"\nArticles: {total_articles}")
            
            # Articles by source
            from sqlalchemy import func
            sources = db.session.query(
                Article.source,
                func.count(Article.id).label('count')
            ).group_by(Article.source).all()
            
            print("  Top sources:")
            for source, count in sources[:5]:
                print(f"    - {source}: {count}")
            
            # Articles by sentiment
            sentiments = db.session.query(
                Article.sentiment_label,
                func.count(Article.id).label('count')
            ).group_by(Article.sentiment_label).all()
            
            print("  Sentiment distribution:")
            for sentiment, count in sentiments:
                print(f"    - {sentiment}: {count}")
            
            # Trend stats
            total_trends = Trend.query.count()
            top_trend = Trend.query.order_by(Trend.score.desc()).first()
            
            print(f"\nTrends: {total_trends}")
            if top_trend:
                print(f"  Top trend: {top_trend.keyword} ({top_trend.score:.2f})")

def main():
    """Main function"""
    if len(sys.argv) < 2:
        print("Dataset Builder for News Monitoring Desk")
        print("=" * 50)
        print("Usage:")
        print("  python dataset_builder.py build [users] [articles] [trends]     # SAFE: Add data without deleting")
        print("  python dataset_builder.py destroy-and-rebuild --force [users] [articles] [trends]  # DESTRUCTIVE: Clear all data")
        print("  python dataset_builder.py stats")
        print("  python dataset_builder.py help")
        print("\nExamples:")
        print("  python dataset_builder.py build                    # Default: 10 users, 100 articles, 20 trends")
        print("  python dataset_builder.py build 5 50 10           # Custom counts")
        print("  python dataset_builder.py destroy-and-rebuild --force    # ⚠️  DESTRUCTIVE: Clear all data first")
        print("  python dataset_builder.py stats                   # Show dataset statistics")
        print("\n⚠️  WARNING: 'destroy-and-rebuild' requires --force flag and will PERMANENTLY DELETE all existing data!")
        return
    
    command = sys.argv[1].lower()
    builder = DatasetBuilder()
    
    if command == "build":
        # Parse optional parameters
        users_count = int(sys.argv[2]) if len(sys.argv) > 2 else 10
        articles_count = int(sys.argv[3]) if len(sys.argv) > 3 else 100
        trends_count = int(sys.argv[4]) if len(sys.argv) > 4 else 20
        
        builder.build_dataset(users_count, articles_count, trends_count)
        builder.show_dataset_stats()
    
    elif command == "destroy-and-rebuild":
        # Check for --force flag
        force_flag = "--force" in sys.argv
        
        # Parse optional parameters (skip --force flag when parsing numbers)
        args = [arg for arg in sys.argv[2:] if arg != "--force"]
        users_count = int(args[0]) if len(args) > 0 else 10
        articles_count = int(args[1]) if len(args) > 1 else 100
        trends_count = int(args[2]) if len(args) > 2 else 20
        
        builder.destroy_and_rebuild_dataset(users_count, articles_count, trends_count, force=force_flag)
        builder.show_dataset_stats()
        
    elif command == "stats":
        builder.show_dataset_stats()
        
    elif command == "help":
        print("Dataset Builder for News Monitoring Desk")
        print("=" * 50)
        print("This tool generates realistic sample data for your News Monitoring Desk project.")
        print("\nCommands:")
        print("  build [users] [articles] [trends] - Generate dataset with specified counts")
        print("  destroy-and-rebuild --force [users] [articles] [trends] - DESTRUCTIVE: Clear all data and rebuild")
        print("  stats                              - Show current dataset statistics")
        print("  help                               - Show this help message")
        print("\nThe generated data includes:")
        print("  - Sample users with different roles (admin, editor, user)")
        print("  - Realistic news articles with various sources and categories")
        print("  - Trending topics with realistic scores")
        print("  - Sentiment analysis data for articles")
        print("\nSecurity Features:")
        print("  - All passwords are generated securely using cryptographically secure random generation")
        print("  - Passwords are displayed once and must be saved immediately")
        print("  - Destructive operations require explicit --force flag to prevent accidents")
        
    else:
        print(f"Unknown command: {command}")
        print("Use 'python dataset_builder.py help' for usage information")

if __name__ == "__main__":
    main()
