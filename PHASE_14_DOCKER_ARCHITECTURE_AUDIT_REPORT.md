# GUARDIANLINK — PHASE 14: DOCKER ARCHITECTURE & NETWORK SEGMENTATION AUDIT REPORT

**Date:** October 25, 2026  
**Auditor:** Senior DevOps Engineer, Docker Infrastructure Architect & Application Security Engineer  
**Scope:** Complete GuardianLink Docker Compose stack, service Dockerfiles, network segmentation, health checks, environment variables, persistence, and container security controls.  
**Objective:** Thoroughly audit the current container architecture, identify security and reliability defects, and plan the production-hardened network segmentation and deployment verification without breaking functionality from Phases 1–13.

---

## 1. Executive Summary

GuardianLink currently employs a multi-container Docker architecture supporting a React frontend, Express API backend, MongoDB datastore, Redis cache, Qdrant vector database, InsightFace FastAPI biometric microservice, and mongo-express administration UI.

Phase 13 successfully introduced `docker-compose.prod.yml` with host port unmapping for the AI service and Qdrant, along with constant-time service authentication. However, an architectural audit of the container topology reveals critical opportunities for hardening:
1. **Network Segmentation:** The development Compose stack (`docker-compose.yml`) runs on an unsegmented default bridge network where any container can communicate with any other container. The production Compose stack (`docker-compose.prod.yml`) uses only two networks (`guardianlink-public-net` and `guardianlink-internal-net`), collapsing MongoDB, Redis, AI service, and Qdrant into a single shared internal network.
2. **Missing Health Checks:** Neither `mongo`, `redis`, nor `server` declare `healthcheck` configurations in `docker-compose.yml` or `docker-compose.prod.yml`. Consequently, `depends_on` conditions cannot guarantee that the database or cache are fully initialized before Express begins serving traffic.
3. **Mongo-Express Exposure:** In `docker-compose.yml`, `mongo-express` starts unconditionally on port `8081` with authentication disabled (`ME_CONFIG_BASICAUTH: "false"`).
4. **Dockerfile & .dockerignore Hygiene:** While `server/.dockerignore` and `ai-service/.dockerignore` correctly exclude `.env` files, `client/.dockerignore` omits `.env`, risking accidental leakage of development environment configurations into image layers.
5. **Express Ingress Architecture:** The Express server acts as the central orchestrator and proxy for all client operations. It must bridge the public zone, the backend data tier (MongoDB, Redis), and the AI biometric tier (FastAPI, Qdrant) without allowing the frontend or databases to access the AI/vector network directly.

---

## 2. Current-State Service Inventory

| Service Name | Base Image / Build Context | Container Port | Host Published Ports (Dev) | Host Published Ports (Prod) | Current Networks | Volumes | Health Check Status |
| :--- | :--- | :---: | :---: | :---: | :--- | :--- | :---: |
| **`mongo`** | `mongo:8.0` | `27017` | `27017:27017` | None (`expose: ["27017"]`) | Dev: default<br>Prod: `internal-net` | `mongo_data:/data/db` | **Missing** |
| **`redis`** | `redis:7-alpine` | `6379` | `6379:6379` | None (`expose: ["6379"]`) | Dev: default<br>Prod: `internal-net` | `redis_data:/data` | **Missing** |
| **`qdrant`** | `qdrant/qdrant:v1.19.2` | `6333` | `127.0.0.1:6333:6333` | None (`expose: ["6333"]`) | Dev: default<br>Prod: `internal-net` | `qdrant_data:/qdrant/storage` | Configured (`/dev/tcp` probe) |
| **`ai-service`** | `./ai-service` (`Dockerfile`) | `8000` | `127.0.0.1:8000:8000` | None (`expose: ["8000"]`) | Dev: default<br>Prod: `internal-net` | `INSIGHTFACE_CACHE_DIR:/root/.insightface/models:ro` | Configured (`curl /health`) |
| **`server`** | `./server` (`Dockerfile`) | `5000` | `5000:5000` | `5000:5000` | Dev: default<br>Prod: `internal-net`, `public-net` | Dev: `./server:/app`, `/app/node_modules`<br>Prod: none | **Missing** |
| **`client`** | `./client` (`Dockerfile`) | `3000` | `3000:3000` | `3000:3000` | Dev: default<br>Prod: `public-net` | Dev: `./client:/app`, `/app/node_modules`<br>Prod: none | **Missing** |
| **`mongo-express`**| `mongo-express:latest` | `8081` | `8081:8081` | Absent / Excluded | Dev: default | None | None |

