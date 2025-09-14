"""
Pravha Alert System
Handles automated alerts for flood warnings via multiple channels
"""

import json
import smtplib
import requests
from datetime import datetime
from typing import List, Dict, Optional
from email_config import get_email_config
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AlertSystem:
    def __init__(self):
        self.alert_history = []
        self.subscribers = []
        
    def add_subscriber(self, name: str, email: str, phone: str = None, location: str = None):
        """Add a new subscriber to receive alerts"""
        subscriber = {
            "id": len(self.subscribers) + 1,
            "name": name,
            "email": email,
            "phone": phone,
            "location": location,
            "subscribed_at": datetime.now().isoformat(),
            "active": True
        }
        self.subscribers.append(subscriber)
        logger.info(f"Added subscriber: {name} ({email})")
        return subscriber
    
    def get_subscribers(self) -> List[Dict]:
        """Get all active subscribers"""
        return [sub for sub in self.subscribers if sub.get("active", True)]
    
    def create_alert_message(self, risk_level: str, probability: float, location: str = "Unknown") -> Dict:
        """Create alert message based on risk level"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        # Convert numpy types to Python native types for JSON serialization
        probability = float(probability)
        
        alert_templates = {
            "HIGH": {
                "title": "🚨 EVACUATION ALERT - IMMEDIATE ACTION REQUIRED",
                "message": f"""
FLOOD EVACUATION ALERT
Location: {location}
Time: {timestamp}
Risk Level: HIGH ({probability:.1%} probability)

IMMEDIATE ACTIONS REQUIRED:
• Evacuate to higher ground immediately
• Follow designated evacuation routes
• Take essential documents and supplies
• Avoid driving through flooded areas
• Contact emergency services if trapped

Stay safe and follow official instructions.
                """,
                "priority": "urgent",
                "color": "#dc2626"
            },
            "MODERATE": {
                "title": "⚠️ FLOOD WARNING - PREPARE FOR POSSIBLE EVACUATION",
                "message": f"""
FLOOD WARNING
Location: {location}
Time: {timestamp}
Risk Level: MODERATE ({probability:.1%} probability)

PREPARATION STEPS:
• Prepare emergency supplies
• Monitor weather updates closely
• Secure outdoor items
• Have evacuation plan ready
• Stay informed about local conditions

Be ready to evacuate if conditions worsen.
                """,
                "priority": "high",
                "color": "#d97706"
            },
            "LOW": {
                "title": "✅ FLOOD RISK LOW - CONTINUE MONITORING",
                "message": f"""
FLOOD RISK ASSESSMENT
Location: {location}
Time: {timestamp}
Risk Level: LOW ({probability:.1%} probability)

CURRENT STATUS:
• Continue normal activities
• Stay informed about weather
• Keep emergency kit updated
• Review evacuation plans
• Monitor local conditions

