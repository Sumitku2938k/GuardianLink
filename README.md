# 🛡️ GuardianLink — AI-Powered Real-Time Child Safety & Emergency Response Ecosystem

> **Solution Statement:** 
> *“We propose an AI-powered real-time child identification and emergency response system that enables instant verification, guardian connection, and crowd-assisted recovery of lost or missing children using smart digital IDs and intelligent scanning infrastructure.”*

---

## 📌 Problem Statement
In emergency situations involving lost or missing children, **there is no fast, accessible, and real-time system** for civilians or authorities to identify the child and instantly connect with verified guardians or law enforcement. 

* **The Reality:** When a lost child is found by a citizen, there is no immediate way to verify their identity or securely contact their family. Existing databases (e.g., government registries, NGO lists) are fragmented, slow, and inaccessible to the general public.

---

## 💡 The GuardianLink Solution & Edge

GuardianLink bridges the gap between **the Public, AI intelligence, and Real-time response networks**.

| Core Feature | Traditional Process | GuardianLink Edge |
| :--- | :--- | :--- |
| **Response Time** | Hours to days (waiting for reports/FIR) | **Instant (Real-Time Push Alerts & Biometric Matches)** |
| **Dynamic IDs** | Static details, high loss rate | **NFC bracelets / Smart QR codes with offline fail-safes** |
| **Public Collaboration** | Passive flyers, manual notifications | **Active geolocation citizen network notifications** |
| **Identity Verification** | Manual checks, open databases | **AI-driven biometric facial indexing & KYC parent vetting** |

---

## ⚙️ Core Architecture & System Features

### 1. Dynamic Child Smart ID
* **Wearable Tech**: Lightweight NFC bracelets and smart QR bands containing offline basic identifiers.
* **Scan Response System (3 Levels)**:
  * **Level 1 (Safe Mode)**: A public scan displays safe details and alerts parent of check-in.
  * **Level 2 (Suspicious Mode)**: Scans in anomalous times/locations flag alerts to parent.
  * **Level 3 (Missing Mode Active)**: Instantly notifies nearby citizens, displays police contact details, and logs GPS coordinates.

### 2. AI Facial Recognition Pipeline
* **Biometric Vector Indexing**: Encrypts child facial photos into multi-dimensional embeddings (e.g., using `InsightFace` / `DeepFace`).
* **Vector Databases**: Utilizes specialized vector engines (like `Qdrant` or `Pinecone`) to scan databases at sub-second speeds.
* **CCTV & Citizen Crowd Sourcing**: Allows citizens to upload photos of lost/crying children to run instant matching routines.

### 3. The Trust Layer
* **Guardian KYC**: Prevents fake parent claims through authority validation, Aadhaar/Government ID validation, and secure OTP verification.
* **Alert Validation**: Prevents spam alerts by linking high-level emergency alerts with police verification workflows.

---

## 🛠️ Technology Stack

```
                     ┌───────────────────────────┐
                     │   GuardianLink Frontend   │
                     │  (Vite + React + Tailwind)│
                     └─────────────┬─────────────┘
                                   │
                                   ▼
                     ┌───────────────────────────┐
                     │    Node.js + Express API  │
                     └─────────────┬─────────────┘
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         ▼                         ▼                         ▼
┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│ MongoDB Database │      │  AI Face Vector  │      │ Firebase Cloud   │
│  (User Records)  │      │  (Pinecone/Model)│      │  (Push Alerts)   │
└──────────────────┘      └──────────────────┘      └──────────────────┘
```

### 1. Frontend
* **React (Vite, JS)**: High-performance dashboard logic, clean modular architecture.
* **Tailwind CSS & Vanilla CSS**: Modern, premium UI containing glassmorphism, gradient styling, and custom theme systems.
* **Framer Motion**: Smooth animations, progressive multi-step forms, and transition effects.
* **React Router**: Router layout management.

### 2. Backend & Services (Future Scope)
* **API Service**: Node.js + Express.js.
* **Database**: MongoDB (Flexible JSON schemas for profiles, complaint registries, and scan logs).
* **Biometric Vector DB**: Pinecone / Qdrant.
* **Real-time Comms**: Socket.io (live navigation mapping) + Twilio/MSG91 (SMS alerts).
* **Storage**: Cloudinary / AWS S3 (secure KYC image hosting).

---

## 📂 Project Structure

