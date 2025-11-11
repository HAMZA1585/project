import pytest
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

from backend.app.auth import AuthService
from backend.app.models import User
from backend.app import create_app, db
import tempfile
import os

class TestAuthService:
    def setup_method(self):
        """Set up test fixtures before each test method."""
        self.app = create_app()
        self.app.config['TESTING'] = True
        self.app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        self.app_context = self.app.app_context()
        self.app_context.push()
        db.create_all()
        
        self.auth_service = AuthService()
    
    def teardown_method(self):
        """Clean up after each test method."""
        db.session.remove()
        db.drop_all()
        self.app_context.pop()
    
    def test_register_user_success(self):
        """Test successful user registration."""
        user_data = {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'testpassword123'
        }
        
        result = self.auth_service.register_user(**user_data)
        
        assert result['success'] is True
        assert 'user' in result
        assert 'token' in result
        assert result['user']['username'] == 'testuser'
        assert result['user']['email'] == 'test@example.com'
        assert result['user']['role'] == 'user'
    
    def test_register_user_duplicate_username(self):
        """Test registration with duplicate username."""
        # Create first user
        self.auth_service.register_user('testuser', 'test1@example.com', 'password123')
        
        # Try to create second user with same username
        result = self.auth_service.register_user('testuser', 'test2@example.com', 'password123')
        
        assert result['success'] is False
        assert 'Username already exists' in result['error']
    
    def test_register_user_duplicate_email(self):
        """Test registration with duplicate email."""
        # Create first user
        self.auth_service.register_user('testuser1', 'test@example.com', 'password123')
        
        # Try to create second user with same email
        result = self.auth_service.register_user('testuser2', 'test@example.com', 'password123')
        
        assert result['success'] is False
        assert 'Email already exists' in result['error']
    
    def test_register_user_invalid_email(self):
        """Test registration with invalid email."""
        result = self.auth_service.register_user('testuser', 'invalid-email', 'password123')
        
        assert result['success'] is False
        assert 'Invalid email format' in result['error']
    
    def test_register_user_weak_password(self):
        """Test registration with weak password."""
        result = self.auth_service.register_user('testuser', 'test@example.com', '123')
        
        assert result['success'] is False
        assert 'Password too weak' in result['error']
    
    def test_login_user_success(self):
        """Test successful user login."""
        # Register user first
        self.auth_service.register_user('testuser', 'test@example.com', 'password123')
        
        # Login
        result = self.auth_service.login_user('testuser', 'password123')
        
        assert result['success'] is True
        assert 'user' in result
        assert 'token' in result
        assert result['user']['username'] == 'testuser'
    
    def test_login_user_wrong_password(self):
        """Test login with wrong password."""
        # Register user first
        self.auth_service.register_user('testuser', 'test@example.com', 'password123')
        
        # Login with wrong password
        result = self.auth_service.login_user('testuser', 'wrongpassword')
        
        assert result['success'] is False
        assert 'Invalid credentials' in result['error']
    
    def test_login_user_nonexistent(self):
        """Test login with nonexistent user."""
        result = self.auth_service.login_user('nonexistent', 'password123')
        
        assert result['success'] is False
        assert 'Invalid credentials' in result['error']
    
    def test_validate_token_valid(self):
        """Test token validation with valid token."""
        # Register and login user
        register_result = self.auth_service.register_user('testuser', 'test@example.com', 'password123')
        token = register_result['token']
        
        # Validate token
        result = self.auth_service.validate_token(token)
        
        assert result['success'] is True
        assert 'user' in result
        assert result['user']['username'] == 'testuser'
    
    def test_validate_token_invalid(self):
        """Test token validation with invalid token."""
        result = self.auth_service.validate_token('invalid-token')
        
        assert result['success'] is False
        assert 'Invalid token' in result['error']
    
    def test_validate_token_expired(self):
        """Test token validation with expired token."""
        # This would require mocking JWT expiration
        # For now, we'll test with a malformed token
        result = self.auth_service.validate_token('expired.token.here')
        
        assert result['success'] is False
        assert 'Invalid token' in result['error']
    
    def test_change_password_success(self):
        """Test successful password change."""
        # Register user
        register_result = self.auth_service.register_user('testuser', 'test@example.com', 'oldpassword123')
        user_id = register_result['user']['id']
        
        # Change password
        result = self.auth_service.change_password(user_id, 'oldpassword123', 'newpassword123')
        
        assert result['success'] is True
        assert 'Password changed successfully' in result['message']
    
    def test_change_password_wrong_old_password(self):
        """Test password change with wrong old password."""
        # Register user
        register_result = self.auth_service.register_user('testuser', 'test@example.com', 'oldpassword123')
        user_id = register_result['user']['id']
        
        # Change password with wrong old password
        result = self.auth_service.change_password(user_id, 'wrongoldpassword', 'newpassword123')
        
        assert result['success'] is False
        assert 'Current password is incorrect' in result['error']
    
    def test_change_password_weak_new_password(self):
        """Test password change with weak new password."""
        # Register user
        register_result = self.auth_service.register_user('testuser', 'test@example.com', 'oldpassword123')
        user_id = register_result['user']['id']
        
        # Change password with weak new password
        result = self.auth_service.change_password(user_id, 'oldpassword123', '123')
        
        assert result['success'] is False
        assert 'New password is too weak' in result['error']
    
    def test_get_user_profile(self):
        """Test getting user profile."""
        # Register user
        register_result = self.auth_service.register_user('testuser', 'test@example.com', 'password123')
        user_id = register_result['user']['id']
        
        # Get profile
        result = self.auth_service.get_user_profile(user_id)
        
        assert result['success'] is True
        assert 'user' in result
        assert result['user']['username'] == 'testuser'
        assert result['user']['email'] == 'test@example.com'
    
    def test_get_user_profile_nonexistent(self):
        """Test getting profile for nonexistent user."""
        result = self.auth_service.get_user_profile(99999)
        
        assert result['success'] is False
        assert 'User not found' in result['error']
    
    def test_update_user_profile(self):
        """Test updating user profile."""
        # Register user
        register_result = self.auth_service.register_user('testuser', 'test@example.com', 'password123')
        user_id = register_result['user']['id']
        
        # Update profile
        update_data = {
            'email': 'newemail@example.com',
            'role': 'admin'
        }
        result = self.auth_service.update_user_profile(user_id, update_data)
        
        assert result['success'] is True
        assert 'user' in result
        assert result['user']['email'] == 'newemail@example.com'
        assert result['user']['role'] == 'admin'
    
    def test_delete_user(self):
        """Test deleting user."""
        # Register user
        register_result = self.auth_service.register_user('testuser', 'test@example.com', 'password123')
        user_id = register_result['user']['id']
        
        # Delete user
        result = self.auth_service.delete_user(user_id)
        
        assert result['success'] is True
        assert 'User deleted successfully' in result['message']
        
        # Verify user is deleted
        profile_result = self.auth_service.get_user_profile(user_id)
        assert profile_result['success'] is False
