from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token, create_refresh_token,
    jwt_required, get_jwt_identity, get_jwt,
    set_access_cookies, set_refresh_cookies,
    unset_jwt_cookies
)
from functools import wraps
from werkzeug.security import generate_password_hash, check_password_hash
from . import db
from .models import User
from .utils import validate_password

auth = Blueprint('auth', __name__)

# Role-based decorator
def role_required(role):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            claims = get_jwt()
            if claims.get("role") != role:
                return jsonify({"error": "Forbidden"}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator

@auth.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json() or {}
        print(f"DEBUG: Register request received - data: {data}")
        
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')
        role = data.get('role', 'user')  # Default to 'user' if not provided
        
        print(f"DEBUG: Extracted fields - username: {username}, email: {email}, role: {role}")

        if not username or not email or not password:
            print("DEBUG: Missing required fields")
            return jsonify({"error": "All fields are required"}), 400

        # Check if user already exists
        existing_email = User.query.filter_by(email=email).first()
        existing_username = User.query.filter_by(username=username).first()
        
        if existing_email:
            print(f"DEBUG: User with email {email} already exists")
            return jsonify({"error": "User already exists"}), 409
        if existing_username:
            print(f"DEBUG: User with username {username} already exists")
            return jsonify({"error": "User already exists"}), 409

        # Validate password using centralized validation
        password_errors = validate_password(password)
        if password_errors:
            print(f"DEBUG: Password validation failed - {password_errors}")
            return jsonify({"error": "Password validation failed", "details": password_errors}), 400

        # Validate role
        if role not in ['user', 'admin']:
            print(f"DEBUG: Invalid role - {role}")
            return jsonify({"error": "Invalid role. Must be 'user' or 'admin'"}), 400

        print(f"DEBUG: Creating new user with role: {role}")
        new_user = User(username=username, email=email, role=role)
        new_user.set_password(password)
        db.session.add(new_user)
        db.session.commit()
        print(f"DEBUG: User created successfully - ID: {new_user.id}")

        # Create JWT tokens with role claims
        access_token = create_access_token(identity=str(new_user.id), additional_claims={"role": new_user.role})
        refresh_token = create_refresh_token(identity=str(new_user.id))
        print(f"DEBUG: JWT tokens created successfully")

        response_data = {
            "message": "Signup successful",
            "role": new_user.role,
            "user": {
                "id": new_user.id,
                "username": new_user.username,
                "email": new_user.email,
                "role": new_user.role
            }
        }
        
        # Create response and set httpOnly cookies
        response = jsonify(response_data)
        set_access_cookies(response, access_token)
        set_refresh_cookies(response, refresh_token)
        
        print(f"DEBUG: Returning response with cookies: {response_data}")
        return response, 201

    except Exception as e:
        # Rollback the session in case of any error
        db.session.rollback()
        
        # Log the full exception for backend debugging
        print(f"DEBUG: Exception occurred during registration: {str(e)}")
        
        # In debug mode, return the specific error to the frontend
        from flask import current_app
        if current_app.config.get("DEBUG"):
            return jsonify({"error": f"Internal Server Error: {str(e)}"}), 500
            
        # For production, return a generic error
        return jsonify({"error": "Internal Server Error"}), 500


@auth.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json() or {}
        email = data.get('email')
        password = data.get('password')
        
        print(f"DEBUG: Login attempt - email: {email}")
        
        if not email or not password:
            print("DEBUG: Missing email or password")
            return jsonify({"error": "Missing email or password"}), 400

        user = User.query.filter_by(email=email).first()
        print(f"DEBUG: User found: {user is not None}")
        
        if user and user.check_password(password):
            print("DEBUG: Password check passed")
            # Create JWT tokens with role claims
            access_token = create_access_token(identity=str(user.id), additional_claims={"role": user.role})
            refresh_token = create_refresh_token(identity=str(user.id))
            
            response_data = {
                "message": "Login successful",
                "role": user.role,
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "role": user.role
                }
            }
            
            # Create response and set httpOnly cookies
            response = jsonify(response_data)
            set_access_cookies(response, access_token)
            set_refresh_cookies(response, refresh_token)
            
            # Debug: Log cookie names
            print(f"DEBUG: Login - access token cookie name: access_token_cookie")
            print(f"DEBUG: Login - refresh token cookie name: refresh_token_cookie")
            print(f"DEBUG: Login - cookies set in response headers: {list(response.headers.keys())}")
            
            return response, 200
        
        print("DEBUG: Invalid credentials")
        return jsonify({"error": "Invalid credentials"}), 401

    except Exception as e:
        print(f"DEBUG: Login exception: {str(e)}")
        return jsonify({"error": "Internal Server Error"}), 500


@auth.route('/logout', methods=['POST'])
def logout():
    # Clear the httpOnly cookies
    response = jsonify({"message": "Logged out successfully"})
    unset_jwt_cookies(response)
    return response, 200

@auth.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    current_user = get_jwt_identity()
    claims = get_jwt()
    role = claims.get("role", "user")
    new_access = create_access_token(identity=str(current_user), additional_claims={"role": role})
    
    # Set the new access token in httpOnly cookie
    response = jsonify({"message": "Token refreshed successfully"})
    set_access_cookies(response, new_access)
    return response, 200

@auth.route('/me', methods=['GET'])
@jwt_required()
def get_me():
    """Return the current logged in user details"""
    try:
        # Debug: Check if cookies are present
        cookies = request.cookies
        print(f"DEBUG: /me endpoint - cookies received: {list(cookies.keys())}")
        print(f"DEBUG: /me endpoint - access_token_cookie present: {'access_token_cookie' in cookies}")
        print(f"DEBUG: /me endpoint - refresh_token_cookie present: {'refresh_token_cookie' in cookies}")
        
        user_id = get_jwt_identity()
        print(f"DEBUG: /me endpoint - user_id from JWT: {user_id}")
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404
            
        return jsonify({
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "role": user.role
            }
        }), 200
    except Exception as e:
        print(f"DEBUG: /me endpoint - exception: {str(e)}")
        print(f"DEBUG: /me endpoint - exception type: {type(e).__name__}")
        import traceback
        traceback.print_exc()
        raise

@auth.route('/protected', methods=['GET'])
@jwt_required()
def protected():
    current_user = get_jwt_identity()
    return jsonify({"logged_in_as": current_user}), 200

@auth.route('/admin/dashboard', methods=['GET'])
@jwt_required()
@role_required("admin")
def admin_dashboard():
    return jsonify({"message": "Welcome Admin!"}), 200

@auth.route('/me/preferences', methods=['PUT'])
@jwt_required()
def update_preferences():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    data = request.get_json() or {}
    if 'preferences' not in data:
        return jsonify({"error": "Missing preferences data"}), 400

    # Merge existing preferences with new ones
    if user.preferences is None:
        user.preferences = {}
    user.preferences.update(data.get('preferences', {}))

    db.session.commit()
    return jsonify({"message": "Preferences updated", "preferences": user.preferences}), 200