```
GuardianLink Sem 5/
│
├── client/                      # Vite + React Client App
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/              # Reusable UI controls (Buttons, Inputs, Modals, Cards)
│   │   │   ├── dashboard/       # Dashboard widgets (Sidebar, TopNavbar, Timelines, Tips)
│   │   │   └── layout/          # Global layout headers/footers
│   │   ├── pages/               # Application Pages (Index, Login, Register, Dashboard)
│   │   ├── styles/              # Global Tailwind style configuration
│   │   ├── constants/           # Mock data and static variables
│   │   ├── App.jsx              # Main routing and navigation engine
│   │   └── main.jsx             # React entry point
│   ├── tailwind.config.js       # Custom design system tokens
│   └── package.json
│
├── server/                      # Future Node.js Backend API
└── README.md                    # Platform overview & details
```

---

## 🚀 Quick Start Guide

### Prerequisites
* Node.js (v18 or higher)
* npm (v9 or higher)

### Run the Client Application

1. Navigate to the client directory:
   ```bash
   cd client
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Boot the development server:
   ```bash
   npm run dev
   ```
4. Access the web app at `http://localhost:5173/`.

### Run the Server Application

1. Navigate to the server directory:
   ```bash
   cd server
   ```
2. Install backend dependencies:
   ```bash
   npm install
   ```
3. Boot the API development server (uses `nodemon`):
   ```bash
   npm run dev
   ```
4. Verify the server is active by accessing the health endpoint at `http://localhost:5000/api/health`.

### 3. Docker Infrastructure & Microservices Stack (Phase 14 Production Architecture)

GuardianLink utilizes an enterprise-grade, 3-tier segmented Docker container architecture with zero public exposure of database and biometric subsystems.

```
                          [ PUBLIC INTERNET ]
                                   │
                                   │ (HTTPS Ingress)
                                   ▼
    ┌─────────────────────────────────────────────────────────────┐
    │                guardianlink-public-net                      │
    │                                                             │
    │   ┌─────────────────────────┐     ┌─────────────────────┐   │
    │   │  guardianlink-frontend  │ ──> │ guardianlink-backend│   │
    │   │  (Port 3000 -> 3000)    │     │ (Port 5000 -> 5000) │   │
    │   └─────────────────────────┘     └──────────┬──────────┘   │
    └──────────────────────────────────────────────┼──────────────┘
                                                   │
                   ┌───────────────────────────────┴───────────────────────────────┐
                   │                                                               │
                   ▼                                                               ▼
    ┌─────────────────────────────┐                                 ┌─────────────────────────────┐
    │   guardianlink-backend-net  │                                 │  guardianlink-internal-net  │
    │   (internal: true in prod)  │                                 │                             │
    │                             │                                 │                             │
    │  ┌───────────────────────┐  │                                 │  ┌───────────────────────┐  │
    │  │  guardianlink-mongo   │  │                                 │  │guardianlink-ai-service│  │
    │  │  (Port 27017 unmapped)│  │                                 │  │ (Port 8000 unmapped)  │  │
    │  └───────────────────────┘  │                                 │  └───────────┬───────────┘  │
    │                             │                                 │              │              │
    │  ┌───────────────────────┐  │                                 │              ▼              │
    │  │  guardianlink-redis   │  │                                 │  ┌───────────────────────┐  │
    │  │  (Port 6379 unmapped) │  │                                 │  │  guardianlink-qdrant  │  │
    │  └───────────────────────┘  │                                 │  │ (Port 6333 unmapped)  │  │
    │                             │                                 │  └───────────────────────┘  │
    │  ┌───────────────────────┐  │                                 │                             │
    │  │ mongo-express (DEBUG) │  │                                 │                             │
    │  │ (127.0.0.1:8081 loop) │  │                                 │                             │
    │  └───────────────────────┘  │                                 │                             │
    └─────────────────────────────┘                                 └─────────────────────────────┘
```

---

## 🚀 Docker Operations & Deployment Guide

### 1. Prerequisites
- Docker Engine v24.0+ & Docker Compose v2.20+
- Host platform: Linux, macOS, or Windows with WSL2 backend
- Minimum hardware: 4 CPU cores, 8 GB RAM (for InsightFace ONNX Runtime inference)

### 2. Environment Configuration
Create the root environment file from `.env.example`:
```bash
cp .env.example .env
```
Ensure the following required environment variables are set before starting:
- `JWT_SECRET`: Minimum 32-character high-entropy secret.
- `INTERNAL_SERVICE_KEY`: Service-to-service key shared exclusively between Express and FastAPI (`X-Internal-Service-Key`).
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`: Server-side image storage credentials.

### 3. Development Stack Startup
To launch the complete 6-container development suite with hot reloading and health probes:
```bash
# Start all core services in detached mode
docker compose up -d

