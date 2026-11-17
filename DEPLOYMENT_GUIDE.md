# GuardianLink — Production Deployment Guide
## Complete Installation, Configuration, Hardening & Operations Runbook

**Document Version:** 1.0.0-rc1  
**Target Release:** `v1.0.0-rc1`  
**Target Branch:** `goutam-devlopment`  
**Date:** November 16, 2026  

---

## 1. SYSTEM ARCHITECTURE & HOST REQUIREMENTS

GuardianLink utilizes a 3-tier isolated architecture:
1. **Public Ingress Tier**: Frontend Nginx SPA (Port 3000) and Express Backend API (Port 5000).
2. **Backend Data Tier**: MongoDB 8.0 (Port 27017, internal) and Redis 7 (Port 6379, internal).
3. **AI Biometric Tier**: FastAPI AI Microservice (Port 8000, internal) and Qdrant Vector DB (Port 6333, internal).

### Minimum Hardware Specifications
- **Operating System**: Ubuntu 22.04 LTS / Debian 12 (Recommended) or Red Hat Enterprise Linux 9.
- **CPU**: 4 vCPUs (x86_64 architecture with AVX2 instruction support for ONNX Runtime).
- **RAM**: Minimum 8 GB (16 GB recommended for high-volume face embedding indexing).
- **Disk Storage**: 50 GB NVMe SSD for database storage, model weights, and logs.
- **Docker**: Docker Engine 24.0+ and Docker Compose v2.20+.

---

## 2. ENVIRONMENT CONTRACT & SECRETS CONFIGURATION

Before starting containers, copy the canonical environment template to `.env` at the root:

```bash
cp .env.example .env
```

### Essential Production Secrets

Generate cryptographically secure secrets using `openssl`:

```bash
# Generate 32-byte cryptographic keys
openssl rand -hex 32  # Use for JWT_SECRET
openssl rand -hex 32  # Use for SESSION_SECRET
openssl rand -hex 32  # Use for COOKIE_SECRET
openssl rand -hex 32  # Use for INTERNAL_SERVICE_KEY
```

### Production Configuration Parameters

Edit `.env` with your production values:

```ini
# Runtime Mode
NODE_ENV=production
ENVIRONMENT=production

# Server Ports & Host Ingress
PORT=5000
CLIENT_URL=https://guardianlink.yourdomain.com
VITE_API_BASE_URL=https://api.guardianlink.yourdomain.com

# Cryptographic Keys (Min 32 characters)
JWT_SECRET=your_generated_jwt_secret_hex_string_32_bytes_or_more
SESSION_SECRET=your_generated_session_secret_hex_string_32_bytes
COOKIE_SECRET=your_generated_cookie_secret_hex_string_32_bytes
INTERNAL_SERVICE_KEY=your_generated_internal_key_min_16_characters

# Database & Cache Connections
MONGO_URI=mongodb://mongo:27017/guardianlink
REDIS_URL=redis://redis:6379

# Cloudinary Cloud Storage
CLOUDINARY_CLOUD_NAME=your_production_cloud_name
CLOUDINARY_API_KEY=your_production_api_key
CLOUDINARY_API_SECRET=your_production_api_secret

# Initial Admin Bootstrap
ADMIN_NAME=GuardianLink Super Administrator
ADMIN_EMAIL=security-admin@yourdomain.com
ADMIN_PASSWORD=Complex_Production_Password_12_Chars_Min!
ADMIN_PHONE=919876543210

# AI Microservice & Vector Database
AI_SERVICE_URL=http://ai-service:8000
QDRANT_URL=http://qdrant:6333
COLLECTION_NAME=missing_person_faces
FACE_MATCH_THRESHOLD=0.60
```

---

## 3. DOCKER COMPOSE PRODUCTION DEPLOYMENT (RECOMMENDED)

### Step 1: Validate Configuration Syntax
Verify that the production Compose specification parses cleanly and that fail-closed checks pass:

```bash
docker compose -f docker-compose.prod.yml config
```

*Note: If any required secret (`JWT_SECRET`, `INTERNAL_SERVICE_KEY`, etc.) is missing, Compose will fail closed immediately.*

### Step 2: Build and Launch Containers
Build production images using multi-stage builds and launch services in detached mode:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### Step 3: Verify Container Health Status
Inspect running services:

```bash
docker compose -f docker-compose.prod.yml ps
```

All 6 services should report `healthy`:
- `guardianlink-mongo-prod` (healthy)
- `guardianlink-redis-prod` (healthy)
- `guardianlink-qdrant-prod` (healthy)
- `guardianlink-ai-service-prod` (healthy)
- `guardianlink-backend-prod` (healthy)
- `guardianlink-frontend-prod` (healthy)

