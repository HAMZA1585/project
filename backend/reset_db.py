from app import create_app, db  # Import create_app and db from your backend

# Create an instance of the Flask app
app = create_app()

# Use the app context to interact with the database
with app.app_context():
    db.drop_all()  # Drop all tables
    db.create_all()  # Create tables from models
    print("Database has been reset!")
