#!/usr/bin/env python3
"""
Simple Email Configuration for Pravha
This script helps you set up one Gmail account to send alerts to all subscribers.
"""

def configure_email():
    print("🚀 Pravha Email Configuration")
    print("=" * 50)
    print()
    print("This will configure ONE Gmail account to send alerts to ALL subscribers.")
    print("You only need to set this up ONCE.")
    print()
    print("Steps:")
    print("1. Create a Gmail account for Pravha (or use your existing one)")
    print("2. Enable 2-Factor Authentication")
    print("3. Generate an App Password")
    print()
    
    # Get Gmail credentials
    gmail = input("Enter your Gmail address (for sending alerts): ").strip()
    app_password = input("Enter your Gmail App Password: ").strip()
    
    if not gmail or not app_password:
        print("❌ Both Gmail and App Password are required!")
        return
    
    # Update the alert_system.py file
    print("\n🔧 Updating email configuration...")
    
    try:
        # Read the current file
        with open('alert_system.py', 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Replace the email configuration
        content = content.replace(
            'sender_email = "pravha.alerts@gmail.com"  # Your sending Gmail',
            f'sender_email = "{gmail}"  # Your sending Gmail'
        )
        content = content.replace(
            'sender_password = "your-app-password"        # Your Gmail App Password',
            f'sender_password = "{app_password}"        # Your Gmail App Password'
        )
        
        # Write back to file
        with open('alert_system.py', 'w', encoding='utf-8') as f:
            f.write(content)
        
        print("✅ Email configuration updated successfully!")
        print()
        print("🎯 How it works:")
        print(f"   - Pravha will send alerts FROM: {gmail}")
        print("   - Alerts will be sent TO: Any Gmail address subscribers provide")
        print("   - Subscribers can add their Gmail in the web interface")
        print()
        print("📧 Next steps:")
        print("1. Restart the backend server")
        print("2. Go to http://localhost:3000")
        print("3. Add subscribers with their Gmail addresses")
        print("4. Test the alert system!")
        print()
        print("⚠️  Security Note:")
        print("   - Never share your Gmail App Password")
        print("   - This password is stored in the code (consider using environment variables)")
        
    except Exception as e:
        print(f"❌ Error updating configuration: {e}")

if __name__ == "__main__":
    configure_email()
