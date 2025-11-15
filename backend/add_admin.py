from app import create_app, db
from app.models import User

# --- Create a simple password ---
password = "admin"
# ---------------------------------

app = create_app()

with app.app_context():
    # Check if admin user already exists
    test_user = User.query.filter_by(username="admin").first()
    
    if test_user:
        # If user exists, just update the password
        test_user.set_password(password)
        print("Admin user already exists.")
        print(f"Password has been RESET to: {password}")
    else:
        # If user doesn't exist, create a new one
        test_user = User(username="admin", email="admin@example.com", role="admin")
        test_user.set_password(password)
        db.session.add(test_user)
        print("Admin user created successfully.")
        print(f"Password has been SET to: {password}")

    db.session.commit()
    
    users = User.query.all()
    print(f"Total users in database: {len(users)}")
