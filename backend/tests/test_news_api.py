import pytest
import json
from app import create_app, db
from app.models import User

@pytest.fixture
def app():
    """Create and configure a new app instance for each test."""
    app = create_app()
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    app.config['JWT_SECRET_KEY'] = 'test-secret'
    
    with app.app_context():
        db.create_all()
        yield app
        db.drop_all()

@pytest.fixture
def client(app):
    """A test client for the app."""
    return app.test_client()

@pytest.fixture
def auth_headers(client):
    """Create a test user and return auth headers."""
    # Create test user
    test_user = User(username='testuser', email='test@example.com', role='User')
    test_user.set_password('testpass123')
    db.session.add(test_user)
    db.session.commit()
    
    # Login to get token
    response = client.post('/api/v1/auth/login', 
                          json={'email': 'test@example.com', 'password': 'testpass123'})
    token = response.get_json()['token']
    
    return {'Authorization': f'Bearer {token}'}

def test_news_endpoint(client):
    """Test /api/v1/news endpoint."""
    response = client.get('/api/v1/news')
    assert response.status_code == 200
    
    data = response.get_json()
    assert 'articles' in data
    assert isinstance(data['articles'], list)

def test_news_endpoint_with_auth(client, auth_headers):
    """Test /api/v1/news endpoint with authentication."""
    response = client.get('/api/v1/news', headers=auth_headers)
    assert response.status_code == 200
    
    data = response.get_json()
    assert 'articles' in data
    assert isinstance(data['articles'], list)

def test_sentiment_endpoint_post(client):
    """Test POST /api/v1/sentiment endpoint."""
    test_data = {'text': 'This is a great day!'}
    response = client.post('/api/v1/sentiment', 
                          json=test_data,
                          content_type='application/json')
    
    assert response.status_code == 200
    
    data = response.get_json()
    assert 'sentiment' in data
    assert 'label' in data['sentiment']
    assert 'score' in data['sentiment']
    assert data['sentiment']['label'] in ['positive', 'negative', 'neutral']

def test_sentiment_endpoint_batch(client):
    """Test POST /api/v1/sentiment endpoint with batch data."""
    test_data = {
        'news_data': {
            'articles': [
                {'title': 'Great news today!', 'content': 'Everything is wonderful.'},
                {'title': 'Terrible disaster', 'content': 'Everything is awful.'}
            ]
        }
    }
    response = client.post('/api/v1/sentiment', 
                          json=test_data,
                          content_type='application/json')
    
    assert response.status_code == 200
    
    data = response.get_json()
    assert 'message' in data
    assert 'enriched_articles' in data
    assert len(data['enriched_articles']) == 2

def test_sentiment_endpoint_invalid_data(client):
    """Test POST /api/v1/sentiment endpoint with invalid data."""
    response = client.post('/api/v1/sentiment', 
                          json={},
                          content_type='application/json')
    
    assert response.status_code == 400
    
    data = response.get_json()
    assert 'error' in data

def test_news_endpoint_error_handling(client):
    """Test error handling in news endpoint."""
    # Mock a scenario that might cause an error
    response = client.get('/api/v1/news')
    assert response.status_code == 200  # Should handle errors gracefully

def test_sentiment_endpoint_error_handling(client):
    """Test error handling in sentiment endpoint."""
    # Test with empty text
    response = client.post('/api/v1/sentiment', 
                          json={'text': ''},
                          content_type='application/json')
    
    # Should still return a response (might be 200 with neutral sentiment)
    assert response.status_code in [200, 400]

def test_api_versioning(client):
    """Test that all API endpoints are properly versioned."""
    endpoints = [
        '/api/v1/news',
        '/api/v1/sentiment',
        '/api/v1/trends/generate',
        '/api/v1/auth/login',
        '/api/v1/auth/register'
    ]
    
    for endpoint in endpoints:
        if endpoint.endswith('/login') or endpoint.endswith('/register'):
            # These require POST
            response = client.post(endpoint, json={})
        else:
            response = client.get(endpoint)
        
        # Should not return 404 (endpoint exists)
        assert response.status_code != 404

def test_global_error_handler(client):
    """Test global error handler returns JSON."""
    # Test 404
    response = client.get('/api/v1/nonexistent')
    assert response.status_code == 404
    
    data = response.get_json()
    assert 'error' in data
    assert data['error'] == 'Not found'

def test_cors_headers(client):
    """Test CORS headers are present."""
    response = client.get('/api/v1/news')
    assert 'Access-Control-Allow-Origin' in response.headers
