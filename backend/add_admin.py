import secrets
import string
from app import create_app, db
from app.models import User

def generate_secure_password(length=12):
    """Generate a secure random password with letters, digits, and symbols."""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    return ''.join(secrets.choice(alphabet) for _ in range(length))

app = create_app()

with app.app_context():
    # Generate secure password
    password = generate_secure_password()
    
    test_user = User(username="admin", email="admin@example.com", role="admin")
    test_user.set_password(password)
    db.session.add(test_user)
    db.session.commit()

    print("Admin user created successfully")
    print("Password has been set securely - check your secure password manager")
    users = User.query.all()
    print(f"Total users in database: {len(users)}")
