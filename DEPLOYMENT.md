# YantraStack - Server Configuration & Deployment Guide

This guide covers deployment instructions and server configuration for YantraStack on various platforms.

## Table of Contents

1. [General Requirements](#general-requirements)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [Nginx Configuration](#nginx-configuration)
4. [Apache Configuration](#apache-configuration)
5. [Node.js/Express Configuration](#nodejs-express-configuration)
6. [SSL/HTTPS Setup](#ssltls-setup)
7. [Performance Optimization](#performance-optimization)
8. [Security Headers](#security-headers)
9. [Caching Strategy](#caching-strategy)
10. [Monitoring & Logs](#monitoring--logs)

---

## General Requirements

### Minimum Server Requirements

- **OS**: Linux (Ubuntu 20.04+), Windows Server, or macOS Server
- **Web Server**: Nginx, Apache 2.4+, or Node.js
- **Node.js**: v14+ (for Node.js deployment only)
- **Storage**: Minimum 500MB free space
- **RAM**: 512MB minimum (1GB+ recommended)
- **Bandwidth**: Depends on expected traffic

### Browser Requirements for Users

- Chrome/Chromium (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome for Android)

---

## Pre-Deployment Checklist

Before deploying to production, verify:

- [ ] Domain name: `yantrastack.com` configured in DNS
- [ ] SSL certificate obtained (Let's Encrypt recommended)
- [ ] All environment-specific URLs updated
- [ ] `.gitignore` properly configured
- [ ] `node_modules/` excluded from deployment
- [ ] CSS built with: `npm run build`
- [ ] Minified JS files present in `/assets/js/dist/`
- [ ] All third-party vendor libraries present
- [ ] 404.html and 500.html pages configured
- [ ] robots.txt and sitemap.xml present
- [ ] HTTPS redirect configured
- [ ] Gzip compression enabled
- [ ] Security headers configured
- [ ] Error logging configured

---

## Nginx Configuration

### Basic Server Block

Create a new server configuration at `/etc/nginx/sites-available/yantrastack.com`:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name yantrastack.com www.yantrastack.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name yantrastack.com www.yantrastack.com;

    # SSL Certificate Configuration
    ssl_certificate /etc/letsencrypt/live/yantrastack.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yantrastack.com/privkey.pem;

### PWA manifest & icons

Place `assets/manifest.json` at the site root and provide PNG icon files referenced there under `assets/img/`.

I included an example `assets/manifest.json` in the repo and a PowerShell helper to generate PNG variants from your SVGs:

- `assets/manifest.json` — manifest with standard icon sizes (72–512).
- `deploy/convert_logos.ps1` — powershell script that uses ImageMagick (`magick`) to generate `assets/img/icon-<size>.png` files; it writes transparent placeholders if ImageMagick isn't installed.

Run the generator from the `deploy` directory:

```powershell
cd deploy
.\convert_logos.ps1
```

After placing icons, add this to your HTML `<head>`:

```html
<link rel="manifest" href="/assets/manifest.json">
<meta name="theme-color" content="#B11226">
```

    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Root Directory
    root /var/www/yantrastack;
    index index.html;

    # GZIP Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1000;
    gzip_proxied any;
    gzip_types text/plain text/css text/xml text/javascript 
               application/x-javascript application/xml+rss 
               application/javascript application/json;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;

    # Content Security Policy
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-dom'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self'" always;

    # Cache Control for Static Assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # No Caching for HTML
    location ~* \.html$ {
        expires -1;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # Deny Access to Hidden Files
    location ~ /\. {
        deny all;
    }

    # Deny Access to Sensitive Files
    location ~ ~$ {
        deny all;
    }

    # 404 Error Page
    error_page 404 /404.html;
    location = /404.html {
        internal;
    }

    # 500 Error Page
    error_page 500 502 503 504 /500.html;
    location = /500.html {
        internal;
    }

    # Main Location Block
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Logging
    access_log /var/log/nginx/yantrastack.access.log;
    error_log /var/log/nginx/yantrastack.error.log warn;
}
```

### Enable Configuration

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/yantrastack.com /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## Apache Configuration

### Basic Virtual Host Configuration

Create a new configuration file at `/etc/apache2/sites-available/yantrastack.com.conf`:

```apache
# Redirect HTTP to HTTPS
<VirtualHost *:80>
    ServerName yantrastack.com
    ServerAlias www.yantrastack.com
    RedirectMatch ^/(.*)$ https://yantrastack.com/$1
</VirtualHost>

# HTTPS Virtual Host
<VirtualHost *:443>
    ServerName yantrastack.com
    ServerAlias www.yantrastack.com
    
    # Document Root
    DocumentRoot /var/www/yantrastack
    
    # SSL Configuration
    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/yantrastack.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/yantrastack.com/privkey.pem
    SSLCertificateChainFile /etc/letsencrypt/live/yantrastack.com/chain.pem
    
    # SSL Security
    SSLProtocol -all +TLSv1.2 +TLSv1.3
    SSLCipherSuite HIGH:!aNULL:!MD5
    SSLHonorCipherOrder on
    
    # Enable Modules
    <IfModule mod_rewrite.c>
        RewriteEngine On
        # Remove index.html from URL
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteRule ^ index.html [QSA,L]
    </IfModule>
    
    # GZIP Compression
    <IfModule mod_deflate.c>
        AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
    </IfModule>
    
    # Cache Control
    <IfModule mod_expires.c>
        ExpiresActive On
        
        # Images, CSS, JS - 1 year
        ExpiresByType image/jpeg "access plus 1 year"
        ExpiresByType image/gif "access plus 1 year"
        ExpiresByType image/png "access plus 1 year"
        ExpiresByType text/css "access plus 1 year"
        ExpiresByType application/javascript "access plus 1 year"
        
        # HTML - No Cache
        ExpiresByType text/html "access plus 0 seconds"
    </IfModule>
    
    # Security Headers
    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
    Header always set X-Content-Type-Options "nosniff"
    Header always set X-Frame-Options "SAMEORIGIN"
    Header always set X-XSS-Protection "1; mode=block"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
    Header always set Permissions-Policy "geolocation=(), microphone=(), camera=()"
    
    # Content Security Policy
    Header always set Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-dom'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self'"
    
    # Deny Access to Hidden Files
    <FilesMatch "^\.|~$">
        <IfModule mod_authz_core.c>
            Require all denied
        </IfModule>
    </FilesMatch>
    
    # Logging
    ErrorLog ${APACHE_LOG_DIR}/yantrastack.error.log
    CustomLog ${APACHE_LOG_DIR}/yantrastack.access.log combined
</VirtualHost>
```

### Enable Configuration

```bash
# Enable mod_rewrite (if not already enabled)
sudo a2enmod rewrite
sudo a2enmod ssl
sudo a2enmod headers
sudo a2enmod deflate

# Enable site
sudo a2ensite yantrastack.com

# Test Apache configuration
sudo apache2ctl configtest

# Restart Apache
sudo systemctl restart apache2
```

---

## Node.js/Express Configuration

### Basic Express Server Setup

Create `server.js` in your project root:

```javascript
const express = require('express');
const compression = require('compression');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Security Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-dom'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            fontSrc: ["'self'"],
            imgSrc: ["'self'", "data:"],
            connectSrc: ["'self'"]
        }
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    },
    frameguard: { action: 'SAMEORIGIN' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

// Compression Middleware
app.use(compression());

// Static Files
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: '1y',
    etag: false
}));

// Cache Control for HTML
app.use((req, res, next) => {
    if (req.path.endsWith('.html')) {
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.set('Expires', '0');
    }
    next();
});

// SPA Fallback
app.get('*', (req, res) => {
    if (req.path.includes('/assets/')) {
        return res.status(404).send('Not found');
    }
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error Handling
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).sendFile(path.join(__dirname, 'public', '500.html'));
});

// Start Server
app.listen(PORT, () => {
    console.log(`YantraStack server running on port ${PORT}`);
});
```

### Install Dependencies

---

## Security Headers (detailed)

This project recommends enforcing the following HTTP security headers in production. Add these to your web server configuration (Nginx/Apache) or hosting platform (_headers for Netlify). Always test `Content-Security-Policy` in `report-only` mode first.

Recommended headers:

- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- `Content-Security-Policy: ...` (customize to allow any external CDNs you use)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY` (or SAMEORIGIN as needed)
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: geolocation=(), microphone=(), camera=()`
- `X-XSS-Protection: 0` (deprecated — set to 0 to avoid browser heuristics)

Below are example snippets for common servers and static hosts.

### Nginx example (inside `server { ... }`)

```nginx
# Redirect HTTP to HTTPS (ensure certs configured)
if ($scheme = http) {
    return 301 https://$host$request_uri;
}

# Security headers
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
add_header X-XSS-Protection "0" always;

# Example CSP (tweak for your external sources)
add_header Content-Security-Policy "default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline' https:; style-src 'self' 'unsafe-inline' https:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none';" always;
```

### Apache (.htaccess or VirtualHost)

```apache
Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
Header always set X-Content-Type-Options "nosniff"
Header always set X-Frame-Options "DENY"
Header always set Referrer-Policy "strict-origin-when-cross-origin"
Header always set Permissions-Policy "geolocation=(), microphone=(), camera=()"
Header always set X-XSS-Protection "0"
Header always set Content-Security-Policy "default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline' https:; style-src 'self' 'unsafe-inline' https:;"
```

### Netlify (`_headers` file)

Create a `_headers` file at your publish root (e.g., `public/_headers`) containing:

```
/*
    Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
    X-Content-Type-Options: nosniff
    X-Frame-Options: DENY
    Referrer-Policy: strict-origin-when-cross-origin
    Permissions-Policy: geolocation=(), microphone=(), camera=()
    X-XSS-Protection: 0
    Content-Security-Policy: default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline' https:; style-src 'self' 'unsafe-inline' https:;

```

### Testing & rollout

- Use `curl -I https://yourdomain.com` to confirm headers are present.
- Use security scanners: https://securityheaders.com/ and https://observatory.mozilla.org/
- Deploy `Content-Security-Policy` in `report-only` mode first to avoid breaking pages while tuning.


```bash
npm install express compression helmet
```

### PM2 Configuration (Recommended for Production)

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'yantrastack',
    script: './server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
```

### Start with PM2

```bash
# Install PM2 globally
npm install -g pm2

# Start application
pm2 start ecosystem.config.js

# Setup auto-restart on server reboot
pm2 startup
pm2 save

# Monitor application
pm2 monit
```

---

## SSL/TLS Setup

### Obtain Free SSL Certificate with Let's Encrypt

#### Using Certbot (Recommended)

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx  # For Nginx
# OR
sudo apt-get install certbot python3-certbot-apache  # For Apache

# Obtain Certificate
sudo certbot certonly --standalone -d yantrastack.com -d www.yantrastack.com

# For Nginx
sudo certbot --nginx -d yantrastack.com -d www.yantrastack.com

# For Apache
sudo certbot --apache -d yantrastack.com -d www.yantrastack.com
```

#### Auto-Renewal

```bash
# Set up automatic renewal
sudo certbot renew --dry-run

# Test renewal every 12 hours (automatic)
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

---

## Performance Optimization

### 1. Enable Gzip Compression

All configurations above include gzip compression. Verify it's working:

```bash
curl -I -H 'Accept-Encoding: gzip' https://yantrastack.com | grep Content-Encoding
```

### 2. Add Browser Caching Headers

Implemented in all configurations above for:
- CSS files: 1 year cache
- JavaScript: 1 year cache
- Images: 1 year cache
- HTML: No cache

### 3. Minify CSS and JavaScript

```bash
# Build minified CSS
npm run build
```

### 4. Optimize Images

```bash
# Convert images to WebP format (optional)
# Install imagemagick: sudo apt-get install imagemagick
convert original.png -quality 80 optimized.webp
```

### 5. Content Delivery Network (CDN)

Consider using Cloudflare, CloudFront, or Fastly for:
- Global content distribution
- DDoS protection
- Additional caching layers
- Automatic minification

---

## Security Headers

All recommended security headers are included in the configurations above:

| Header | Purpose |
|--------|---------|
| `Strict-Transport-Security` | Force HTTPS connections |
| `X-Content-Type-Options` | Prevent MIME type sniffing |
| `X-Frame-Options` | Prevent clickjacking |
| `X-XSS-Protection` | Enable browser XSS filtering |
| `Referrer-Policy` | Control referrer information |
| `Permissions-Policy` | Restrict browser features |
| `Content-Security-Policy` | Prevent XSS and injection attacks |

---

## Caching Strategy

### Static Assets (Images, CSS, JS)

**Cache Duration**: 1 year
```
Cache-Control: public, max-age=31536000, immutable
```

### HTML Pages

**Cache Duration**: 0 seconds (no cache)
```
Cache-Control: no-cache, no-store, must-revalidate
Expires: 0
```

### API Responses (if applicable)

**Cache Duration**: 5 minutes
```
Cache-Control: public, max-age=300
```

---

## Monitoring & Logs

### Nginx Logs

```bash
# Real-time access logs
tail -f /var/log/nginx/yantrastack.access.log

# Real-time error logs
tail -f /var/log/nginx/yantrastack.error.log

# View and analyze logs
grep "ERROR" /var/log/nginx/yantrastack.error.log
```

### Apache Logs

```bash
# Real-time access logs
tail -f /var/log/apache2/yantrastack.access.log

# Real-time error logs
tail -f /var/log/apache2/yantrastack.error.log
```

### Monitor with Systemd

```bash
# Check service status
sudo systemctl status nginx  # or apache2

# View recent logs
sudo journalctl -u nginx -n 50  # last 50 lines

# Real-time monitoring
sudo journalctl -u nginx -f
```

### Website Monitoring Tools

Recommended tools for uptime monitoring:
- **Uptime Robot** (free tier available)
- **New Relic** (application monitoring)
- **Datadog** (comprehensive monitoring)
- **Pingdom** (simple uptime checks)

---

## Deployment Steps Summary

### For Nginx

```bash
# 1. Upload files to server
scp -r ./ user@server:/var/www/yantrastack/

# 2. Set permissions
sudo chown -R www-data:www-data /var/www/yantrastack
sudo chmod -R 755 /var/www/yantrastack

# 3. Install and configure SSL
sudo certbot certonly --standalone -d yantrastack.com

# 4. Deploy Nginx config (see Nginx Configuration section)

# 5. Test and reload
sudo nginx -t
sudo systemctl reload nginx

# 6. Verify site is live
curl https://yantrastack.com
```

### For Apache

```bash
# 1. Upload files to server
scp -r ./ user@server:/var/www/yantrastack/

# 2. Set permissions
sudo chown -R www-data:www-data /var/www/yantrastack
sudo chmod -R 755 /var/www/yantrastack

# 3. Install and configure SSL
sudo certbot certonly --standalone -d yantrastack.com

# 4. Deploy Apache config (see Apache Configuration section)

# 5. Test and reload
sudo apache2ctl configtest
sudo systemctl reload apache2

# 6. Verify site is live
curl https://yantrastack.com
```

### For Node.js

```bash
# 1. Install Node.js and npm
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install nodejs

# 2. Upload files and install dependencies
scp -r ./ user@server:/app/yantrastack/
cd /app/yantrastack
npm install --production

# 3. Install and configure SSL
sudo certbot certonly --standalone -d yantrastack.com

# 4. Install PM2 globally
sudo npm install -g pm2

# 5. Start application with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# 6. Verify site is live
curl https://yantrastack.com
```

---

## Troubleshooting

### SSL Certificate Issues

```bash
# Check certificate validity
sudo certbot certificates

# Renew immediately
sudo certbot renew --force-renewal

# Check expiration date
openssl s_client -connect yantrastack.com:443 | grep -A2 "Validity"
```

### 404 Errors on SPA Routes

**Solution**: Ensure `try_files` (Nginx) or `mod_rewrite` (Apache) is configured to fallback to `index.html`

### Slow Performance

1. Verify gzip compression is enabled
2. Check static file caching headers
3. Optimize images
4. Review server logs for errors
5. Check CPU and memory usage

### High Memory Usage

1. Implement rate limiting
2. Set up a CDN for static assets
3. Enable reverse proxy caching
4. Monitor for memory leaks

---

## Support & Resources

- **Nginx Documentation**: https://nginx.org/en/docs/
- **Apache Documentation**: https://httpd.apache.org/docs/
- **Let's Encrypt**: https://letsencrypt.org/
- **Express.js Documentation**: https://expressjs.com/
- **PM2 Documentation**: https://pm2.keymetrics.io/

For deployment support, contact your hosting provider or system administrator.
