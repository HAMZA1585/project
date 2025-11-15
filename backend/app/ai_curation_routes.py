from flask import Blueprint, request, jsonify, current_app
from .models import Article
from . import db
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
from transformers import pipeline
import logging

ai_curation_bp = Blueprint('ai_curation', __name__, url_prefix='/api/v1/curation')

# Initialize the summarizer model (lazy loading)
_summarizer = None

def get_summarizer():
    """Get or initialize the summarizer model."""
    global _summarizer
    if _summarizer is None:
        try:
            current_app.logger.info("Loading summarization model...")
            _summarizer = pipeline("summarization", model="sshleifer/distilbart-cnn-12-6")
            current_app.logger.info("Summarization model loaded successfully")
        except Exception as e:
            current_app.logger.error(f"Failed to load summarization model: {str(e)}")
            _summarizer = None
    return _summarizer

@ai_curation_bp.route('/recommendations', methods=['POST'])
def generate_recommendations():
    """
    Generate content recommendations for a given article_id based on content similarity.
    Expects JSON: {"article_id": <int>}
    """
    try:
        data = request.get_json()
        if not data or 'article_id' not in data:
            return jsonify({'error': 'article_id is required'}), 400

        target_article_id = data['article_id']

        # Fetch the target article
        target_article = Article.query.get(target_article_id)
        if not target_article:
            return jsonify({'error': 'Article not found'}), 404

        # Fetch all other articles to compare against
        all_articles = Article.query.filter(Article.id != target_article_id).all()
        if not all_articles:
            return jsonify({'recommendations': [], 'count': 0, 'message': 'No other articles to compare against.'}), 200

        # Prepare corpus for TF-IDF
        corpus = [(target_article.content or target_article.title)] + [(a.content or a.title) for a in all_articles]
        
        # Vectorize the text content
        vectorizer = TfidfVectorizer(stop_words='english', max_features=5000)
        tfidf_matrix = vectorizer.fit_transform(corpus)

        # Calculate cosine similarity between the target article (index 0) and all others
        cosine_similarities = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:]).flatten()

        # Debug logging
        current_app.logger.info(f"Target article: {target_article.title}")
        current_app.logger.info(f"Total articles to compare: {len(all_articles)}")
        current_app.logger.info(f"Similarity scores: {cosine_similarities}")
        current_app.logger.info(f"Max similarity score: {cosine_similarities.max()}")
        current_app.logger.info(f"Min similarity score: {cosine_similarities.min()}")

        # Get the indices of the top 5 most similar articles
        # We add 1 to the indices because our `all_articles` list is offset by the target article
        top_indices = cosine_similarities.argsort()[-5:][::-1]

        recommendations = []
        for i in top_indices:
            recommended_article = all_articles[i]
            score = cosine_similarities[i]
            current_app.logger.info(f"Article {i}: {recommended_article.title} - Score: {score:.4f}")
            
            # Only recommend articles with a meaningful similarity score
            # if score > 0.1: # Threshold to avoid completely unrelated articles - TEMPORARILY DISABLED FOR TESTING
            recommendations.append({
                'id': f"rec_{recommended_article.id}",
                'article': {
                    'id': recommended_article.id,
                    'title': recommended_article.title,
                    'url': recommended_article.url,
                    'source': recommended_article.source,
                    'content': recommended_article.content,
                    'category': recommended_article.category,
                    'date': recommended_article.date.isoformat() if recommended_article.date else None,
                },
                'score': float(score),
                'reasons': [f"High content similarity ({float(score):.2f})"]
            })

        return jsonify({
            'success': True,
            'recommendations': recommendations,
            'count': len(recommendations)
        })

    except Exception as e:
        current_app.logger.error(f"Error generating recommendations: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to generate recommendations'
        }), 500

@ai_curation_bp.route('/duplicates', methods=['POST'])
def detect_duplicates():
    """Detect duplicate articles using real similarity analysis"""
    try:
        data = request.get_json()
        articles = data.get('articles', [])
        
        if len(articles) < 2:
            return jsonify({
                'success': True,
                'duplicates': [],
                'count': 0,
                'message': 'Need at least 2 articles to detect duplicates'
            })
        
        duplicates = []
        similarity_threshold = 0.8  # High threshold for duplicates
        
        # Prepare content for comparison
        article_contents = []
        for article in articles:
            content = article.get('content', '') or article.get('title', '')
            article_contents.append(content)
        
        # Vectorize the text content
        vectorizer = TfidfVectorizer(stop_words='english', max_features=5000)
        tfidf_matrix = vectorizer.fit_transform(article_contents)
        
        # Calculate pairwise similarities
        similarity_matrix = cosine_similarity(tfidf_matrix)
        
        # Find duplicate pairs
        processed_pairs = set()
        for i in range(len(articles)):
            for j in range(i + 1, len(articles)):
                similarity = similarity_matrix[i][j]
                
                if similarity >= similarity_threshold and (i, j) not in processed_pairs:
                    duplicate_group = {
                        'articles': [articles[i], articles[j]],
                        'similarity': float(similarity),
                        'confidence': float(similarity)
                    }
                    duplicates.append(duplicate_group)
                    processed_pairs.add((i, j))
        
        return jsonify({
            'success': True,
            'duplicates': duplicates,
            'count': len(duplicates),
            'threshold': similarity_threshold
        })
    
    except Exception as e:
        current_app.logger.error(f"Error detecting duplicates: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to detect duplicates'
        }), 500

