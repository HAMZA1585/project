import logging
from collections import Counter
import re
import string
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS

logger = logging.getLogger(__name__)

# Extended stop words list for better filtering
EXTENDED_STOP_WORDS = ENGLISH_STOP_WORDS.union({
    'said', 'says', 'say', 'will', 'would', 'could', 'should', 'may', 'might',
    'can', 'must', 'shall', 'one', 'two', 'three', 'first', 'last', 'new',
    'old', 'good', 'bad', 'great', 'small', 'large', 'big', 'little', 'much',
    'many', 'more', 'most', 'less', 'least', 'very', 'really', 'quite', 'just',
    'only', 'also', 'even', 'still', 'yet', 'already', 'always', 'never',
    'often', 'sometimes', 'usually', 'rarely', 'today', 'yesterday', 'tomorrow',
    'now', 'then', 'here', 'there', 'where', 'when', 'how', 'why', 'what',
    'who', 'which', 'that', 'this', 'these', 'those', 'get', 'got', 'getting',
    'go', 'went', 'going', 'come', 'came', 'coming', 'see', 'saw', 'seeing',
    'know', 'knew', 'knowing', 'think', 'thought', 'thinking', 'make', 'made',
    'making', 'take', 'took', 'taking', 'give', 'gave', 'giving', 'use', 'used',
    'using', 'find', 'found', 'finding', 'work', 'worked', 'working', 'look',
    'looked', 'looking', 'seem', 'seemed', 'seeming', 'become', 'became',
    'becoming', 'begin', 'began', 'beginning', 'start', 'started', 'starting',
    'end', 'ended', 'ending', 'turn', 'turned', 'turning', 'move', 'moved',
    'moving', 'live', 'lived', 'living', 'feel', 'felt', 'feeling', 'try',
    'tried', 'trying', 'call', 'called', 'calling', 'ask', 'asked', 'asking',
    'need', 'needed', 'needing', 'want', 'wanted', 'wanting', 'help', 'helped',
    'helping', 'show', 'showed', 'showing', 'tell', 'told', 'telling', 'hear',
    'heard', 'hearing', 'read', 'reading', 'write', 'wrote', 'writing', 'run',
    'ran', 'running', 'walk', 'walked', 'walking', 'sit', 'sat', 'sitting',
    'stand', 'stood', 'standing', 'lie', 'lay', 'lying', 'sleep', 'slept',
    'sleeping', 'eat', 'ate', 'eating', 'drink', 'drank', 'drinking', 'buy',
    'bought', 'buying', 'sell', 'sold', 'selling', 'pay', 'paid', 'paying',
    'cost', 'costing', 'spend', 'spent', 'spending', 'save', 'saved', 'saving',
    'lose', 'lost', 'losing', 'win', 'won', 'winning', 'play', 'played',
    'playing', 'watch', 'watched', 'watching', 'listen', 'listened', 'listening',
    'speak', 'spoke', 'speaking', 'talk', 'talked', 'talking', 'meet', 'met',
    'meeting', 'visit', 'visited', 'visiting', 'travel', 'traveled', 'traveling',
    'drive', 'drove', 'driving', 'fly', 'flew', 'flying', 'ride', 'rode',
    'riding', 'swim', 'swam', 'swimming', 'jump', 'jumped', 'jumping', 'climb',
    'climbed', 'climbing', 'fall', 'fell', 'falling', 'rise', 'rose', 'rising',
    'grow', 'grew', 'growing', 'change', 'changed', 'changing', 'happen',
    'happened', 'happening', 'appear', 'appeared', 'appearing', 'disappear',
    'disappeared', 'disappearing', 'exist', 'existed', 'existing', 'continue',
    'continued', 'continuing', 'stop', 'stopped', 'stopping', 'finish',
    'finished', 'finishing', 'complete', 'completed', 'completing', 'open',
    'opened', 'opening', 'close', 'closed', 'closing', 'break', 'broke',
    'breaking', 'fix', 'fixed', 'fixing', 'build', 'built', 'building',
    'create', 'created', 'creating', 'destroy', 'destroyed', 'destroying',
    'kill', 'killed', 'killing', 'die', 'died', 'dying', 'born', 'birth',
    'birthday', 'age', 'aged', 'aging', 'young', 'old', 'new', 'fresh',
    'clean', 'dirty', 'hot', 'cold', 'warm', 'cool', 'dry', 'wet', 'soft',
    'hard', 'smooth', 'rough', 'sharp', 'dull', 'bright', 'dark', 'light',
    'heavy', 'light', 'thick', 'thin', 'wide', 'narrow', 'long', 'short',
    'tall', 'short', 'high', 'low', 'deep', 'shallow', 'fast', 'slow', 'quick',
    'quickly', 'slowly', 'early', 'late', 'soon', 'immediately', 'suddenly',
    'gradually', 'carefully', 'easily', 'hardly', 'nearly', 'almost', 'exactly',
    'about', 'around', 'approximately', 'roughly', 'precisely', 'certainly',
    'definitely', 'probably', 'possibly', 'maybe', 'perhaps', 'surely',
    'obviously', 'clearly', 'apparently', 'evidently', 'supposedly', 'allegedly',
    'reportedly', 'accordingly', 'therefore', 'however', 'nevertheless',
    'nonetheless', 'moreover', 'furthermore', 'additionally', 'besides',
    'meanwhile', 'otherwise', 'instead', 'rather', 'actually', 'really',
    'truly', 'genuinely', 'honestly', 'seriously', 'literally', 'figuratively',
    'basically', 'essentially', 'fundamentally', 'primarily', 'mainly',
    'mostly', 'largely', 'partly', 'partially', 'completely', 'entirely',
    'totally', 'absolutely', 'perfectly', 'exactly', 'precisely', 'accurately',
    'correctly', 'properly', 'appropriately', 'suitably', 'adequately',
    'sufficiently', 'enough', 'too', 'very', 'quite', 'rather', 'fairly',
    'pretty', 'somewhat', 'slightly', 'barely', 'hardly', 'scarcely',
    'nearly', 'almost', 'practically', 'virtually', 'essentially', 'basically'
})

