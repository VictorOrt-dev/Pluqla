# 🚀 Pluqla Production Deployment Guide

**Version**: v2.0.0-production
**Date**: December 2024
**Status**: Production Ready with Better Auth

---

## 📋 Pre-Deployment Checklist

### ✅ **Security Hardening Completed**
- [x] PostgreSQL migration (SQLite → PostgreSQL)
- [x] Better Auth integration with session-based authentication
- [x] JWT secrets upgraded to 64-character cryptographically secure keys
- [x] Legacy JWT compatibility layer implemented
- [x] Financial calculations migrated to decimal.js (no floating-point errors)
- [x] PSD2 Strong Customer Authentication (SCA) implemented
- [x] AI endpoint protection with PII sanitization
- [x] Role-based access control (User/Premium/Admin)
- [x] Sensitive logging removed from authentication flows
- [x] React Error Boundaries implemented
- [x] AES-256-GCM encryption for financial data
- [x] Rate limiting on financial endpoints by user tier

### ✅ **Code Quality**
- [x] Legacy components removed
- [x] Debug utilities cleaned up
- [x] Console.log statements sanitized
- [x] Build process verified (warnings only, no errors)
- [x] No high-severity security vulnerabilities

### ✅ **Database & Infrastructure**
- [x] PostgreSQL schema ready
- [x] Migration scripts prepared
- [x] Environment variables secured
- [x] Backup procedures defined

---

## 🏗️ Infrastructure Requirements

### **Server Requirements**
```bash
# Minimum Production Specs
CPU: 2 vCPU
RAM: 4GB
Storage: 20GB SSD
Network: 1Gbps
```

### **Database Requirements**
```bash
# PostgreSQL 14+
CPU: 2 vCPU
RAM: 4GB
Storage: 50GB SSD (with daily backups)
Connections: 100 max concurrent
```

### **Environment Variables**
```env
# ===== CORE APPLICATION =====
NODE_ENV=production
PORT=3004
BASE_URL=https://your-domain.com

# ===== DATABASE =====
DATABASE_URL=postgresql://pluqla_user:secure_password@host:5432/pluqla_prod

# ===== BETTER AUTH (PRIMARY) =====
BETTER_AUTH_SECRET=your_64_character_secret_generated_with_openssl_rand_hex_32
BASE_URL=https://your-domain.com

# ===== JWT SECRETS (LEGACY COMPATIBILITY) =====
JWT_SECRET=your_64_character_cryptographically_secure_secret_here_abc123
JWT_REFRESH_SECRET=your_64_character_refresh_secret_different_from_access
JWT_EMAIL_SECRET=your_64_character_email_verification_secret_unique_key
JWT_PASSWORD_RESET_SECRET=your_64_character_password_reset_secret_secure

# ===== GOOGLE OAUTH =====
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# ===== SECURITY KEYS =====
FINANCIAL_ENCRYPTION_KEY=your_64_character_financial_encryption_key
BANK_ENCRYPTION_KEY=your_64_character_bank_encryption_key
SESSION_SECRET=your_session_secret_32_characters_minimum

# ===== CORS & SECURITY =====
CORS_ORIGIN=https://your-domain.com
TRUST_PROXY=true

# ===== REDIS CACHE =====
REDIS_URL=redis://localhost:6379

# ===== EMAIL SERVICE =====
EMAIL_ENABLED=true
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_SECURE=true
SMTP_USER=noreply@your-domain.com
SMTP_PASS=your-secure-smtp-password
SMTP_FROM=noreply@your-domain.com

# ===== AI SERVICES =====
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your-openai-api-key
ANTHROPIC_API_KEY=sk-ant-your-claude-api-key
GOOGLE_AI_API_KEY=your-gemini-api-key
AI_ANONYMIZATION_SALT=your-ai-anonymization-salt-2024

# ===== RATE LIMITING =====
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# ===== MONITORING =====
LOG_LEVEL=info
SENTRY_DSN=your-sentry-dsn
METRICS_ENABLED=true
```

---

## 🚀 Deployment Steps

### **1. Server Setup**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL 14+
sudo apt install postgresql postgresql-contrib