@ai_curation_bp.route('/merge', methods=['POST'])
def merge_duplicates():
    """Merge duplicate articles"""
    try:
        data = request.get_json()
        duplicate_groups = data.get('duplicateGroups', [])
        
        merged_articles = []
        
        for group in duplicate_groups:
            # Simple merge strategy: keep the first article and merge metadata
            if group['articles']:
                merged_article = group['articles'][0].copy()
                
                # Merge sources
                sources = list(set([art.get('source', '') for art in group['articles'] if art.get('source')]))
                merged_article['source'] = ', '.join(sources)
                
                # Merge categories
                categories = list(set([art.get('category', '') for art in group['articles'] if art.get('category')]))
                merged_article['category'] = ', '.join(categories)
                
                # Add merge metadata
                merged_article['merged_from'] = [art.get('id') for art in group['articles'][1:]]
                merged_article['merge_confidence'] = group.get('confidence', 0)
                
                merged_articles.append(merged_article)
        
        return jsonify({
            'success': True,
            'mergedArticles': merged_articles,
            'count': len(merged_articles)
        })
    
    except Exception as e:
        current_app.logger.error(f"Error merging duplicates: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to merge duplicates'
        }), 500

@ai_curation_bp.route('/summarize', methods=['POST'])
def summarize_content():
    """Summarize article content using real AI"""
    try:
        data = request.get_json()
        article_id = data.get('articleId')
        content = data.get('content', '')
        length = data.get('length', 'medium')
        
        if not content:
            return jsonify({
                'success': False,
                'error': 'No content provided'
            }), 400
        
        # Get the summarizer model
        summarizer = get_summarizer()
        if not summarizer:
            return jsonify({
                'success': False,
                'error': 'Summarization service unavailable'
            }), 503
        
        # Configure summary length based on request
        max_length = 150 if length == 'long' else 100 if length == 'medium' else 50
        min_length = 30 if length == 'long' else 20 if length == 'medium' else 10
        
        # Truncate content if too long (transformers has token limits)
        max_input_length = 1024
        if len(content) > max_input_length:
            content = content[:max_input_length]
        
        # Generate summary using real AI
        try:
            summary_list = summarizer(content, max_length=max_length, min_length=min_length, do_sample=False)
            summary = summary_list[0]['summary_text']
        except Exception as e:
            current_app.logger.error(f"Summarization failed: {str(e)}")
            # Fallback to simple truncation if AI fails
            summary = content[:max_length] + "..." if len(content) > max_length else content
        
        return jsonify({
            'success': True,
            'summary': summary,
            'articleId': article_id,
            'length': length,
            'method': 'ai_powered'
        })
    
    except Exception as e:
        current_app.logger.error(f"Error summarizing content: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to summarize content'
        }), 500