# Verify all containers are running and healthy
docker compose ps

# View unified microservice logs
docker compose logs -f

# View logs for a specific service
docker compose logs -f server ai-service
```

#### Development Port Allocations:
| Container Name | Service | Host Binding | Network Membership | Healthcheck / Access |
| :--- | :--- | :--- | :--- | :--- |
| `guardianlink-frontend` | React + Vite UI | `0.0.0.0:3000` | `guardianlink-public-net` | `wget :3000` (Access: `http://localhost:3000`) |
| `guardianlink-backend` | Express REST API | `0.0.0.0:5000` | `public-net`, `backend-net`, `internal-net` | `GET /api/health` (Access: `http://localhost:5000`) |
| `guardianlink-mongo` | MongoDB 8.0 | `0.0.0.0:27017` | `guardianlink-backend-net` | `mongosh db.adminCommand('ping')` |
| `guardianlink-redis` | Redis 7 | `0.0.0.0:6379` | `guardianlink-backend-net` | `redis-cli ping` |
| `guardianlink-ai-service` | FastAPI Biometric AI | `127.0.0.1:8000` (loopback) | `guardianlink-internal-net` | `GET /health` |
| `guardianlink-qdrant` | Qdrant Vector Engine | `127.0.0.1:6333` (loopback) | `guardianlink-internal-net` | `/dev/tcp/127.0.0.1/6333` |
| `guardianlink-mongo-express` | Mongo Express Web GUI | `0.0.0.0:8081` | `guardianlink-backend-net` | Browser GUI (Access: `http://localhost:8081`) |

