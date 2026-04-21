# FarmTrack Deployment Guide

## 🌐 Option 1: Cloud Hosting (Recommended)

### Render.com Deployment (Free Tier)

1. **Create Render Account:**
   - Go to https://render.com
   - Sign up for free account

2. **Push Code to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/farmtrack.git
   git push -u origin main
   ```

3. **Deploy on Render:**
   - Click "New+" → "Web Service"
   - Connect your GitHub repository
   - Configure:
     - **Build Command:** `pip install -r requirements.txt`
     - **Start Command:** `gunicorn app:app`
     - **Runtime:** Python 3.9+

4. **Environment Variables:**
   - Add: `JWT_SECRET_KEY` (generate a secure key)

5. **Get Your URL:**
   - Render will provide: `https://your-app.onrender.com`

### Railway.app Deployment

1. **Create Railway Account:** https://railway.app
2. **Deploy from GitHub:** Similar to Render
3. **Get URL:** Railway provides a public URL

---

## 🏠 Option 2: Home Server (Free)

### Port Forwarding (Immediate Access)

1. **Find Your Public IP:**
   - Visit: https://whatismyipaddress.com
   - Note your public IP address

2. **Configure Router Port Forwarding:**
   - Access router admin: usually `192.168.1.1` or `192.168.0.1`
   - Find "Port Forwarding" section
   - Forward port 5000 to your computer's local IP (10.81.57.195)

3. **Access URL:**
   ```
   http://YOUR_PUBLIC_IP:5000
   ```

4. **Security Note:**
   - Consider using a reverse proxy (nginx)
   - Add HTTPS with Let's Encrypt
   - Keep your firewall updated

---

## 🌍 Option 3: VPS Hosting

### DigitalOcean / AWS EC2

1. **Create VPS:**
   - DigitalOcean: $4/month (512MB RAM)
   - AWS EC2: Free tier available

2. **Setup Server:**
   ```bash
   # SSH into server
   ssh root@your_server_ip
   
   # Install dependencies
   apt update
   apt install python3 python3-pip nginx
   
   # Clone your app
   git clone https://github.com/YOUR_USERNAME/farmtrack.git
   cd farmtrack/backend
   pip3 install -r requirements.txt
   ```

3. **Setup Gunicorn:**
   ```bash
   gunicorn -w 4 -b 0.0.0.0:5000 app:app
   ```

4. **Setup Nginx Reverse Proxy:**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:5000;
           proxy_set_header Host $host;
       }
   }
   ```

---

## 🔧 Database Considerations

### For Cloud Deployment:

**Option A: Use Cloud Database (Recommended)**
- **PostgreSQL** on Render/Railway
- **MySQL** on AWS RDS
- Update `database.py` to use cloud DB

**Option B: Keep SQLite (Simple)**
- Works for single-user apps
- Not recommended for multi-client
- File storage limitations on cloud

---

## 🔒 Security for Client Access

### Essential Security Steps:

1. **Strong JWT Secret:**
   ```python
   # Generate secure key
   import secrets
   print(secrets.token_hex(32))
   ```

2. **HTTPS Certificate:**
   - Use Let's Encrypt (free)
   - Most cloud platforms provide automatic SSL

3. **Rate Limiting:**
   - Add rate limiting to prevent abuse
   - Use `flask-limiter` extension

4. **User Management:**
   - Create separate accounts for each client
   - Use proper role-based access control

---

## 📱 Client Access Setup

### For Each Client:

1. **Create User Account:**
   ```python
   # Via admin panel or database
   INSERT INTO users (name, email, password, role) 
   VALUES ('Client Name', 'client@email.com', 'hashed_password', 'client')
   ```

2. **Provide Login Details:**
   - Share login URL
   - Provide username/password
   - Give user guide

3. **Set Permissions:**
   - Limit access to their data only
   - Use `user_id` filtering in all queries

---

## 🚀 Quick Start (Fastest Option)

### For Immediate Client Access:

**Use ngrok (Temporary):**
```bash
# Install ngrok
# Download from https://ngrok.com

# Run ngrok
ngrok http 5000

# Share the URL provided by ngrok
# Example: https://abc123.ngrok.io
```

**Note:** ngrok is free for development, URL changes on restart

---

## 📊 Monitoring & Maintenance

### After Deployment:

1. **Monitor Performance:**
   - Set up logging
   - Monitor database size
   - Track user activity

2. **Regular Backups:**
   - Automated database backups
   - Code repository backups
   - Disaster recovery plan

3. **Updates:**
   - Regular security updates
   - Feature updates
   - Bug fixes

---

## 🎯 Recommended for You:

**For immediate client sharing:**
1. **Start with ngrok** (5 minutes setup)
2. **Move to Render.com** (professional, free tier)
3. **Scale to VPS** if needed (more control)

**For long-term client business:**
1. **Render.com or Railway.app** (easiest)
2. **Custom domain** (professional appearance)
3. **Cloud database** (multi-user support)
4. **SSL certificate** (security)

---

## 📞 Support

For deployment help:
- Render docs: https://render.com/docs
- Railway docs: https://docs.railway.app
- Flask deployment: https://flask.palletsprojects.com/en/latest/deploying/