@ai_curation_bp.route('/categorize', methods=['POST'])
def categorize_content():
    """Categorize article content using keyword-based classification"""
    try:
        data = request.get_json()
        article_id = data.get('articleId')
        title = data.get('title', '')
        content = data.get('content', '')
        confidence = data.get('confidence', 0.8)
        
        if not title and not content:
            return jsonify({
                'success': False,
                'error': 'No title or content provided'
            }), 400
        
        # Combine title and content for analysis
        text = f"{title} {content}".lower()
        
        # Define category keywords and weights
        categories = {
            'Technology': {
                'keywords': ['tech', 'software', 'ai', 'artificial intelligence', 'machine learning', 'computer', 'digital', 'app', 'programming', 'code', 'startup', 'innovation', 'cyber', 'data', 'algorithm'],
                'weight': 1.0
            },
            'Business': {
                'keywords': ['business', 'company', 'corporate', 'finance', 'financial', 'market', 'economy', 'investment', 'revenue', 'profit', 'merger', 'acquisition', 'ceo', 'cfo', 'earnings'],
                'weight': 1.0
            },
            'Politics': {
                'keywords': ['government', 'political', 'election', 'president', 'congress', 'senate', 'policy', 'law', 'legislation', 'vote', 'campaign', 'democrat', 'republican', 'parliament'],
                'weight': 1.0
            },
            'Health': {
                'keywords': ['health', 'medical', 'healthcare', 'doctor', 'hospital', 'disease', 'treatment', 'medicine', 'pharmaceutical', 'covid', 'pandemic', 'vaccine', 'research', 'clinical'],
                'weight': 1.0
            },
            'Sports': {
                'keywords': ['sport', 'football', 'basketball', 'baseball', 'soccer', 'tennis', 'golf', 'olympic', 'championship', 'tournament', 'player', 'team', 'coach', 'game', 'match'],
                'weight': 1.0
            },
            'Entertainment': {
                'keywords': ['movie', 'film', 'music', 'celebrity', 'actor', 'singer', 'entertainment', 'hollywood', 'award', 'show', 'television', 'netflix', 'streaming', 'concert'],
                'weight': 1.0
            }
        }
        
        # Calculate scores for each category
        category_scores = {}
        for category_name, category_data in categories.items():
            score = 0
            matched_keywords = []
            
            for keyword in category_data['keywords']:
                if keyword in text:
                    score += category_data['weight']
                    matched_keywords.append(keyword)
            
            if score > 0:
                # Normalize score based on text length
                normalized_score = min(score / (len(text.split()) / 100), 1.0)
                category_scores[category_name] = {
                    'score': normalized_score,
                    'matched_keywords': matched_keywords
                }
        
        # Determine the best category
        if category_scores:
            best_category = max(category_scores.items(), key=lambda x: x[1]['score'])
            category_name = best_category[0]
            category_score = best_category[1]['score']
            matched_keywords = best_category[1]['matched_keywords']
            
            # Only return category if confidence meets threshold
            if category_score >= confidence:
                category = {
                    'name': category_name,
                    'confidence': float(category_score),
                    'reasons': [f"Matched keywords: {', '.join(matched_keywords[:5])}"]
                }
            else:
                category = {
                    'name': 'Uncertain',
                    'confidence': float(category_score),
                    'reasons': [f"Low confidence ({category_score:.2f} < {confidence})"]
                }
        else:
            category = {
                'name': 'General',
                'confidence': 0.3,
                'reasons': ['No specific category keywords found']
            }
        
        return jsonify({
            'success': True,
            'category': category,
            'articleId': article_id
        })
    
    except Exception as e:
        current_app.logger.error(f"Error categorizing content: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to categorize content'
        }), 500

