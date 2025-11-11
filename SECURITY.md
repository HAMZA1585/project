# Security Guide for News Monitoring Desk

## 🚨 CRITICAL SECURITY FIXES APPLIED

This document outlines the security vulnerabilities that were found and fixed in the codebase.

## Fixed Security Issues

### 1. Hardcoded Passwords (CRITICAL)
**Issue**: The `dataset_builder.py` file contained hardcoded passwords:
- `admin123` for admin user
- `editor123` for editor user  
- `user123` for regular users

**Fix Applied**: 
- Replaced hardcoded passwords with cryptographically secure random password generation
- Passwords are now generated using Python's `secrets` module
- Generated passwords are displayed once during dataset creation and must be saved securely

### 2. Hardcoded Secret Keys (CRITICAL)
**Issue**: The `config.py` file had hardcoded fallback secrets:
- `dev-secret` as fallback for SECRET_KEY
- `jwt-secret` as fallback for JWT_SECRET_KEY

**Fix Applied**:
- Removed hardcoded fallback secrets
- Application now requires proper environment variables to be set
- Added clear error messages when secrets are missing

### 3. Weak Password Requirements (HIGH)
**Issue**: Password validation only required 6 characters minimum

**Fix Applied**:
- Enhanced password requirements:
  - Minimum 8 characters
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
  - At least one special character
  - Rejection of common weak passwords

## Required Setup Steps

### 1. Environment Variables
Create a `.env` file in the backend directory using the provided template:

```bash
cp env.template .env
```

Then edit `.env` with your actual values:

```bash
# Generate secure secrets
python -c "import secrets; print('SECRET_KEY=' + secrets.token_urlsafe(32))"
python -c "import secrets; print('JWT_SECRET_KEY=' + secrets.token_urlsafe(32))"
```

### 2. Database Setup
The application will now fail to start without proper environment variables. This is intentional for security.

### 3. Dataset Generation
When running the dataset builder, secure passwords will be generated and displayed once:

```bash
cd backend
python dataset_builder.py build
```

**IMPORTANT**: Save the generated passwords securely - they will not be shown again!

## Security Best Practices

### 1. Environment Variables
- Never commit `.env` files to version control
- Use different secrets for different environments
- Rotate secrets regularly in production
- Consider using a secrets management service for production

### 2. Password Security
- Use strong, unique passwords for all accounts
- Enable two-factor authentication where possible
- Regularly audit user accounts and remove unused ones

### 3. Production Deployment
- Use HTTPS in production
- Set `FLASK_ENV=production`
- Use a production-grade database (PostgreSQL)
- Implement proper logging and monitoring
- Regular security updates and patches

### 4. API Keys
- Store API keys in environment variables
- Use different keys for different environments
- Monitor API usage for anomalies
- Rotate keys regularly

## Additional Security Recommendations

1. **Input Validation**: Ensure all user inputs are properly validated and sanitized
2. **SQL Injection**: The application uses SQLAlchemy ORM which provides protection, but always use parameterized queries
3. **XSS Protection**: Ensure all user-generated content is properly escaped
4. **CSRF Protection**: Consider implementing CSRF tokens for forms
5. **Rate Limiting**: Implement rate limiting for API endpoints
6. **Security Headers**: Add security headers like HSTS, CSP, etc.
7. **Regular Audits**: Conduct regular security audits and penetration testing

## Monitoring and Logging

- Monitor failed login attempts
- Log security-related events
- Set up alerts for suspicious activities
- Regular review of access logs

## Emergency Response

If you suspect a security breach:
1. Immediately change all passwords and secrets
2. Review access logs
3. Check for unauthorized access
4. Update all dependencies
5. Consider taking the application offline temporarily

## Contact

For security-related questions or to report vulnerabilities, please contact the development team.

---

**Remember**: Security is an ongoing process, not a one-time fix. Regular reviews and updates are essential.