---

## 3. Network Segmentation & Topology Analysis

### Current Topology Limitations
In `docker-compose.prod.yml`, the network model defines:
- `guardianlink-public-net` (client, server)
- `guardianlink-internal-net` (server, mongo, redis, qdrant, ai-service)

Under this topology, while the client is isolated from internal services, `ai-service` shares a network segment with `mongo` and `redis`. Architectural best practices dictate that:
- The AI microservice has zero operational requirement to communicate with MongoDB or Redis.
- MongoDB and Redis have zero requirement to communicate with Qdrant or InsightFace.
- The Express server is the sole authorized mediator between client HTTP requests, primary document storage, and biometric inference.

### Target 3-Tier Network Architecture

```
[ Internet / External Client ]
               │
               ▼ (Port 3000: Frontend, Port 5000: API)
   ┌────────────────────────────────────────────────────────┐
   │ 1. Public Ingress Network: guardianlink-public-net    │
   │    - client (Frontend)                                 │
   │    - server (Express API)                              │
   └────────────────────────────────────────────────────────┘
               │
               │ Express Server acts as the secure mediator
               ├────────────────────────────────────────────┐
               ▼                                            ▼
   ┌─────────────────────────────────┐   ┌──────────────────────────────────┐
   │ 2. Backend Data Network:        │   │ 3. AI Biometric Network:         │
   │    guardianlink-backend-net     │   │    guardianlink-ai-net           │
   │    - server                     │   │    - server                      │
   │    - mongo (27017 unmapped)     │   │    - ai-service (8000 unmapped)  │
   │    - redis (6379 unmapped)      │   │    - qdrant (6333 unmapped)      │
   └─────────────────────────────────┘   └──────────────────────────────────┘
```

#### Isolation Guarantees:
1. `client` can only communicate with `server`. It has no route to `mongo`, `redis`, `qdrant`, or `ai-service`.
2. `mongo` and `redis` can only communicate with `server`. They cannot be accessed by `ai-service` or `client`.
3. `qdrant` can only communicate with `ai-service` and `server` (for maintenance/health). It cannot be reached by `client`, `mongo`, or `redis`.
4. `ai-service` can only communicate with `qdrant` and `server`. It cannot reach `mongo`, `redis`, or `client`.

---

## 4. Container Health Check & Startup Order Analysis

### Deficiencies Identified
1. **`mongo` Container:** Currently has no health check in either Compose file. `server` starts immediately when the container process launches, but MongoDB daemon initialization and wire-protocol listener readiness require 3–5 seconds. If Express attempts immediate collection bootstrapping or admin seeding, it risks unhandled connection errors or relies on ad-hoc retry timeouts in `server/config/db.js`.
   - *Fix:* Configure health check using `mongosh --quiet --eval "db.adminCommand('ping')"` (verified present in `mongo:8.0`).
2. **`redis` Container:** Has no health check in Compose.
   - *Fix:* Configure health check using `redis-cli ping` (verified present in `redis:7-alpine`).
3. **`server` Container:** Has no health check. Express exposes `GET /api/health` returning HTTP 200 `{ success: true, message: "Server is running", uptime: ... }`.
   - *Fix:* Configure health check using `wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1` (verified present in `node:20-alpine`).
4. **`depends_on` Dependency Conditions:**
   - In `docker-compose.yml`, `server` declares `depends_on: [mongo, redis]` without `condition: service_healthy`.
   - In `docker-compose.prod.yml`, `server` declares `depends_on: [mongo, redis, ai-service]` without `condition: service_healthy`.
   - *Fix:* Upgrade `depends_on` entries to enforce `condition: service_healthy` across all required upstream services.

---

## 5. Storage Persistence & Named Volumes Audit