# Install Redis
sudo apt install redis-server

# Install PM2 for process management
npm install -g pm2
```

### **2. Application Deployment**
```bash
# Clone repository
git clone https://github.com/your-org/pluqla.git
cd pluqla

# Checkout production branch
git checkout v1.0.0-production

# Install dependencies
npm run install:all

# Configure environment
cp .env.example .env
# Edit .env with production values

# Database setup with Better Auth
cd server
npx prisma migrate deploy
npx prisma generate

# Build client
cd ../client
npm run build

# Test deployment
cd ../server
npm test                    # Verify critical tests pass
npm run test:auth          # Verify Better Auth integration
npm run test:auth:coverage # Run authentication test suite
```

### **3. Process Management**
```bash
# Create PM2 ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'pluqla-server',
      script: './server/src/server.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3004
      },
      error_file: './logs/server-error.log',
      out_file: './logs/server-out.log',
      log_file: './logs/server-combined.log',
      time: true
    }
  ]
};
EOF

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### **4. Reverse Proxy (Nginx)**
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL Configuration
    ssl_certificate /path/to/ssl/certificate.crt;
    ssl_certificate_key /path/to/ssl/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;

    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";

    # Client build files
    location / {
        root /path/to/pluqla/client/build;
        try_files $uri $uri/ /index.html;

        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # API proxy
    location /api {
        proxy_pass http://localhost:3004;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:3004/api/health;
        access_log off;
    }
}
```

---

## 🔐 Security Configuration

### **Database Security**
```sql
-- Create dedicated database user
CREATE USER pluqla_app WITH PASSWORD 'secure_database_password_here';

-- Grant minimal required permissions
GRANT CONNECT ON DATABASE pluqla_prod TO pluqla_app;
GRANT USAGE ON SCHEMA public TO pluqla_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO pluqla_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO pluqla_app;

-- Enable row-level security
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Transaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FinancialAccount" ENABLE ROW LEVEL SECURITY;
```

### **Firewall Configuration**
```bash
# UFW firewall setup
sudo ufw enable
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw deny 3004/tcp   # Block direct API access
sudo ufw deny 5432/tcp   # Block direct DB access
```

### **SSL/TLS Certificate**
```bash
# Using Let's Encrypt
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
sudo certbot renew --dry-run
```

---

## 📊 Monitoring & Logging

### **Application Monitoring**
```bash
# Install monitoring tools
npm install -g @sentry/cli

# PM2 monitoring
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### **Health Checks**
```bash
# Create health check script
cat > health-check.sh << 'EOF'
#!/bin/bash
API_URL="http://localhost:3004/api/health"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $API_URL)

if [ $RESPONSE -eq 200 ]; then
    echo "✅ API is healthy"
    exit 0
else
    echo "❌ API health check failed (HTTP $RESPONSE)"
    exit 1
fi
EOF

chmod +x health-check.sh

# Add to crontab for monitoring
echo "*/5 * * * * /path/to/health-check.sh >> /var/log/pluqla-health.log 2>&1" | crontab -
```

### **Log Management**
```bash
# Centralized logging with rsyslog
sudo echo "local0.*    /var/log/pluqla/app.log" >> /etc/rsyslog.conf
sudo systemctl restart rsyslog

# Log rotation
sudo cat > /etc/logrotate.d/pluqla << 'EOF'
/var/log/pluqla/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    sharedscripts
    postrotate
        systemctl reload rsyslog
    endscript
}
EOF
```

---

## 🔄 Backup & Recovery

### **Database Backups**
```bash
# Daily automated backups
cat > backup-database.sh << 'EOF'
#!/bin/bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/pluqla"
DB_NAME="pluqla_prod"

mkdir -p $BACKUP_DIR

# Create backup
pg_dump $DB_NAME | gzip > $BACKUP_DIR/pluqla_$TIMESTAMP.sql.gz

# Keep only last 30 days
find $BACKUP_DIR -name "pluqla_*.sql.gz" -mtime +30 -delete

echo "Backup completed: pluqla_$TIMESTAMP.sql.gz"
EOF

chmod +x backup-database.sh

# Schedule daily backups
echo "0 2 * * * /path/to/backup-database.sh >> /var/log/backup.log 2>&1" | crontab -
```

