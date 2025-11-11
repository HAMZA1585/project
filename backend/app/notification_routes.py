from flask import Blueprint, request, jsonify, current_app
import smtplib
import requests
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from datetime import datetime

notification_bp = Blueprint('notifications', __name__)

# Normalize SMTP env names
SMTP_HOST = os.getenv('SMTP_HOST') or os.getenv('SMTP_SERVER', 'smtp.gmail.com')
SMTP_PORT = int(os.getenv('SMTP_PORT', os.getenv('SMTP_PORT', '587')))
SMTP_USERNAME = os.getenv('SMTP_USERNAME', '')
SMTP_PASSWORD = os.getenv('SMTP_PASSWORD', '')

# Normalize Twilio env names
TWILIO_ACCOUNT_SID = os.getenv('TWILIO_ACCOUNT_SID', '')
TWILIO_AUTH_TOKEN = os.getenv('TWILIO_AUTH_TOKEN', '')
TWILIO_FROM_NUMBER = os.getenv('TWILIO_FROM_NUMBER') or os.getenv('TWILIO_PHONE_NUMBER', '')

# Firebase Cloud Messaging
FCM_SERVER_KEY = os.getenv('FCM_SERVER_KEY', '')
FCM_API_URL = 'https://fcm.googleapis.com/fcm/send'

@notification_bp.route('/email', methods=['POST'])
# (kept the same handler name but provide cleaner route under blueprint prefix)
def send_email_notification():
    try:
        data = request.get_json() or {}
        for field in ['to', 'subject', 'body']:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        msg = MIMEMultipart()
        msg['From'] = SMTP_USERNAME
        msg['To'] = data['to']
        msg['Subject'] = data['subject']
        msg.attach(MIMEText(data['body'], 'plain'))
        if SMTP_USERNAME and SMTP_PASSWORD:
            server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
            server.starttls()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.sendmail(SMTP_USERNAME, data['to'], msg.as_string())
            server.quit()
            current_app.logger.info(f"Email sent successfully to {data['to']}")
            return jsonify({'message': 'Email sent successfully'}), 200
        current_app.logger.warning('Email service not configured')
        return jsonify({'message': 'Email service not configured'}), 200
    except Exception as e:
        current_app.logger.error(f"Error sending email: {str(e)}")
        return jsonify({'error': 'Failed to send email'}), 500

@notification_bp.route('/sms', methods=['POST'])
def send_sms_notification():
    try:
        data = request.get_json() or {}
        for field in ['to', 'message']:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN and TWILIO_FROM_NUMBER:
            from twilio.rest import Client
            client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
            message = client.messages.create(
                body=data['message'],
                from_=TWILIO_FROM_NUMBER,
                to=data['to']
            )
            current_app.logger.info(f"SMS sent successfully to {data['to']}: {message.sid}")
            return jsonify({'message': 'SMS sent successfully', 'sid': message.sid}), 200
        current_app.logger.warning('SMS service not configured')
        return jsonify({'message': 'SMS service not configured'}), 200
    except Exception as e:
        current_app.logger.error(f"Error sending SMS: {str(e)}")
        return jsonify({'error': 'Failed to send SMS'}), 500

@notification_bp.route('/push', methods=['POST'])
def send_push_notification():
    """Send push notification via FCM. Expects token(s) or topic."""
    try:
        data = request.get_json() or {}
        title = data.get('title') or 'Notification'
        body = data.get('body') or ''
        token = data.get('token')
        tokens = data.get('tokens')
        topic = data.get('topic')
        payload = {
            'notification': {
                'title': title,
                'body': body
            },
            'data': data.get('data', {})
        }
        if not FCM_SERVER_KEY:
            current_app.logger.warning('FCM not configured; logging push only')
            current_app.logger.info(f"Push notification: {title} - {body}")
            return jsonify({'message': 'Push notification logged'}), 200
        headers = {
            'Authorization': f'key={FCM_SERVER_KEY}',
            'Content-Type': 'application/json'
        }
        if token:
            payload['to'] = token
        elif tokens:
            payload['registration_ids'] = tokens
        elif topic:
            payload['to'] = f'/topics/{topic}'
        else:
            return jsonify({'error': 'Missing token(s) or topic'}), 400
        resp = requests.post(FCM_API_URL, headers=headers, json=payload, timeout=10)
        if resp.ok:
            return jsonify({'message': 'Push sent', 'fcm': resp.json()}), 200
        current_app.logger.error(f"FCM error: {resp.status_code} {resp.text}")
        return jsonify({'error': 'Failed to send push'}), 502
    except Exception as e:
        current_app.logger.error(f"Error processing push notification: {str(e)}")
        return jsonify({'error': 'Failed to process push notification'}), 500

@notification_bp.route('/test', methods=['POST'])
def test_notification():
    """Test notification endpoint"""
    try:
        data = request.get_json()
        notification_type = data.get('type', 'unknown')
        
        current_app.logger.info(f"Test notification received: {notification_type}")
        
        return jsonify({
            'message': 'Test notification received',
            'type': notification_type,
            'timestamp': datetime.utcnow().isoformat()
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error processing test notification: {str(e)}")
        return jsonify({'error': 'Failed to process test notification'}), 500

@notification_bp.route('/status', methods=['GET'])
def notification_status():
    try:
        status = {
            'email_configured': bool(SMTP_USERNAME and SMTP_PASSWORD),
            'sms_configured': bool(TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN and TWILIO_FROM_NUMBER),
            'push_configured': bool(FCM_SERVER_KEY),
            'timestamp': datetime.utcnow().isoformat()
        }
        return jsonify(status), 200
    except Exception as e:
        current_app.logger.error(f"Error getting notification status: {str(e)}")
        return jsonify({'error': 'Failed to get notification status'}), 500
