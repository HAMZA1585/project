from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from werkzeug.security import generate_password_hash
from . import db, rq
from .models import User
from .auth import role_required
from .utils import validate_password

# Create admin API blueprint
admin_api = Blueprint('admin_api', __name__)

@admin_api.route('/users', methods=['GET'])
@jwt_required()
@role_required("admin")
def get_all_users():
    """Get all users - Admin only"""
    try:
        users = User.query.all()
        users_data = []
        
        for user in users:
            users_data.append({
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "role": user.role
            })
        
        return jsonify({
            "users": users_data,
            "total": len(users_data)
        }), 200
        
    except Exception as e:
        print(f"DEBUG: Error fetching users: {str(e)}")
        return jsonify({"error": "Failed to fetch users"}), 500

@admin_api.route('/users', methods=['POST'])
@jwt_required()
@role_required("admin")
def create_user():
    """Create a new user - Admin only"""
    try:
        data = request.get_json() or {}
        
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')
        role = data.get('role', 'user')  # Default to 'user' if not provided
        
        # Validate required fields
        if not username or not email or not password:
            return jsonify({"error": "Username, email, and password are required"}), 400
        
        # Validate role
        if role not in ['user', 'admin']:
            return jsonify({"error": "Invalid role. Must be 'user' or 'admin'"}), 400
        
        # Check if user already exists
        existing_email = User.query.filter_by(email=email).first()
        existing_username = User.query.filter_by(username=username).first()
        
        if existing_email:
            return jsonify({"error": "User with this email already exists"}), 409
        if existing_username:
            return jsonify({"error": "User with this username already exists"}), 409
        
        # Validate password using centralized validation
        password_errors = validate_password(password)
        if password_errors:
            return jsonify({"error": "Password validation failed", "details": password_errors}), 400
        
        # Create new user
        new_user = User(username=username, email=email, role=role)
        new_user.set_password(password)
        
        db.session.add(new_user)
        db.session.commit()
        
        return jsonify({
            "message": "User created successfully",
            "user": {
                "id": new_user.id,
                "username": new_user.username,
                "email": new_user.email,
                "role": new_user.role
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"DEBUG: Error creating user: {str(e)}")
        return jsonify({"error": "Failed to create user"}), 500

@admin_api.route('/users/<int:user_id>', methods=['PUT'])
@jwt_required()
@role_required("admin")
def update_user(user_id):
    """Update a user's details - Admin only"""
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        data = request.get_json() or {}
        
        # Update fields if provided
        if 'username' in data:
            # Check if username is already taken by another user
            existing_username = User.query.filter(
                User.username == data['username'],
                User.id != user_id
            ).first()
            if existing_username:
                return jsonify({"error": "Username already taken"}), 409
            user.username = data['username']
        
        if 'email' in data:
            # Check if email is already taken by another user
            existing_email = User.query.filter(
                User.email == data['email'],
                User.id != user_id
            ).first()
            if existing_email:
                return jsonify({"error": "Email already taken"}), 409
            user.email = data['email']
        
        if 'role' in data:
            if data['role'] not in ['user', 'admin']:
                return jsonify({"error": "Invalid role. Must be 'user' or 'admin'"}), 400
            user.role = data['role']
        
        if 'password' in data and data['password']:
            password_errors = validate_password(data['password'])
            if password_errors:
                return jsonify({"error": "New password validation failed", "details": password_errors}), 400
            user.set_password(data['password'])
        
        db.session.commit()
        
        return jsonify({
            "message": "User updated successfully",
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "role": user.role
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"DEBUG: Error updating user: {str(e)}")
        return jsonify({"error": "Failed to update user"}), 500

@admin_api.route('/users/<int:user_id>', methods=['DELETE'])
@jwt_required()
@role_required("admin")
def delete_user(user_id):
    """Delete a user - Admin only"""
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Prevent admin from deleting themselves
        current_user_id = get_jwt_identity()
        if str(user.id) == current_user_id:
            return jsonify({"error": "Cannot delete your own account"}), 400
        
        db.session.delete(user)
        db.session.commit()
        
        return jsonify({
            "message": "User deleted successfully"
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"DEBUG: Error deleting user: {str(e)}")
        return jsonify({"error": "Failed to delete user"}), 500

@admin_api.route('/users/<int:user_id>', methods=['GET'])
@jwt_required()
@role_required("admin")
def get_user(user_id):
    """Get a specific user's details - Admin only"""
    try:
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
        print(f"DEBUG: Error fetching user: {str(e)}")
        return jsonify({"error": "Failed to fetch user"}), 500

@admin_api.route('/worker-status', methods=['GET'])
@jwt_required()
@role_required("admin")
def get_worker_status():
    """Get worker and queue status - Admin only"""
    try:
        queues = []
        for queue_name in current_app.config.get('RQ_QUEUES', []):
            queue = rq.get_queue(queue_name)
            queues.append({
                'name': queue.name,
                'job_count': queue.count,
                'started_jobs': queue.started_job_registry.count,
                'failed_jobs': queue.failed_job_registry.count,
            })
        
        workers = [{
            'name': worker.name,
            'state': worker.state,
            'queues': ', '.join(worker.queue_names())
        } for worker in rq.get_workers(queue=None)]

        return jsonify(queues=queues, workers=workers), 200
    except Exception as e:
        print(f"DEBUG: Error fetching worker status: {str(e)}")
        return jsonify({"error": f"Failed to get worker status: {str(e)}"}), 500
