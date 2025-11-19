import sys
import os
from datetime import datetime
from sqlalchemy import func, or_
from app import create_app, db
from app.models import Article
from app.tasks import analyze_article_sentiment_task

def fix_sentiment_data():
    """
    1. Normalizes existing inconsistent sentiment labels (e.g., 'Positive' -> 'positive').
    2. Queues sentiment analysis for articles missing a label (label is None).
    """
    app = create_app()
    with app.app_context():
        print("--- Starting Sentiment Data Fix ---")

        # --- 1. Normalize Inconsistent Labels ('Positive', 'Negative', 'Neutral') ---
        try:
            # We use func.lower() to convert any uppercase labels to lowercase directly in the DB
            normalized_count = db.session.query(Article).filter(
                Article.sentiment_label.in_(['Positive', 'Negative', 'Neutral'])
            ).update({
                Article.sentiment_label: func.lower(Article.sentiment_label)
            }, synchronize_session=False)  # Important for batch update speed
            db.session.commit()
            print(f"✅ Normalized {normalized_count} inconsistent sentiment labels (Positive/Negative/Neutral -> positive/negative/neutral).")

        except Exception as e:
            db.session.rollback()
            print(f"❌ Error during label normalization: {e}")
            return

        # --- 2. Queue Analysis for Missing Data (sentiment_label is None) ---
        missing_articles = Article.query.filter(
            or_(Article.sentiment_label.is_(None), Article.sentiment_label == '')
        ).all()

        queued_count = 0

        for article in missing_articles:
            try:
                analyze_article_sentiment_task.queue(article.id)
                queued_count += 1
            except Exception as e:
                try:
                    result = analyze_article_sentiment_task(article.id)
                    if isinstance(result, dict) and result.get('status') == 'completed':
                        print(f"🔧 Processed inline article {article.id}: {result.get('sentiment_label')} {result.get('sentiment_score')}")
                    else:
                        print(f"⚠️ Inline processing skipped for article {article.id}")
                except Exception as inner:
                    print(f"❌ Failed to process article {article.id} inline: {inner}")

        print(f"✅ Queued sentiment analysis for {queued_count} articles missing data (Needs RQ workers running).")

        print("--- Sentiment Data Fix Complete ---")
        if queued_count > 0:
            print("NOTE: You must run RQ workers in a separate terminal for analysis to complete.")

if __name__ == '__main__':
    fix_sentiment_data()