### Volumes Declared
1. `mongo_data`: Mapped to `/data/db` in `mongo`. Stores canonical child profiles, missing cases, citizen sightings, user credentials, and audit logs.
2. `redis_data`: Mapped to `/data` in `redis`. Stores session tokens and rate-limiting counters.
3. `qdrant_data`: Mapped to `/qdrant/storage` in `qdrant`. Stores 512-dimensional facial embedding vectors and payloads.
4. Model Cache Volume: `${INSIGHTFACE_CACHE_DIR:-./ai-service/models}:/root/.insightface/models:ro` mounted read-only to prevent re-downloading model weights on container restart.

### Data Safety Findings
- All three named volumes (`mongo_data`, `redis_data`, `qdrant_data`) are persistent and decoupled from container lifecycles.
- Routine container rebuilds (`docker compose up -d --build`) preserve these named volumes.
- Operational rule: **Never run `docker compose down -v` in production or regression testing**, as the `-v` flag destroys named volumes.
- Backup and restore procedures must be formally documented for MongoDB (`mongodump` / `mongorestore`) and Qdrant (snapshot API).

---

## 6. Dockerfile & Image Hardening Analysis

### 1. `server/Dockerfile`
- **Base Image:** `node:20-alpine` (Lightweight, minimal attack surface).
- **Working Directory:** `/app`.
- **Command:** Currently uses `npm run dev` with nodemon. In production, it should use `node app.js`.
- **User:** Alpine image includes default non-root user `node` (UID 1000). Setting `USER node` after `npm install` and directory ownership chown improves container isolation.

### 2. `client/Dockerfile`
- **Base Image:** `node:20-alpine`.
- **Ignore File:** `.dockerignore` lacks `.env` and `.env.local`. Must be updated to prevent accidental leakage.

### 3. `ai-service/Dockerfile`
- **Base Image:** `python:3.11-slim`.
- **Package Installation:** Uses `--no-install-recommends` and cleans `/var/lib/apt/lists/*`.
- **Model Storage:** InsightFace weights are mounted into `/root/.insightface/models:ro` at runtime.
- **Port:** Exposes port `8000`. In production Compose, this port is strictly unmapped from host interfaces.

---

## 7. Mongo-Express Administration Security

- **Risk:** `mongo-express` grants full administrative web access to MongoDB. In `docker-compose.yml`, it has `ME_CONFIG_BASICAUTH: "false"` and binds to `0.0.0.0:8081`.
- **Mitigation:**
  1. In `docker-compose.yml`, assign `mongo-express` to Compose profile `debug` (`profiles: ["debug"]`) so it is never started during normal developer or testing workflows unless explicitly invoked via `docker compose --profile debug up`.
  2. Bind its host port to loopback only: `"127.0.0.1:8081:8081"`.
  3. Ensure it is entirely excluded from `docker-compose.prod.yml`.

---

## 8. Planned Phase 14 Improvements & Action Items

| Item | Area | Action |
| :---: | :--- | :--- |
| **1** | Network Segmentation | Implement 3-tier logical networks: `guardianlink-public-net`, `guardianlink-backend-net`, `guardianlink-ai-net`. |
| **2** | Service Isolation | Restrict `client` to public net; `mongo` and `redis` to backend net; `ai-service` and `qdrant` to AI net. |
| **3** | Container Health Checks | Add robust health checks to `mongo` (mongosh), `redis` (redis-cli), and `server` (wget probe). |
| **4** | Dependency Conditions | Add `condition: service_healthy` to `depends_on` blocks for predictable startup order. |
| **5** | Compose Profiles | Add `profiles: ["debug"]` to `mongo-express` in `docker-compose.yml`. |
| **6** | Production Hardening | Ensure `docker-compose.prod.yml` has zero host port publishing for mongo, redis, ai-service, qdrant. |
| **7** | Dockerignore Cleanup | Add `.env` and build artifacts to `client/.dockerignore`. |
| **8** | Automated Test Suite | Implement `server/tests/phase14_docker_architecture.test.js` validating networks, configs, and isolation. |
| **9** | Deployment Docs | Update deployment, backup, restore, troubleshooting, and rollback procedures in documentation. |
| **10**| Regression Verification | Verify zero regressions across Phase 12, Phase 13, complete server suite, client tests, and python tests. |

---

## 9. Conclusion

The existing GuardianLink architecture provides a solid foundation. Implementing strict 3-tier network segmentation, comprehensive container health checks, Compose profile protection for admin tools, and explicit production port isolation will complete the production-ready Docker deployment architecture.
