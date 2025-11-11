"""Create FTS5 virtual table for efficient full-text search

Revision ID: create_fts5_table
Revises: c27eb0aac537
Create Date: 2024-01-01 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'create_fts5_table'
down_revision = 'c27eb0aac537'
branch_labels = None
depends_on = None


def upgrade():
    """Create FTS5 virtual table for full-text search"""
    
    # Create FTS5 virtual table for articles
    op.execute(text("""
        CREATE VIRTUAL TABLE articles_fts USING fts5(
            title,
            content,
            content='articles',
            content_rowid='id'
        )
    """))
    
    # Create trigger to automatically update FTS5 table when articles are inserted
    op.execute(text("""
        CREATE TRIGGER articles_ai AFTER INSERT ON articles BEGIN
            INSERT INTO articles_fts(rowid, title, content) 
            VALUES (new.id, new.title, new.content);
        END
    """))
    
    # Create trigger to automatically update FTS5 table when articles are updated
    op.execute(text("""
        CREATE TRIGGER articles_au AFTER UPDATE ON articles BEGIN
            UPDATE articles_fts SET title = new.title, content = new.content 
            WHERE rowid = new.id;
        END
    """))
    
    # Create trigger to automatically update FTS5 table when articles are deleted
    op.execute(text("""
        CREATE TRIGGER articles_ad AFTER DELETE ON articles BEGIN
            DELETE FROM articles_fts WHERE rowid = old.id;
        END
    """))
    
    # Populate FTS5 table with existing data
    op.execute(text("""
        INSERT INTO articles_fts(rowid, title, content)
        SELECT id, title, content FROM articles
    """))


def downgrade():
    """Remove FTS5 virtual table and triggers"""
    
    # Drop triggers
    op.execute(text("DROP TRIGGER IF EXISTS articles_ad"))
    op.execute(text("DROP TRIGGER IF EXISTS articles_au"))
    op.execute(text("DROP TRIGGER IF EXISTS articles_ai"))
    
    # Drop FTS5 virtual table
    op.execute(text("DROP TABLE IF EXISTS articles_fts"))