# Helper function to clean and tokenize text
def tokenize(text):
    
    text = text.lower()
    
    text = text.translate(str.maketrans('', '', string.punctuation))
    
    words = re.findall(r'\w+', text)
   
    words = [word for word in words if word not in EXTENDED_STOP_WORDS and len(word) > 2]
    return words

# Function to predict trend 
def predict_trend(article_texts, top_n=10):
    """
    Analyze trends using TF-IDF to find the most significant keywords.
    
    Args:
        article_texts (list): List of article texts (titles + content)
        top_n (int): Number of top keywords to return
    
    Returns:
        list: List of tuples (keyword, tfidf_score) sorted by score
    """
    if not article_texts or len(article_texts) == 0:
        logger.warning("No article texts provided for trend analysis")
        return []
    
    
    processed_texts = []
    for text in article_texts:
        if text:
            # Combine title and content if available
            if isinstance(text, dict):
                combined_text = f"{text.get('title', '')} {text.get('content', '')}"
            else:
                combined_text = str(text)
            
            
            if combined_text.strip():
                # Clean and tokenize
                words = tokenize(combined_text)
                if words:  
                    processed_texts.append(' '.join(words))
    
    if not processed_texts:
        logger.warning("No valid processed texts for trend analysis")
        return []
    
    try:
        # Initialize TF-IDF vectorizer
        vectorizer = TfidfVectorizer(
            max_features=1000,  # Limit vocabulary size
            min_df=2,  
            max_df=0.95,  
            ngram_range=(1, 2), 
            stop_words='english',
            lowercase=True,
            strip_accents='unicode'
        )
        
        # Fit and transform the texts
        tfidf_matrix = vectorizer.fit_transform(processed_texts)
        
        # Get feature names (words/phrases)
        feature_names = vectorizer.get_feature_names_out()
        
        # Calculate mean TF-IDF scores across all documents
        mean_scores = np.mean(tfidf_matrix.toarray(), axis=0)
        
        # Create list of (word, score) tuples
        word_scores = list(zip(feature_names, mean_scores))
        
        # Sort by score in descending order
        word_scores.sort(key=lambda x: x[1], reverse=True)
        
        # Return top N keywords
        top_keywords = word_scores[:top_n]
        
        logger.info(f"TF-IDF analysis completed. Found {len(top_keywords)} top keywords")
        return top_keywords
        
    except Exception as e:
        logger.error(f"Error in TF-IDF analysis: {str(e)}")
        # Fallback to simple word counting
        return predict_trend_fallback(article_texts, top_n)

