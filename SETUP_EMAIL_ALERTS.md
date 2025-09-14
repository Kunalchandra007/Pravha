# 📧 Pravha Email Alert Setup Guide

## 🎯 **What This Does**
- Send real flood alerts to ANY Gmail address
- Subscribers can add their Gmail addresses through the web interface
- You only need to configure ONE Gmail account to send to everyone

## 🚀 **Quick Setup (5 minutes)**

### **Step 1: Configure Your Sending Gmail Account**

1. **Run the configuration script:**
   ```bash
   cd backend
   python configure_email.py
   ```

2. **Follow the prompts:**
   - Enter your Gmail address (this will be the sender)
   - Enter your Gmail App Password

### **Step 2: Get Gmail App Password**

1. Go to: https://myaccount.google.com/security
2. Enable **2-Factor Authentication** (if not already enabled)
3. Scroll down to **"App passwords"**
4. Click **"Select app"** → Choose **"Mail"**
5. Click **"Select device"** → Choose **"Other"** → Enter **"Pravha"**
6. Click **"Generate"**
7. Copy the 16-character password (e.g., 'abcd efgh ijkl mnop')

### **Step 3: Test the System**

1. **Restart the backend:**
   ```bash
   cd backend
   python app_with_alerts.py
   ```

2. **Open the web interface:** http://localhost:3000

3. **Add a test subscriber:**
   - Go to "Alert Management" tab
   - Click "+ Add Subscriber"
   - Enter your own Gmail address
   - Click "Add Subscriber"

4. **Test alerts:**
   - Click "Test High Risk" button
   - Check your Gmail inbox for the alert!

## 🎯 **How It Works**

### **For You (System Admin):**
- Configure ONE Gmail account to send alerts
- This account sends emails to all subscribers

### **For Subscribers:**
- Add their Gmail address through the web interface
- Receive flood alerts at their Gmail address
- Can remove themselves anytime

## 📧 **Email Features**

### **Alert Types:**
- **HIGH RISK**: 🚨 Evacuation alerts
- **MODERATE RISK**: ⚠️ Flood warnings  
- **LOW RISK**: ✅ Continue monitoring

### **Email Content:**
- Professional flood alert format
- Risk level and probability
- Location and timestamp
- Action instructions
- Emergency contact info

## 🔧 **Troubleshooting**

### **If emails aren't sending:**
1. Check Gmail App Password is correct
2. Ensure 2-Factor Authentication is enabled
3. Check backend console for error messages
4. Verify Gmail address format

### **If subscribers can't be added:**
1. Check backend is running on port 8002
2. Check frontend is running on port 3000
3. Look for CORS errors in browser console

## 🎉 **Success!**

Once configured, your Pravha system will:
- ✅ Send real emails to any Gmail address
- ✅ Allow easy subscriber management
- ✅ Provide professional flood alerts
- ✅ Work with any number of subscribers

## 🔒 **Security Notes**

- Never share your Gmail App Password
- Consider using environment variables in production
- The sending Gmail account should be dedicated to Pravha
- Subscribers only need to provide their Gmail address

---

**Need help?** Check the backend console for detailed error messages!