### 4. Database Browser GUI: Mongo Express (`http://localhost:8081`)
Mongo Express starts automatically with the development stack (`docker compose up -d`), allowing you to view, query, and manage all MongoDB collections directly in your web browser:
- **URL**: [http://localhost:8081](http://localhost:8081)
- **Database**: `guardianlink`
- **Accessible Collections**: `users`, `children`, `missingcases`, `sightings`, `carerecords`, `notifications`, `auditlogs`
- No login credentials required in development mode (`ME_CONFIG_BASICAUTH: "false"`).

### 5. Production Stack Deployment (`docker-compose.prod.yml`)
The production architecture enforces zero host port publishing for data and AI tiers, read-only model mounts, and fail-closed secret requirements.

```bash
# 1. Validate merged production configuration syntax (fails closed on missing secrets)
docker compose -f docker-compose.prod.yml config

# 2. Build and launch hardened production stack
docker compose -f docker-compose.prod.yml up -d --build

# 3. Monitor container health status
docker compose -f docker-compose.prod.yml ps
```

#### Production Security Enforcements:
- **Zero Host Exposure**: MongoDB (`27017`), Redis (`6379`), AI Service (`8000`), and Qdrant (`6333`) publish NO ports to the host interface. Communication occurs exclusively over internal Docker virtual bridge networks via DNS (`http://ai-service:8000`, `http://qdrant:6333`, `mongodb://mongo:27017`).
- **Internal Network Isolation**: `guardianlink-backend-net` is configured with `internal: true`, preventing database egress to the external internet.
- **Fail-Closed Secrets**: Docker Compose validation halts immediately with descriptive fatal errors if `INTERNAL_SERVICE_KEY` or `JWT_SECRET` are unset.
- **Read-Only Models**: InsightFace ONNX model files are mounted read-only (`:ro`) to prevent runtime tampering.

### 6. Health & Readiness Verification
Check the operational health of all services:
```bash
# Quick health check status
docker compose ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Inspect health details for AI Service
docker compose exec server node -e "fetch('http://ai-service:8000/health').then(r => r.json()).then(console.log)"

# Verify Qdrant cluster readiness
docker compose exec server node -e "fetch('http://qdrant:6333/readyz').then(r => r.text()).then(console.log)"
```

### 7. Persistent Data Backup & Recovery

#### MongoDB Backup & Restore
Named volume `mongo_data` persists database state across container updates and restarts.
```bash
# Create consistent BSON archive backup
docker compose exec -T mongo mongodump --archive=/data/db/guardianlink_backup_$(date +%Y%m%d).archive --gzip

# Copy backup archive to host
docker compose cp mongo:/data/db/guardianlink_backup_*.archive ./backups/

# Restore from backup archive
docker compose cp ./backups/guardianlink_backup.archive mongo:/data/db/restore.archive
docker compose exec -T mongo mongorestore --archive=/data/db/restore.archive --gzip --drop
```

#### Qdrant Biometric Vector Collection Snapshotting
Named volume `qdrant_data` persists high-dimensional face vectors.
```bash
# Create collection snapshot via REST API
docker compose exec server node -e "fetch('http://qdrant:6333/collections/missing_person_faces/snapshots', {method: 'POST'}).then(r => r.json()).then(console.log)"

# List existing snapshots
docker compose exec server node -e "fetch('http://qdrant:6333/collections/missing_person_faces/snapshots').then(r => r.json()).then(console.log)"
```

### 8. Secret Rotation Procedure
To rotate the `INTERNAL_SERVICE_KEY`:
1. Generate a new high-entropy 64-character hex key:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. Update `INTERNAL_SERVICE_KEY` in `.env`.
3. Perform zero-downtime rolling reload:
   ```bash
   docker compose up -d --no-deps ai-service server
   ```
4. Verify authorized inter-service communication passes:
   ```bash
   docker compose exec server node -e "fetch('http://ai-service:8000/health').then(r => r.json()).then(console.log)"
   ```

### 9. Network Segmentation & Isolation Verification
To empirically verify that public containers cannot access internal databases:
```bash
# 1. Verify frontend CAN reach backend API:
docker compose exec client wget -q -O - http://server:5000/api/health

# 2. Verify frontend CANNOT reach MongoDB (expected: bad address / connection failure):
docker compose exec client wget -q -O - http://mongo:27017

# 3. Verify frontend CANNOT reach Qdrant (expected: bad address / connection failure):
docker compose exec client wget -q -O - http://qdrant:6333

# 4. Verify AI Service CANNOT reach MongoDB or Client (expected: bad address):
docker compose exec ai-service python -c "import socket; socket.create_connection(('mongo', 27017), timeout=2)"
```

### 10. Graceful Shutdown & Maintenance
```bash
# Graceful stop preserving all named data volumes (DO NOT USE -v IN PRODUCTION)
docker compose stop

# Restart a single service after code changes
docker compose restart server

# Full teardown without deleting data volumes
docker compose down
```

---

## 🚀 Phase 15: Production Readiness, Secret Management & Deployment Runbook

### 1. Canonical Environment Configuration Contract

| Variable | Consumer Service | Scope | Sensitivity | Production Requirement |
| :--- | :--- | :--- | :--- | :--- |
| `NODE_ENV` | Express Backend | Runtime | Non-sensitive | Must be set to `production` (enables fail-closed security & secure cookies) |
| `ENVIRONMENT` | FastAPI AI Service | Runtime | Non-sensitive | Must be set to `production` (disables Swagger/OpenAPI docs) |
| `PORT` | Express Backend | Runtime | Non-sensitive | Bind port inside container (default: `5000`) |
| `CLIENT_URL` | Express Backend | Runtime | Non-sensitive | Public client origin for CORS allowlisting (e.g. `https://guardianlink.org`) |
| `MONGO_URI` | Express Backend | Runtime | **Critical Secret** | Connection string to MongoDB (e.g. `mongodb+srv://...` for Atlas) |
| `REDIS_URL` | Express Backend | Runtime | **Critical Secret** | Redis URL (e.g. `rediss://...` for TLS-enabled Upstash / ElastiCache) |
| `JWT_SECRET` | Express Backend | Runtime | **Critical Secret** | Cryptographic key (min 32 chars); fails closed if missing or placeholder |
| `SESSION_SECRET` | Express Backend | Runtime | **Critical Secret** | Cryptographic session salt (min 32 chars); fails closed in production |
| `COOKIE_SECRET` | Express Backend | Runtime | **Critical Secret** | Signed cookie encryption key (min 32 chars); fails closed in production |
| `INTERNAL_SERVICE_KEY` | Express & FastAPI | Runtime | **Critical Secret** | Pre-shared key for `X-Internal-Service-Key` service-to-service auth (min 16 chars) |
| `AI_SERVICE_URL` | Express Backend | Runtime | Internal Private | Internal endpoint resolving to AI service (`http://ai-service:8000`) |
| `AI_SERVICE_TIMEOUT_MS` | Express Backend | Runtime | Non-sensitive | Timeout for inter-service AI requests (default: `10000`) |
| `CLOUDINARY_CLOUD_NAME` | Express Backend | Runtime | Secret ID | Cloudinary storage account name |
| `CLOUDINARY_API_KEY` | Express Backend | Runtime | **Critical Secret** | Cloudinary server-side API key |
| `CLOUDINARY_API_SECRET` | Express Backend | Runtime | **Critical Secret** | Cloudinary server-side API secret |
| `ADMIN_NAME` | Express Backend | Bootstrap | Non-sensitive | Initial administrator display name |
| `ADMIN_EMAIL` | Express Backend | Bootstrap | Non-sensitive | Initial administrator email address |
| `ADMIN_PASSWORD` | Express Backend | Bootstrap | **Critical Secret** | Initial admin password (min 12 chars; rejects defaults in production) |
| `ADMIN_PHONE` | Express Backend | Bootstrap | Non-sensitive | Initial administrator phone number |
| `QDRANT_URL` | FastAPI AI Service | Runtime | Internal Private | Qdrant endpoint (`http://qdrant:6333` or managed cloud URL) |
| `QDRANT_API_KEY` | FastAPI AI Service | Runtime | **Critical Secret** | Optional API key for authenticated Qdrant instances |
| `COLLECTION_NAME` | FastAPI AI Service | Runtime | Non-sensitive | Vector collection name (`missing_person_faces`) |
| `FACE_MATCH_THRESHOLD`| FastAPI AI Service | Runtime | Non-sensitive | Biometric cosine similarity threshold (default: `0.60`) |
| `VITE_API_BASE_URL` | React Frontend | Build-time | **Public Only** | Browser-facing backend API URL (e.g. `https://api.guardianlink.org`) |

### 2. Production Docker Build & Deployment

To build and deploy the hardened production stack:

```bash
# 1. Provide production secrets via deployment platform or secure environment:
export JWT_SECRET=$(openssl rand -hex 32)
export SESSION_SECRET=$(openssl rand -hex 32)
export COOKIE_SECRET=$(openssl rand -hex 32)
export INTERNAL_SERVICE_KEY=$(openssl rand -hex 32)
export CLIENT_URL="https://guardianlink.org"
export VITE_API_BASE_URL="https://api.guardianlink.org"

# 2. Validate Compose configuration syntax (verifies fail-closed rules):
docker compose -f docker-compose.prod.yml config

# 3. Build optimized production images:
docker compose -f docker-compose.prod.yml build

# 4. Launch isolated production containers in detached mode:
docker compose -f docker-compose.prod.yml up -d

# 5. Verify service health and container status:
docker compose -f docker-compose.prod.yml ps
```

### 3. Managed Database Integration (MongoDB Atlas & Managed Redis)

For cloud deployment using managed database providers:
1. **Managed MongoDB (MongoDB Atlas):**
   - Configure network peering or IP access list for your cluster.
   - Set `MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/guardianlink?retryWrites=true&w=majority`.
   - The Mongoose connection pool will automatically negotiate TLS and replica set elections.
2. **Managed Redis (Upstash / AWS ElastiCache / Redis Cloud):**
   - Configure TLS connectivity using `rediss://` URI scheme:
     `REDIS_URL=rediss://default:<password>@<endpoint>:6379`.
   - Redis reconnection strategies automatically handle network partitions.

### 4. Operational Backup & Disaster Recovery Runbook

#### MongoDB Hot Backup & Verification:
```bash
# Create consistent BSON archive snapshot with oplog:
docker compose exec mongo mongodump --archive=/data/db/backup_$(date +%Y%m%d_%H%M%S).gz --gzip --oplog

# Test restore into isolated staging instance:
mongorestore --uri="mongodb://localhost:27018/guardianlink_restore_test" --archive=backup_test.gz --gzip
```

#### Qdrant Biometric Vector Snapshot:
```bash
# Trigger collection snapshot via Qdrant REST API:
curl -X POST http://localhost:6333/collections/missing_person_faces/snapshots

# Download snapshot archive for off-site cold storage:
curl -o missing_faces_snapshot.snapshot http://localhost:6333/collections/missing_person_faces/snapshots/<snapshot-name>
```

#### Biometric Vector Synchronization & Reconciliation:
If a database restore occurs without a corresponding Qdrant snapshot:
- Execute the reconciliation utility:
  ```bash
  cd server && node utils/reconcileVectors.js
  ```
- This scans active `Child` records and re-indexes embeddings from Cloudinary profile images if missing from Qdrant.

### 5. Application Rollback Procedure
If a production release encounters critical post-deployment issues:
1. Re-tag and launch previous stable container images:
   ```bash
   docker tag guardianlink-backend:previous guardianlink-backend:prod
   docker tag guardianlink-frontend:previous guardianlink-frontend:prod
   docker compose -f docker-compose.prod.yml up -d --no-deps server client
   ```
2. Verify system health:
   ```bash
   curl -f http://127.0.0.1:5000/api/health
   curl -f http://127.0.0.1:3000/healthz
   ```

---
*Developed with 🛡️ by GuardianLink Team — Child Safety Initiative.*