### **Application Backups**
```bash
# Create full system backup
tar -czf /backup/pluqla-app-$(date +%Y%m%d).tar.gz \
  --exclude=node_modules \
  --exclude=.git \
  /path/to/pluqla/
```

---

## 🚨 Incident Response

### **Emergency Procedures**
```bash
# Stop application
pm2 stop all

# Emergency database snapshot
pg_dump pluqla_prod > /emergency/emergency_backup_$(date +%Y%m%d_%H%M%S).sql

# Rollback deployment
git checkout previous-stable-tag
npm run install:all
pm2 restart all

# Check logs
pm2 logs
tail -f /var/log/nginx/error.log
```

### **Contact Information**
- **DevOps Lead**: your-email@company.com
- **Security Team**: security@company.com
- **Database Admin**: dba@company.com
- **Emergency Hotline**: +1-XXX-XXX-XXXX

---

## 📋 Post-Deployment Verification

### **Functional Tests**
```bash
# API Health Check
curl https://your-domain.com/api/health

# Better Auth Health Check
curl https://your-domain.com/api/auth/session

# Authentication Test (Better Auth)
curl -X POST https://your-domain.com/api/auth/sign-up \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123","name":"Test User"}'

curl -X POST https://your-domain.com/api/auth/sign-in \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123"}'

# Protected AI Endpoint Test
curl -X POST https://your-domain.com/api/ai-secure/suggestions \
  -H "Content-Type: application/json" \
  -H "Cookie: better-auth.session-token=SESSION_TOKEN_HERE" \
  -d '{"category":"groceries","amount":50}'

# Frontend Test
curl -I https://your-domain.com/
```

### **Security Tests**
```bash
# SSL Certificate Verification
openssl s_client -connect your-domain.com:443 -servername your-domain.com

# Security Headers Check
curl -I https://your-domain.com/

# Database Connection Test
psql postgresql://username:password@host:5432/pluqla_prod -c "SELECT NOW();"
```

### **Performance Tests**
```bash
# Load testing with Apache Bench
ab -n 1000 -c 10 https://your-domain.com/api/health

# Memory usage monitoring
pm2 monit
```

---

## 🔧 Maintenance

### **Regular Tasks**
- **Daily**: Check application logs and health status
- **Weekly**: Review security logs and update dependencies
- **Monthly**: Full system backup and security audit
- **Quarterly**: Performance optimization and capacity planning

### **Update Procedures**
```bash
# 1. Create backup
./backup-database.sh

# 2. Pull latest changes
git fetch origin
git checkout new-version-tag

# 3. Update dependencies
npm run install:all

# 4. Run migrations
cd server && npx prisma migrate deploy

# 5. Rebuild client
cd ../client && npm run build

# 6. Restart services
pm2 restart all

# 7. Verify deployment
./health-check.sh
```

---

## 📞 Support & Troubleshooting

### **Common Issues**

#### Database Connection Issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test connection
psql -h localhost -U pluqla_app -d pluqla_prod -c "SELECT 1;"

# Check connection limits
psql -c "SELECT count(*) FROM pg_stat_activity;"
```

#### Performance Issues
```bash
# Check PM2 processes
pm2 list
pm2 monit

# Check system resources
htop
iotop
df -h
```

#### SSL Certificate Issues
```bash
# Renew Let's Encrypt certificate
sudo certbot renew

# Test SSL configuration
openssl s_client -connect your-domain.com:443
```

---

## 📄 Compliance & Documentation

### **Regulatory Compliance**
- **PSD2**: Strong Customer Authentication implemented
- **GDPR**: Data protection and user consent mechanisms
- **SOC2**: Audit logging and access controls
- **ISO 27001**: Security management system

### **Documentation**
- [Security Audit Report](./SECURITY_AUDIT.md)
- [API Documentation](../server/docs/api.md)
- [Database Schema](../server/prisma/schema.prisma)
- [Monitoring Runbook](./MONITORING.md)

---

**🚀 Deployment completed successfully!**
**Next Steps**: Monitor application performance and user feedback for the first 48 hours.