---

## 4. PUBLIC TLS TERMINATION & REVERSE PROXY SETUP

Place an enterprise reverse proxy (such as Nginx or Traefik) or Cloud Load Balancer (AWS ALB / Cloudflare) in front of the public containers to handle HTTPS / TLS certificates.

### Sample Upstream Nginx Ingress Configuration (`/etc/nginx/sites-available/guardianlink`):

```nginx
# Upstream Definitions
upstream frontend_upstream {
    server 127.0.0.1:3000;
}

upstream backend_upstream {
    server 127.0.0.1:5000;
}

# HTTP to HTTPS Redirection
server {
    listen 80;
    server_name guardianlink.yourdomain.com api.guardianlink.yourdomain.com;
    return 301 https://$host$request_uri;
}

# Frontend Web Client
server {
    listen 443 ssl http2;
    server_name guardianlink.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/guardianlink.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/guardianlink.yourdomain.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://frontend_upstream;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}

# Backend API & WebSocket Gateway
server {
    listen 443 ssl http2;
    server_name api.guardianlink.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/guardianlink.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/guardianlink.yourdomain.com/privkey.pem;

    client_max_body_size 10M;

    location / {
        proxy_pass http://backend_upstream;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;

        # WebSocket support for Socket.IO
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400s;
    }
}
```

---

## 5. DATABASE BACKUP & DISASTER RECOVERY RUNBOOK

### 5.1. Automated Daily BSON Backup
Add a cron job to dump MongoDB collections daily:

```bash
#!/bin/bash
# /opt/guardianlink/scripts/backup_db.sh
set -euo pipefail
BACKUP_DIR="/var/backups/guardianlink/$(date +%F_%H%M%S)"
mkdir -p "$BACKUP_DIR"

docker exec -t guardianlink-mongo-prod mongodump \
  --db guardianlink \
  --out /tmp/backup \
  --gzip

docker cp guardianlink-mongo-prod:/tmp/backup/guardianlink "$BACKUP_DIR"
docker exec guardianlink-mongo-prod rm -rf /tmp/backup

# Encrypt and upload to remote S3 storage
# aws s3 sync "$BACKUP_DIR" s3://guardianlink-backups/mongo/ --sse AES256
```

### 5.2. Database Restoration Runbook
To restore from a backup archive:

```bash
# 1. Copy backup archive into mongo container
docker cp /var/backups/guardianlink/2026-11-16/guardianlink guardianlink-mongo-prod:/tmp/restore_dir

# 2. Execute mongorestore
docker exec -it guardianlink-mongo-prod mongorestore \
  --db guardianlink \
  --drop \
  --gzip \
  /tmp/restore_dir

# 3. Clean up container temp files
docker exec guardianlink-mongo-prod rm -rf /tmp/restore_dir
```

---

## 6. POST-DEPLOYMENT VERIFICATION & HEALTH CHECKS

Execute these commands immediately after deployment:

```bash
# 1. Probe Backend Health Endpoint
curl -i https://api.guardianlink.yourdomain.com/api/health
# Expected Output: HTTP 200 OK, {"success":true,"message":"Server is running"}

# 2. Probe Frontend Nginx Health Probe
curl -i https://guardianlink.yourdomain.com/healthz
# Expected Output: HTTP 200 OK, healthy

# 3. Verify Public Network Isolation (Ensure internal ports are NOT reachable externally)
curl -m 3 http://api.guardianlink.yourdomain.com:27017  # Must timeout / connection refused
curl -m 3 http://api.guardianlink.yourdomain.com:6379   # Must timeout / connection refused
curl -m 3 http://api.guardianlink.yourdomain.com:8000   # Must timeout / connection refused
curl -m 3 http://api.guardianlink.yourdomain.com:6333   # Must timeout / connection refused

# 4. Confirm Initial Admin Account
# Log in via https://guardianlink.yourdomain.com/login using ADMIN_EMAIL and ADMIN_PASSWORD
```

---

## 7. ROLLBACK & INCIDENT RESPONSE PROTOCOL

If a critical defect is discovered in production:

1. **Rollback Container Images**:
   ```bash
   # Revert Git pointer to previous stable release tag
   git checkout v0.23.0
   docker compose -f docker-compose.prod.yml up -d --build
   ```
2. **Database State Reversion**:
   Restore the pre-deployment database backup using the restoration runbook in Section 5.2.
3. **Audit Log Inspection**:
   Inspect recent entries in the `AuditLog` collection for unauthorized activity:
   ```bash
   docker exec -it guardianlink-mongo-prod mongosh guardianlink --eval "db.auditlogs.find().sort({timestamp:-1}).limit(20)"
   ```

