# Deployment Guide - Bookkeeping App to Production

## Quick Deploy (5 minutes)

### Step 1: Prepare Deployment Package
```bash
cd /path/to/bookkeeping-app
chmod +x deploy.sh
./deploy.sh user@bookkeeping-app.ca /home/bookkeeping-app
```

This creates a compressed package: `bookkeeping-app-deploy-[timestamp].tar.gz`

### Step 2: Transfer to Production Server
```bash
# Replace with your actual server details
scp bookkeeping-app-deploy-*.tar.gz user@bookkeeping-app.ca:/tmp/
```

### Step 3: SSH into Production Server
```bash
ssh user@bookkeeping-app.ca
cd /tmp
tar -xzf bookkeeping-app-deploy-*.tar.gz
cd bookkeeping-app-deploy-*
```

### Step 4: Run Deployment Script
```bash
chmod +x deploy-remote.sh
./deploy-remote.sh /home/bookkeeping-app
```

### Step 5: Verify Deployment
```bash
pm2 logs bookkeeping-app
# Look for: "ready - started server on 0.0.0.0:3000"
```

---

## What's Being Deployed

✅ **Receipt Scanning Feature** - Users can photograph receipts, Claude Vision extracts data automatically
✅ **Chat Assistant** - In-app help with refined UI
✅ **All Transaction Features** - Income/expense tracking, categorization, GST/HST
✅ **Financial Reports** - Balance sheets, income statements, aging reports
✅ **Bank Reconciliation** - Match transactions to bank statements

---

## Production Configuration

### Environment Variables
Update `.env.production` on the production server:

```env
# Required - Anthropic API Key (same as development)
ANTHROPIC_API_KEY=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

# Required - Change this to a secure random string
JWT_SECRET=your-production-secret-key-here-minimum-32-characters-recommended

# Required
NODE_ENV=production

# Database (if using PostgreSQL/Supabase)
NEXT_PUBLIC_SUPABASE_URL=your-production-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-production-key
SUPABASE_SERVICE_ROLE_SECRET=your-production-secret

# Stripe (if using Stripe for payments)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## Pre-Deployment Checklist

- [ ] `.next` build directory exists locally
- [ ] All code changes committed to git
- [ ] `.env.production` configured with production values
- [ ] Production server has Node.js 18+ installed
- [ ] Production server has `pm2` installed (`npm install -g pm2`)
- [ ] Production database is ready
- [ ] SSL certificate configured (if using HTTPS)

---

## Deployment Methods

### Method A: Using the deploy.sh script (Recommended)
```bash
./deploy.sh user@bookkeeping-app.ca /home/bookkeeping-app
```
**Pros:** Automated, includes backup, creates tarball
**Time:** ~5 minutes

### Method B: Manual Git Deploy
```bash
# On production server
git pull origin main
npm install
npm run build
pm2 restart bookkeeping-app
```
**Pros:** Simple, uses git
**Cons:** Requires build to succeed
**Time:** ~10 minutes

### Method C: Docker (If Available)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```
**Pros:** Consistent environments
**Cons:** Additional setup required

---

## Monitoring Deployment

### View Logs
```bash
pm2 logs bookkeeping-app
```

### Check Status
```bash
pm2 status
pm2 monit  # Real-time monitoring
```

### Restart App
```bash
pm2 restart bookkeeping-app
```

### Stop App
```bash
pm2 stop bookkeeping-app
```

### View All Processes
```bash
pm2 list
```

---

## Rollback (If Issues)

If something goes wrong after deployment:

```bash
cd /home/bookkeeping-app
# List available backups
ls -la backup-* 

# Restore previous version
rm -rf current
mv backup-[timestamp] current
cd current
pm2 restart bookkeeping-app
```

---

## Post-Deployment Verification

1. **Check App is Running**
   ```bash
   curl http://localhost:3000
   ```

2. **Test Receipt Scanner**
   - Navigate to `/receipts`
   - Upload a test receipt image
   - Verify Claude Vision extracts data

3. **Test Chat Assistant**
   - Click "Get Help" in header
   - Send a test message
   - Verify response

4. **Check Database Connection**
   - Create a test transaction
   - Verify it appears in dashboard

5. **Test Auth**
   - Logout and login
   - Verify JWT tokens work

---

## Performance Optimization (Optional)

### Enable Nginx Reverse Proxy
```nginx
server {
    listen 80;
    server_name bookkeeping-app.ca;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Enable SSL with Let's Encrypt
```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot certonly --nginx -d bookkeeping-app.ca
```

---

## Support

If deployment fails:
1. Check logs: `pm2 logs bookkeeping-app`
2. Verify environment variables: `env | grep ANTHROPIC`
3. Test API key: `curl -X POST https://api.anthropic.com/v1/messages` (with auth header)
4. Check disk space: `df -h`
5. Check memory: `free -h`

---

## Deployment History

| Date | Version | Status | Notes |
|------|---------|--------|-------|
| 2026-05-23 | v1 + Receipt Scanner | ✓ Ready | Initial deployment with Receipt Scanning feature |
