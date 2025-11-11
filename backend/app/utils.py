import logging
from datetime import datetime
import json
import os
import re

# Set up logging for the application
def setup_logging():
    """
    Set up logging configuration for the application.
    """
    logging.basicConfig(level=logging.DEBUG,
                        format='%(asctime)s - %(levelname)s - %(message)s',
                        handlers=[
                            logging.FileHandler('app.log'),
                            logging.StreamHandler()
                        ])

def log_error(message):
    """
    Log an error message to both console and log file.
    """
    logging.error(message)

def log_info(message):
    """
    Log an informational message to both console and log file.
    """
    logging.info(message)

def log_warning(message):
    """
    Log a warning message to both console and log file.
    """
    logging.warning(message)

# Helper function to save data as JSON
def save_json(data, filename):
    """
    Save data to a JSON file.
    
    :param data: Data to save
    :param filename: Name of the file to save the data
    """
    try:
        with open(filename, 'w') as f:
            json.dump(data, f, indent=4)
        log_info(f"Data saved to {filename}")
    except Exception as e:
        log_error(f"Error saving data to {filename}: {e}")

# Helper function to load data from JSON
def load_json(filename):
    """
    Load data from a JSON file.
    
    :param filename: Name of the file to load the data from
    :return: Data loaded from the file
    """
    try:
        with open(filename, 'r') as f:
            data = json.load(f)
        log_info(f"Data loaded from {filename}")
        return data
    except Exception as e:
        log_error(f"Error loading data from {filename}: {e}")
        return None

# Helper function to check if a file exists
def file_exists(filename):
    """
    Check if a file exists in the given path.
    
    :param filename: File path to check
    :return: True if file exists, False otherwise
    """
    return os.path.exists(filename)

# Utility function to format datetime for logs or display
def format_datetime(dt=None):
    """
    Format datetime into a human-readable format.
    
    :param dt: Datetime object to format (optional, defaults to current time)
    :return: Formatted datetime string
    """
    if dt is None:
        dt = datetime.now()
    return dt.strftime('%Y-%m-%d %H:%M:%S')

# Utility function to read configuration from a file
def read_config(filename):
    """
    Read configuration settings from a file and return as a dictionary.
    
    :param filename: Configuration file to read
    :return: Dictionary with configuration settings
    """
    try:
        with open(filename, 'r') as f:
            config = json.load(f)
        log_info(f"Config loaded from {filename}")
        return config
    except Exception as e:
        log_error(f"Error loading config from {filename}: {e}")
        return {}

def validate_password(password):
    """
    Validates a password against the application's security policy.
    
    :param password: Password to validate
    :return: List of validation errors (empty list if password is valid)
    """
    errors = []
    
    if len(password) < 8:
        errors.append("Password must be at least 8 characters long.")
    
    if not re.search(r"[A-Z]", password):
        errors.append("Password must contain at least one uppercase letter.")
    
    if not re.search(r"[a-z]", password):
        errors.append("Password must contain at least one lowercase letter.")
    
    if not re.search(r"\d", password):
        errors.append("Password must contain at least one number.")
    
    if not re.search(r"[!@#$%^&*()_+-=\[\]{};':\"\\|,.<>\/?]", password):
        errors.append("Password must contain at least one special character.")
    
    # Check for common weak passwords
    weak_passwords = ['password', '123456', 'admin', 'user', 'qwerty', 'abc123', 'password123', 'admin123', 'user123']
    if password.lower() in weak_passwords:
        errors.append("Password is too common and easily guessable.")
        
    return errors

def create_system_notification(level, message, source=None, app=None):
    """
    Create a system notification in the database.
    
    :param level: Notification level ('ERROR', 'WARNING', 'INFO')
    :param message: Notification message (max 500 chars)
    :param source: Source of the notification (e.g., 'scraper', 'sentiment')
    :param app: Flask app instance (optional, will use current_app if available)
    :return: Created SystemNotification object or None if error
    """
    try:
        from flask import current_app, has_app_context
        from .models import SystemNotification
        from . import db
        
        # Use provided app or current app context
        if app:
            with app.app_context():
                notification = SystemNotification(
                    level=level.upper(),
                    message=message[:500],  # Ensure message doesn't exceed max length
                    source=source
                )
                db.session.add(notification)
                db.session.commit()
                log_info(f"System notification created: {level} - {message[:50]}")
                return notification
        elif has_app_context():
            # We're already in an app context
            notification = SystemNotification(
                level=level.upper(),
                message=message[:500],
                source=source
            )
            db.session.add(notification)
            db.session.commit()
            log_info(f"System notification created: {level} - {message[:50]}")
            return notification
        else:
            log_warning(f"Cannot create system notification - no app context: {message[:50]}")
            return None
    except Exception as e:
        log_error(f"Failed to create system notification: {str(e)}")
        return None

# Example usage
if __name__ == "__main__":
    # Example logging
    setup_logging()
    log_info("This is an info message.")
    log_warning("This is a warning message.")
    log_error("This is an error message.")

    # Example save and load JSON
    sample_data = {"name": "Bitcoin", "price": 50000}
    save_json(sample_data, 'data.json')
    loaded_data = load_json('data.json')
    print(loaded_data)
    
    # Example date format
    print(format_datetime())
