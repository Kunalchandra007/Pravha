#!/usr/bin/env python3
"""
Test Gmail Configuration for Pravha
"""

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email_config import GMAIL_CONFIG

def test_gmail_connection():
    print("🧪 Testing Gmail Configuration...")
    print(f"📧 Sender: {GMAIL_CONFIG['sender_email']}")
    print(f"🔑 App Password: {GMAIL_CONFIG['sender_password'][:4]}****")
    print()
    
    try:
        # Create test message
        msg = MIMEMultipart()
        msg['From'] = GMAIL_CONFIG['sender_email']
        msg['To'] = GMAIL_CONFIG['sender_email']  # Send test to yourself
        msg['Subject'] = "🧪 Pravha Gmail Test"
        
        body = """
Hello! This is a test email from Pravha.

✅ If you receive this email, your Gmail configuration is working correctly!
✅ Real flood alerts will now be sent to subscribers.

Best regards,
Pravha Team
"""
        msg.attach(MIMEText(body, 'plain'))
        
        # Connect to Gmail SMTP
        print("📡 Connecting to Gmail SMTP...")
        server = smtplib.SMTP(GMAIL_CONFIG['smtp_server'], GMAIL_CONFIG['smtp_port'])
        server.starttls()
        
        print("🔐 Authenticating with Gmail...")
        server.login(GMAIL_CONFIG['sender_email'], GMAIL_CONFIG['sender_password'])
        
        print("📤 Sending test email...")
        text = msg.as_string()
        server.sendmail(GMAIL_CONFIG['sender_email'], GMAIL_CONFIG['sender_email'], text)
        server.quit()
        
        print("✅ SUCCESS! Test email sent successfully!")
        print(f"📧 Check your inbox: {GMAIL_CONFIG['sender_email']}")
        return True
        
    except Exception as e:
        print(f"❌ FAILED: {e}")
        print()
        print("🔧 TROUBLESHOOTING:")
        print("1. Check if 2-Factor Authentication is enabled on Gmail")
        print("2. Verify the App Password is correct (16 characters)")
        print("3. Make sure you're using the App Password, not your regular Gmail password")
        print("4. Try generating a new App Password from Google")
        return False

if __name__ == "__main__":
    test_gmail_connection()