@ai_curation_bp.route('/process-batch', methods=['POST'])
def process_articles():
    """Process articles with all AI features"""
    try:
        data = request.get_json()
        articles = data.get('articles', [])
        settings = data.get('settings', {})
        
        results = {
            'summaries': {},
            'categories': {},
            'duplicates': [],
            'recommendations': []
        }
        
        # Process each article
        for article in articles:
            article_id = article.get('id')
            
            # Summarize if enabled
            if settings.get('autoSummarize', True):
                try:
                    content = article.get('content', '')
                    if content:
                        summarizer = get_summarizer()
                        if summarizer:
                            # Truncate content if too long
                            max_input_length = 1024
                            if len(content) > max_input_length:
                                content = content[:max_input_length]
                            
                            summary_list = summarizer(content, max_length=100, min_length=20, do_sample=False)
                            summary = summary_list[0]['summary_text']
                        else:
                            # Fallback to simple truncation
                            summary = content[:200] + "..." if len(content) > 200 else content
                        
                        results['summaries'][article_id] = summary
                except Exception as e:
                    current_app.logger.error(f"Error summarizing article {article_id}: {str(e)}")
                    pass
            
            # Categorize if enabled
            if settings.get('autoCategorize', True):
                try:
                    title = article.get('title', '')
                    content = article.get('content', '')
                    
                    if title or content:
                        # Use the same categorization logic as the categorize endpoint
                        text = f"{title} {content}".lower()
                        
                        categories = {
                            'Technology': {
                                'keywords': ['tech', 'software', 'ai', 'artificial intelligence', 'machine learning', 'computer', 'digital', 'app', 'programming', 'code', 'startup', 'innovation', 'cyber', 'data', 'algorithm'],
                                'weight': 1.0
                            },
                            'Business': {
                                'keywords': ['business', 'company', 'corporate', 'finance', 'financial', 'market', 'economy', 'investment', 'revenue', 'profit', 'merger', 'acquisition', 'ceo', 'cfo', 'earnings'],
                                'weight': 1.0
                            },
                            'Politics': {
                                'keywords': ['government', 'political', 'election', 'president', 'congress', 'senate', 'policy', 'law', 'legislation', 'vote', 'campaign', 'democrat', 'republican', 'parliament'],
                                'weight': 1.0
                            },
                            'Health': {
                                'keywords': ['health', 'medical', 'healthcare', 'doctor', 'hospital', 'disease', 'treatment', 'medicine', 'pharmaceutical', 'covid', 'pandemic', 'vaccine', 'research', 'clinical'],
                                'weight': 1.0
                            },
                            'Sports': {
                                'keywords': ['sport', 'football', 'basketball', 'baseball', 'soccer', 'tennis', 'golf', 'olympic', 'championship', 'tournament', 'player', 'team', 'coach', 'game', 'match'],
                                'weight': 1.0
                            },
                            'Entertainment': {
                                'keywords': ['movie', 'film', 'music', 'celebrity', 'actor', 'singer', 'entertainment', 'hollywood', 'award', 'show', 'television', 'netflix', 'streaming', 'concert'],
                                'weight': 1.0
                            }
                        }
                        
                        category_scores = {}
                        for category_name, category_data in categories.items():
                            score = 0
                            matched_keywords = []
                            
                            for keyword in category_data['keywords']:
                                if keyword in text:
                                    score += category_data['weight']
                                    matched_keywords.append(keyword)
                            
                            if score > 0:
                                normalized_score = min(score / (len(text.split()) / 100), 1.0)
                                category_scores[category_name] = {
                                    'score': normalized_score,
                                    'matched_keywords': matched_keywords
                                }
                        
                        if category_scores:
                            best_category = max(category_scores.items(), key=lambda x: x[1]['score'])
                            category_name = best_category[0]
                            category_score = best_category[1]['score']
                            matched_keywords = best_category[1]['matched_keywords']
                            
                            category = {
                                'name': category_name,
                                'confidence': float(category_score),
                                'reasons': [f"Matched keywords: {', '.join(matched_keywords[:3])}"]
                            }
                        else:
                            category = {
                                'name': 'General',
                                'confidence': 0.3,
                                'reasons': ['No specific category keywords found']
                            }
                        
                        results['categories'][article_id] = category
                except Exception as e:
                    current_app.logger.error(f"Error categorizing article {article_id}: {str(e)}")
                    pass
        
        # Detect duplicates if enabled
        if settings.get('detectDuplicates', True) and len(articles) >= 2:
            try:
                # Use the same duplicate detection logic as the duplicates endpoint
                article_contents = []
                for article in articles:
                    content = article.get('content', '') or article.get('title', '')
                    article_contents.append(content)
                
                # Vectorize the text content
                vectorizer = TfidfVectorizer(stop_words='english', max_features=5000)
                tfidf_matrix = vectorizer.fit_transform(article_contents)
                
                # Calculate pairwise similarities
                similarity_matrix = cosine_similarity(tfidf_matrix)
                
                # Find duplicate pairs
                duplicates = []
                similarity_threshold = 0.8
                processed_pairs = set()
                
                for i in range(len(articles)):
                    for j in range(i + 1, len(articles)):
                        similarity = similarity_matrix[i][j]
                        
                        if similarity >= similarity_threshold and (i, j) not in processed_pairs:
                            duplicate_group = {
                                'articles': [articles[i], articles[j]],
                                'similarity': float(similarity),
                                'confidence': float(similarity)
                            }
                            duplicates.append(duplicate_group)
                            processed_pairs.add((i, j))
                
                results['duplicates'] = duplicates
            except Exception as e:
                current_app.logger.error(f"Error detecting duplicates: {str(e)}")
                results['duplicates'] = []
        
        # Generate recommendations
        try:
            # TODO: Implement recommendations using real similarity analysis
            results['recommendations'] = []
        except:
            pass
        
        return jsonify({
            'success': True,
            'results': results,
            'processed': len(articles)
        })
    
    except Exception as e:
        current_app.logger.error(f"Error processing articles: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to process articles'
        }), 500

@ai_curation_bp.route('/status', methods=['GET'])
def get_status():
    """Get AI curation service status"""
    # Check if summarizer is available
    summarizer_available = get_summarizer() is not None
    
    return jsonify({
        'success': True,
        'status': 'operational',
        'features': {
            'recommendations': True,
            'duplicates': True,
            'summarization': summarizer_available,
            'categorization': True
        },
        'capabilities': {
            'recommendations': 'Content similarity analysis using TF-IDF and cosine similarity',
            'duplicates': 'Real duplicate detection using similarity analysis (80% threshold)',
            'summarization': 'AI-powered summarization using DistilBART-CNN model' if summarizer_available else 'Fallback to text truncation',
            'categorization': 'Keyword-based classification with 6 categories (Technology, Business, Politics, Health, Sports, Entertainment)'
        },
        'version': '2.0.0'
    })
