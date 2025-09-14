"""
Email Configuration for Pravha Alert System
"""

# Gmail SMTP Configuration
GMAIL_CONFIG = {
    "sender_email": "kunalchandra25007@gmail.com",  # Your Gmail address
    "sender_password": "mrwuxiitzxskzfdo",  # Your Gmail App Password (spaces removed)
    "smtp_server": "smtp.gmail.com",
    "smtp_port": 587
}

# Instructions for setting up Gmail App Password:
"""
1. Enable 2-Factor Authentication on your Gmail account
2. Go to Google Account settings > Security > 2-Step Verification
3. Scroll down to "App passwords"
4. Generate a new app password for "Mail"
5. Use this 16-character password (not your regular Gmail password)
6. Replace "your-app-password" above with this app password
"""

# Alternative: Use environment variables (recommended for production)
import os

def get_email_config():
    """Get email configuration from environment variables or defaults"""
    return {
        "sender_email": os.getenv("GMAIL_EMAIL", GMAIL_CONFIG["sender_email"]),
        "sender_password": os.getenv("GMAIL_PASSWORD", GMAIL_CONFIG["sender_password"]),
        "smtp_server": GMAIL_CONFIG["smtp_server"],
        "smtp_port": GMAIL_CONFIG["smtp_port"]
    }