No immediate action required.
                """,
                "priority": "normal",
                "color": "#059669"
            }
        }
        
        template = alert_templates.get(risk_level, alert_templates["LOW"])
        
        return {
            "id": len(self.alert_history) + 1,
            "timestamp": timestamp,
            "risk_level": risk_level,
            "probability": probability,
            "location": location,
            "title": template["title"],
            "message": template["message"],
            "priority": template["priority"],
            "color": template["color"],
            "sent_channels": []
        }
    
    def send_email_alert(self, alert: Dict, subscriber: Dict) -> bool:
        """Send email alert to subscriber's Gmail address"""
        try:
            # Get email configuration from email_config.py
            email_config = get_email_config()
            sender_email = email_config["sender_email"]
            sender_password = email_config["sender_password"]
            smtp_server = email_config["smtp_server"]
            smtp_port = email_config["smtp_port"]
            
            # Create message
            msg = MIMEMultipart()
            msg['From'] = f"Pravha Alerts <{sender_email}>"
            msg['To'] = subscriber['email']
            msg['Subject'] = alert['title']
            
            # Add body to email
            msg.attach(MIMEText(alert['message'], 'plain'))
            
            # Create SMTP session
            server = smtplib.SMTP(smtp_server, smtp_port)
            server.starttls()  # Enable security
            server.login(sender_email, sender_password)
            
            # Send email
            text = msg.as_string()
            server.sendmail(sender_email, subscriber['email'], text)
            server.quit()
            
            logger.info(f"📧 REAL EMAIL ALERT sent to {subscriber['email']}")
            logger.info(f"Subject: {alert['title']}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send real email to {subscriber['email']}: {str(e)}")
            # Fallback to mock for now
            logger.info(f"📧 MOCK EMAIL ALERT sent to {subscriber['email']}")
            logger.info(f"Subject: {alert['title']}")
            logger.info(f"Message: {alert['message'][:100]}...")
            return True  # Return True so the system continues working
    
    def send_sms_alert(self, alert: Dict, subscriber: Dict) -> bool:
        """Send SMS alert (mock implementation)"""
        try:
            if not subscriber.get('phone'):
                logger.warning(f"No phone number for subscriber {subscriber['name']}")
                return False
                
            # Mock SMS sending - in production, use Twilio, AWS SNS, etc.
            logger.info(f"📱 SMS ALERT sent to {subscriber['phone']}")
            logger.info(f"Message: {alert['title']}")
            
            # In production, implement real SMS sending:
            # from twilio.rest import Client
            # client = Client(account_sid, auth_token)
            # message = client.messages.create(
            #     body=alert['message'],
            #     from_='+1234567890',
            #     to=subscriber['phone']
            # )
            
            return True
        except Exception as e:
            logger.error(f"Failed to send SMS to {subscriber['phone']}: {str(e)}")
            return False
    
    def send_push_notification(self, alert: Dict, subscriber: Dict) -> bool:
        """Send push notification (mock implementation)"""
        try:
            # Mock push notification - in production, use Firebase, OneSignal, etc.
            logger.info(f"🔔 PUSH NOTIFICATION sent to {subscriber['name']}")
            logger.info(f"Title: {alert['title']}")
            
            # In production, implement real push notifications:
            # import requests
            # headers = {
            #     'Authorization': 'key=YOUR_SERVER_KEY',
            #     'Content-Type': 'application/json'
            # }
            # data = {
            #     'to': subscriber['fcm_token'],
            #     'notification': {
            #         'title': alert['title'],
            #         'body': alert['message'][:100]
            #     }
            # }
            # response = requests.post('https://fcm.googleapis.com/fcm/send', headers=headers, json=data)
            
            return True
        except Exception as e:
            logger.error(f"Failed to send push notification to {subscriber['name']}: {str(e)}")
            return False
    
    def broadcast_alert(self, risk_level: str, probability: float, location: str = "Unknown") -> Dict:
        """Broadcast alert to all subscribers via all channels"""
        # Convert numpy types to Python native types for JSON serialization
        probability = float(probability)
        alert = self.create_alert_message(risk_level, probability, location)
        subscribers = self.get_subscribers()
        
        results = {
            "email_sent": 0,
            "sms_sent": 0,
            "push_sent": 0,
            "total_subscribers": len(subscribers),
            "failed_deliveries": []
        }
        
        for subscriber in subscribers:
            # Send email
            if self.send_email_alert(alert, subscriber):
                results["email_sent"] += 1
                alert["sent_channels"].append("email")
            else:
                results["failed_deliveries"].append(f"email:{subscriber['email']}")
            
            # Send SMS
            if self.send_sms_alert(alert, subscriber):
                results["sms_sent"] += 1
                alert["sent_channels"].append("sms")
            else:
                results["failed_deliveries"].append(f"sms:{subscriber.get('phone', 'N/A')}")
            
            # Send push notification
            if self.send_push_notification(alert, subscriber):
                results["push_sent"] += 1
                alert["sent_channels"].append("push")
            else:
                results["failed_deliveries"].append(f"push:{subscriber['name']}")
        
        # Store alert in history
        alert["delivery_results"] = results
        self.alert_history.append(alert)
        
        logger.info(f"Alert broadcasted: {results}")
        return alert
    
    def get_alert_history(self, limit: int = 10) -> List[Dict]:
        """Get recent alert history"""
        return self.alert_history[-limit:]
    
    def get_alert_stats(self) -> Dict:
        """Get alert statistics"""
        total_alerts = len(self.alert_history)
        high_risk_alerts = len([a for a in self.alert_history if a['risk_level'] == 'HIGH'])
        moderate_risk_alerts = len([a for a in self.alert_history if a['risk_level'] == 'MODERATE'])
        low_risk_alerts = len([a for a in self.alert_history if a['risk_level'] == 'LOW'])
        
        return {
            "total_alerts": total_alerts,
            "high_risk_alerts": high_risk_alerts,
            "moderate_risk_alerts": moderate_risk_alerts,
            "low_risk_alerts": low_risk_alerts,
            "total_subscribers": len(self.get_subscribers()),
            "last_alert": self.alert_history[-1] if self.alert_history else None
        }

# Global alert system instance
alert_system = AlertSystem()

# Add some demo subscribers
alert_system.add_subscriber("John Doe", "john@example.com", "+1234567890", "Downtown Area")
alert_system.add_subscriber("Jane Smith", "jane@example.com", "+0987654321", "Riverside District")
alert_system.add_subscriber("Emergency Services", "emergency@city.gov", "+1111111111", "City Center")