def predict_trend_fallback(article_texts, top_n=10):
    """
    Fallback method using simple word counting if TF-IDF fails.
    """
    logger.info("Using fallback word counting method for trend analysis")
    
    # Merge all texts
    all_text = []
    for text in article_texts:
        if text:
            if isinstance(text, dict):
                combined_text = f"{text.get('title', '')} {text.get('content', '')}"
            else:
                combined_text = str(text)
            
            if combined_text.strip():
                all_text.append(combined_text)
    
    text = ' '.join(all_text)
    
    # Tokenize and count word frequency
    words = tokenize(text)
    word_counts = Counter(words)
    
    # Return the top N frequent words
    return word_counts.most_common(top_n)

# Function to analyze news trends from article content strings
def analyze_news_trends(article_contents, top_n=20):
    """
    Analyze trends from a list of article content strings using TF-IDF.
    
    Args:
        article_contents (list): List of article content strings
        top_n (int): Number of top keywords to return
    
    Returns:
        list: List of dictionaries with 'keyword' and 'score' keys
    """
    if not article_contents or len(article_contents) == 0:
        logger.warning("No article contents provided for trend analysis")
        return []
    
    # Use the existing predict_trend function
    trends = predict_trend(article_contents, top_n)
    
    # Convert to the expected format: list of dictionaries
    result = []
    for keyword, score in trends:
        result.append({
            'keyword': keyword,
            'score': float(score)
        })
    
    logger.info(f"TF-IDF trend analysis completed. Found {len(result)} keywords")
    return result

def analyze_article_trends(articles, top_n=10):
    """
    Analyze trends from a list of article objects.
    
    Args:
        articles (list): List of article objects with title and content attributes
        top_n (int): Number of top keywords to return
    
    Returns:
        list: List of tuples (keyword, tfidf_score) sorted by score
    """
    if not articles:
        logger.warning("No articles provided for trend analysis")
        return []
    
    
    article_texts = []
    for article in articles:
        if hasattr(article, 'title') and hasattr(article, 'content'):
            article_texts.append({
                'title': article.title or '',
                'content': article.content or ''
            })
        elif isinstance(article, dict):
            article_texts.append({
                'title': article.get('title', ''),
                'content': article.get('content', '')
            })
        else:
            # Fallback for string articles
            article_texts.append(str(article))
    
    return predict_trend(article_texts, top_n)


if __name__ == "__main__":
    # Example of news headlines from different sources
    news_headlines = [
        "Bitcoin hits all-time high as market demand grows",
        "Crypto market recovery expected amid global uncertainty",
        "Ethereum surpasses Bitcoin in daily transactions",
        "Bitcoin price volatility continues to scare investors",
        "Ethereum price surge surprises analysts",
        "Global economy sees increased adoption of blockchain technology"
    ]

    # Analyze the trends
    trends = analyze_news_trends(news_headlines)
    
    print("Trending keywords:")
    for trend in trends:
        print(f"- {trend['keyword']}: {trend['score']:.4f}")
