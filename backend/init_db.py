from app import create_app, db

# Initialize the app
app = create_app()

# Create all the tables in the database
with app.app_context():
    db.create_all()  # This will create all tables based on the models you have defined
