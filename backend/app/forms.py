from flask_wtf import FlaskForm
from wtforms import StringField, SubmitField, PasswordField, SelectField
from wtforms.validators import DataRequired, Email, EqualTo, Length, ValidationError
from .models import User

class SignUpForm(FlaskForm):
    username = StringField("Username", validators=[
        DataRequired(),
        Length(min=2, max=20, message="Username must be between 2 and 20 characters")
    ])
    email = StringField("Email", validators=[
        DataRequired(),
        Email(message="Please enter a valid email")
    ])
    password = PasswordField('Password', validators=[
        DataRequired(),
        Length(min=6, message="Password should be at least 6 characters")
    ])
    confirm_password = PasswordField('Confirm Password', validators=[
        DataRequired(),
        EqualTo('password', message='Passwords do not match')
    ])
    role = SelectField("Role", choices=[
        ('admin', 'Administrator'), ('user', 'User')],
        validators=[DataRequired(message="Please select a role.")]
    )
    submit = SubmitField("Sign Up")

    def validate_email(self, email):
        user = User.query.filter_by(email=email.data).first()
        if user:
            raise ValidationError("A user with that email already exists.")


class LoginForm(FlaskForm):
    email = StringField("Email", validators=[
        DataRequired(),
        Email(message="Please enter a valid email")
    ])
    password = PasswordField('Password', validators=[
        DataRequired(),
        Length(min=6, message="Password should be at least 6 characters")
    ])
    submit = SubmitField("Login")
