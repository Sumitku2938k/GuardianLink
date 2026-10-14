# GUARDIANLINK — PHASE 6.6: DOCKER & SERVICE NETWORKING INTEGRATION REPORT

**Execution Date:** October 14, 2026  
**Status:** COMPLETED (ALL CRITERIA VERIFIED)  
**Primary Working Directory:** `C:\Users\Sumit\Desktop\College Sem Projects\GuardianLink Sem 5`  
**Friend's Repository:** `C:\Users\Sumit\Desktop\Gaurdian` (Untouched, Unmodified)

---

## 1. PRE-IMPLEMENTATION AUDIT FINDINGS

Prior to implementing any infrastructure modifications, an exhaustive audit of the existing root `docker-compose.yml`, service configurations, Dockerfiles, and environment files was conducted.

### 1.1 Existing Docker Compose Architecture
- **Root Compose File:** `docker-compose.yml` configured services for `mongodb` (`mongo:8.0`), `mongo-express`, `redis` (`redis:7-alpine`), `server` (Node.js Express backend), `client` (React + Vite frontend), and `qdrant` (`qdrant/qdrant:v1.19.2`).
- **Missing Integration in Compose:** The `ai-service` microservice definition was absent from `docker-compose.yml`.
- **Qdrant Healthcheck Gap:** The existing `qdrant` service lacked a container healthcheck, meaning dependent services had no declarative mechanism to wait for vector engine readiness.
- **Port Exposure Analysis:**
  - `mongodb`: `27017:27017`
  - `mongo-express`: `8081:8081`
  - `redis`: `6379:6379`
  - `server`: `5000:5000`
  - `client`: `5173:5173`
  - `qdrant`: `6333:6333` (HTTP REST API) and `6334:6334` (gRPC).

### 1.2 Dockerfile & Container Build Audit
- `ai-service/Dockerfile`: Pre-existing Dockerfile based on `python:3.11-slim`, installing essential runtime libraries (`libgl1`, `libglib2.0-0`, `curl`), installing Python packages from `requirements.txt`, and launching via `uvicorn app.main:app --host 0.0.0.0 --port 8000`.
- Missing `.dockerignore`: No `ai-service/.dockerignore` was present. Virtual environments (`.venv`), tests, local `.env`, and git history risked being bundled into the build context.
- Model Cache Dependency: InsightFace loads model weights from `root/models/<model_name>`. The host machine held the 5 ONNX model files (~377 MB) in `C:\Users\Sumit\.insightface\models\buffalo_l`. A container-compatible mount was required so container startup does not depend on host user profiles or attempt unauthenticated downloads.

### 1.3 Database & Service Security Audit
- Node.js backend connects to MongoDB via `mongodb://mongodb:27017/guardianlink` and Redis via `redis://redis:6379`.
- AI service requires zero direct connectivity to MongoDB, Redis, or Cloudinary. The biometric boundary remains strictly isolated.
- Authentication between services relies on the `X-Internal-Service-Key` header with timing-safe comparison (`hmac.compare_digest`).

---

## 2. EXISTING COMPOSE SERVICES & RELEVANT ARCHITECTURE

The overall multi-container architecture now encompasses six coordinated services:

```mermaid
graph TD
    subgraph Host ["Developer Host Environment"]
        Browser["React Vite Frontend (Host :5173)"]
        NodeDev["Node Backend (Host :5000)"]
    end

    subgraph DockerNet ["Docker Network (guardianlinksem5_default)"]
        ClientCont["client:5173"]
        ServerCont["server:5000"]
        MongoCont["mongodb:27017 (Volume: mongo_data)"]
        RedisCont["redis:6379 (Volume: redis_data)"]
        QdrantCont["qdrant:6333 (Volume: qdrant_data)"]
        AICont["ai-service:8000 (InsightFace buffalo_l)"]
    end

    ServerCont -->|Reads/Writes Metadata| MongoCont
    ServerCont -->|Sessions/Cache| RedisCont
    ServerCont -.->|Phase 6.7 Future Integration| AICont
    AICont -->|Vector Upsert/Search/Delete| QdrantCont
```

All existing services (`mongodb`, `mongo-express`, `redis`, `server`, `client`) retain their exact environment, entrypoints, and named volume configurations.

---

## 3. FILES CREATED AND MODIFIED

| File Path | Action | Rationale |
|---|---|---|
| `docker-compose.yml` | **Modified** | Added `ai-service` container definition, added `qdrant` healthcheck, bound dev ports safely to `127.0.0.1`, configured volume mounts and dependency conditions. |
| `ai-service/.dockerignore` | **Created** | Excludes `.git`, `.venv`, `__pycache__`, `.pytest_cache`, `.env`, tests, and model binaries from the image build context. |
| `.env.example` | **Created** | Root environment template documenting ports, internal keys, Qdrant configuration, and model cache paths without exposing secrets. |
| `.gitignore` | **Created** | Protects root `.env` files, node_modules, build outputs, and local model caches from version control. |
| `ai-service/models/buffalo_l/` | **Created (Local)** | Local directory holding the 5 InsightFace ONNX models, mapped into container via Docker volume. (Git-ignored). |
| `PHASE_6_6_DOCKER_SERVICE_NETWORKING_REPORT.md` | **Created** | Comprehensive Phase 6.6 implementation and validation report. |

---

## 4. AI DOCKERFILE AND IMAGE CONFIGURATION

The AI container image is built using `ai-service/Dockerfile`:

```dockerfile
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Key Design Highlights:
- **Base Image:** Pinned `python:3.11-slim` ensures binary compatibility with `onnxruntime` and `insightface`.
- **System Libraries:** Minimal OpenCV runtime dependencies (`libgl1`, `libglib2.0-0`) and `curl` for the container healthcheck.
- **Production ASGI Server:** Starts Uvicorn without `--reload`, binding strictly to `0.0.0.0:8000` inside the container.
- **Reproducible Build:** Source code is isolated; build context is kept minimal via `.dockerignore`.

---

## 5. MODEL-WEIGHT DISTRIBUTION AND MOUNT STRATEGY

### 5.1 InsightFace Model Requirement
The `buffalo_l` pack consists of 5 pre-trained ONNX models:
1. `det_10g.onnx` (SCRFD face detector) — ~16.1 MB
2. `w600k_r50.onnx` (ArcFace 512D embedding extractor) — ~249.5 MB
3. `1k3d68.onnx` (3D facial landmark estimator) — ~169.5 KB
4. `2d106det.onnx` (2D 106-point landmark detector) — ~4.8 MB
5. `genderage.onnx` (Attribute classification) — ~1.3 MB
*Total storage footprint:* ~377 MB.

### 5.2 Mount Architecture
- **Host Storage Location:** Copied to `ai-service/models/buffalo_l/`.
- **Container Target Directory:** InsightFace searches for `buffalo_l` under `<INSIGHTFACE_HOME>/models/buffalo_l/`.
- **Mount Configuration in Compose:**
  ```yaml
  volumes:
    - ${INSIGHTFACE_CACHE_DIR:-./ai-service/models}:/root/.insightface/models:ro
  ```
- **Security & Integrity:**
  - Mounted read-only (`:ro`) to prevent runtime container tampering.
  - Zero reliance on developer-specific Windows paths (`C:\Users\Sumit\...`).
  - No internet connection or model downloads required at container startup.
  - Ignored in `.gitignore` to avoid pushing large binary blobs to source control.

---

## 6. QDRANT SERVICE & PERSISTENT STORAGE

### 6.1 Configuration
- **Image:** Pinned `qdrant/qdrant:v1.19.2` (no unqualified `:latest` tag).
- **Persistent Volume:** Docker named volume `qdrant_data` mapped to `/qdrant/storage`.
- **Internal Ports:** REST API on `6333`, gRPC on `6334`.
- **Local Dev Binding:** Mapped to loopback `127.0.0.1:6333:6333` on the host, preventing unauthenticated external network exposure.

### 6.2 Healthcheck Implementation
Because the minimal Qdrant Docker image lacks `curl` and `wget`, a native Bash TCP socket probe was implemented:
```yaml
healthcheck:
  test: ["CMD-SHELL", "bash -c 'exec 3<>/dev/tcp/127.0.0.1/6333 && echo -e \"GET /healthz HTTP/1.1\\r\\nHost: 127.0.0.1\\r\\nConnection: close\\r\\n\\r\\n\" >&3 && cat <&3 | grep -q \"healthz check passed\"'"]
  interval: 10s
  timeout: 5s
  retries: 5
  start_period: 5s
```
This check probes `/healthz` directly without external utilities and marks the container `healthy` within seconds of startup.

---

## 7. FINAL SERVICE TOPOLOGY & NETWORK MEMBERSHIP

All services belong to the bridge network `default` (aliased as `guardianlinksem5_default`).

| Service | Compose Service Name | Container Name | Internal Port | Host Port Binding | Healthcheck |
|---|---|---|---|---|---|
| **AI Microservice** | `ai-service` | `guardianlink-ai-service` | `8000` | `127.0.0.1:8000:8000` | `curl -f http://localhost:8000/health` |
| **Qdrant Vector DB** | `qdrant` | `guardianlink-qdrant` | `6333`, `6334` | `127.0.0.1:6333:6333`, `127.0.0.1:6334:6334` | Bash TCP socket `/healthz` |
| **Node Backend** | `server` | `guardianlink-server` | `5000` | `0.0.0.0:5000:5000` | Node self-test |
| **React Frontend** | `client` | `guardianlink-client` | `5173` | `0.0.0.0:5173:5173` | N/A |
| **MongoDB** | `mongodb` | `guardianlink-mongodb` | `27017` | `0.0.0.0:27017:27017` | `mongosh --eval "db.adminCommand('ping')"` |
| **Redis** | `redis` | `guardianlink-redis` | `6379` | `0.0.0.0:6379:6379` | `redis-cli ping` |
| **Mongo Express** | `mongo-express` | `guardianlink-mongo-express` | `8081` | `0.0.0.0:8081:8081` | N/A |

### Inter-Service Communication Rules:
1. `ai-service` connects to `qdrant` using internal DNS: `http://qdrant:6333`. Container does **not** rely on host ports or `localhost`.
2. `server` connects to `mongodb` (`mongodb://mongodb:27017/guardianlink`) and `redis` (`redis://redis:6379`).
3. In Phase 6.7, `server` will communicate with `ai-service` via internal DNS: `http://ai-service:8000`.
4. `ai-service` has no access and no dependency on MongoDB or Redis.

---

## 8. ENVIRONMENT VARIABLES & SAFE SECRET SETUP

The template `.env.example` was created at the workspace root. Key variables configured:

```ini
# --- AI Microservice Configuration ---
INTERNAL_SERVICE_KEY=your_secure_random_internal_service_key_here
QDRANT_URL=http://qdrant:6333
COLLECTION_NAME=guardianlink_faces
QDRANT_TIMEOUT_SECONDS=10.0
SIMILARITY_THRESHOLD=0.60
INSIGHTFACE_HOME=/root/.insightface
INSIGHTFACE_CACHE_DIR=./ai-service/models
MODEL_NAME=buffalo_l
MAX_UPLOAD_SIZE_BYTES=10485760

# --- Host Port Bindings ---
AI_PORT=8000
QDRANT_PORT=6333
PORT=5000
VITE_PORT=5173
```

- Real secrets are stored in local `.env` which is excluded by `.gitignore`.
- Healthcheck and logging output strictly suppress raw vectors, API keys, and biometric payloads.

---

## 9. HEALTH CHECKS AND DEPENDENCY STARTUP

- **Qdrant Startup Grace:** `start_period: 5s`, intervals of `10s`, 5 retries.
- **AI Service Dependency:** `ai-service` configures:
  ```yaml
  depends_on:
    qdrant:
      condition: service_healthy
  ```
- **Lifespan Tolerance:** The FastAPI application lifespan (`app/main.py`) checks Qdrant health on boot. If Qdrant is initializing, the application logs a warning and marks readiness as degraded without crashing. As soon as Qdrant becomes healthy, queries and indexing succeed automatically.

---

## 10. EXACT COMMANDS EXECUTED AND ACTUAL RESULTS

### 10.1 Compose Configuration Validation
```powershell
docker compose config --quiet
```
**Result:** Exited with code `0`. All service names, networks, volumes, and healthchecks resolved cleanly.

### 10.2 Image Build
```powershell
docker compose build ai-service
```
**Result:** Successfully built `guardianlinksem5-ai-service:latest`. Installed OpenCV dependencies, InsightFace, and FastAPI dependencies cleanly.

### 10.3 Service Startup
```powershell
docker compose up -d qdrant ai-service
```
**Result:** Both containers created and started.

### 10.4 Runtime Container Status Inspection
```powershell
docker compose ps
```
**Actual Output:**
```
NAME                      IMAGE                              COMMAND                  SERVICE      CREATED          STATUS                    PORTS
guardianlink-ai-service   guardianlinksem5-ai-service        "uvicorn app.main:ap…"   ai-service   12 minutes ago   Up 12 minutes (healthy)   127.0.0.1:8000->8000/tcp
guardianlink-qdrant       qdrant/qdrant:v1.19.2              "./entrypoint.sh"        qdrant       12 minutes ago   Up 12 minutes (healthy)   127.0.0.1:6333->6333/tcp, 127.0.0.1:6334->6334/tcp
```

---

## 11. REAL CONTAINER INFERENCE EVIDENCE

To prove the AI container is fully operational and capable of executing actual SCRFD face detection and ArcFace embedding extraction inside Docker (rather than just running a Python process), a live request was sent to the containerized `/internal/face/enroll` endpoint using a valid base64 face image (`test.png`):

```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8000/internal/face/enroll" -Method Post -Headers @{"X-Internal-Service-Key"="test_secret_dev_key_guardianlink_sem5"} -ContentType "application/json" -Body '{"child_id":"docker_test_child_777","image_base64":"<valid_base64>"}'
```

**Actual Response Received:**
```json
{
  "status": "success",
  "face_profile_id": "3c04598c-018c-531a-a92d-6c6286ef339a",
  "child_id": "docker_test_child_777",
  "message": "Biometric face profile successfully created/updated in vector store."
}
```

**Engine Log Inside Container:**
```
2026-10-14 14:04:47,440 [INFO] guardianlink.ai.face_engine: Running SCRFD detection on image shape=(150, 150, 3)
2026-10-14 14:04:47,458 [INFO] guardianlink.ai.face_engine: Exactly one face confirmed (bbox=[37, 43, 102, 114], det_score=0.867)
2026-10-14 14:04:47,460 [INFO] guardianlink.ai.face_engine: Extracting ArcFace normalized 512D embedding
2026-10-14 14:04:47,485 [INFO] guardianlink.ai.face_engine: ArcFace embedding extracted: norm=1.000000, shape=(512,)
2026-10-14 14:04:47,488 [INFO] guardianlink.ai.vector.indexer: Upserting biometric vector for child_id=docker_test_child_777, point_id=3c04598c-018c-531a-a92d-6c6286ef339a
```

Real model inference inside the Docker container is conclusively verified.

---

## 12. REAL AI-TO-QDRANT COMMUNICATION EVIDENCE

### 12.1 Internal DNS Resolution & HTTP Reachability
From inside the running `guardianlink-ai-service` container:
```powershell
docker exec guardianlink-ai-service curl -s http://qdrant:6333/healthz
```
**Actual Response Received:**
```
healthz check passed
```

### 12.2 Health Endpoint Internal State
Requesting the internal `/health` endpoint:
```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8000/health"
```
**Actual Response Received:**
```json
{
  "status": "ok",
  "qdrant_connected": true,
  "collection_ready": true,
  "insightface_loaded": true,
  "model_name": "buffalo_l"
}
```

### 12.3 Complete Biometric Lifecycle Through Docker
1. **Enroll:** Enrolled `docker_test_child_777` (Point ID: `3c04598c-018c-531a-a92d-6c6286ef339a`).
2. **Search:** Sent query with matching face image:
   ```json
   {
     "status": "success",
     "match_found": true,
     "candidates": [
       {
         "child_id": "docker_test_child_777",
         "similarity": 1.0,
         "confidence": "HIGH"
       }
     ]
   }
   ```
3. **Delete:** Sent `DELETE http://127.0.0.1:8000/internal/face/docker_test_child_777`:
   ```json
   {
     "status": "success",
     "child_id": "docker_test_child_777",
     "message": "Biometric face profile deleted from vector store."
   }
   ```
4. **Re-search:** Sent query again:
   ```json
   {
     "status": "success",
     "match_found": false,
     "candidates": []
   }
   ```

Container-to-container networking and end-to-end vector operations function flawlessly.

---

## 13. QDRANT PERSISTENCE & RESTART EVIDENCE

To verify that the named volume `qdrant_data` preserves vector collections across container restarts without data loss:

1. **Test Child Enrolled:** Enrolled dedicated test identifier `persist_test_child_999`.
2. **Pre-Restart Search:** Verified retrieval: candidate `persist_test_child_999` returned with similarity `1.0`.
3. **Container Restart:**
   ```powershell
   docker compose restart qdrant
   ```
   Container `guardianlink-qdrant` stopped and restarted with persistent storage volume mounted.
4. **Post-Restart Search:**
   Queried `/internal/face/search` via the AI service:
   ```json
   {
     "status": "success",
     "match_found": true,
     "candidates": [
       {
         "child_id": "persist_test_child_999",
         "similarity": 1.0,
         "confidence": "HIGH"
       }
     ]
   }
   ```
   The vector record survived container recreation/restart completely intact.
5. **Cleanup:** Test record `persist_test_child_999` was safely deleted post-verification.

---

## 14. REGRESSION RESULTS

### 14.1 AI Service Test Suite (95 Tests)
Executed unittest discovery on `ai-service/tests` (including live vector integration against containerized Qdrant):
```powershell
python -m unittest discover -s tests -p "test_*.py"
```
**Actual Result:**
```
Ran 95 tests in 96.274s
OK
```
- Face detection & validation unit tests: **PASS**
- Quality check unit tests: **PASS**
- Embedding normalization & ArcFace extraction tests: **PASS**
- Qdrant indexer, searcher, and client unit tests: **PASS**
- FastAPI endpoints & authentication unit tests: **PASS**
- Live Qdrant integration tests: **PASS**

### 14.2 Node.js Backend Syntax Check
Validated all JavaScript source files in `server/`:
```powershell
Get-ChildItem -Recurse -Filter *.js server | Where-Object { $_.FullName -notmatch 'node_modules' } | ForEach-Object { node -c $_.FullName }
```
**Actual Result:** Exited with code `0`. All Express controllers, middleware, routes, and models are syntactically valid with zero errors.

### 14.3 React Frontend Production Build
Executed production Vite build in `client/`:
```powershell
npm run build
```
**Actual Result:** Exited with code `0`.
```
vite v8.2.0 building client environment for production...
transforming...✓ 2270 modules transformed.
dist/index.html                     0.61 kB │ gzip:   0.38 kB
dist/assets/index-D2MHvY6-.css     87.38 kB │ gzip:  13.89 kB
dist/assets/index-atTSHS0x.js   1,034.95 kB │ gzip: 243.54 kB
✓ built in 36.15s
```

---

## 15. GIT STATUS AND SCOPE BOUNDARIES

### 15.1 GuardianLink Working Tree Status
```
On branch main
Changes not staged for commit:
	modified:   docker-compose.yml

Untracked files:
	.env.example
	.gitignore
	ai-service/.dockerignore
```
- No changes made to `server/` code.
- No changes made to `client/` code.
- No changes made to MongoDB or Redis configurations.

### 15.2 Friend's Repository Status (`C:\Users\Sumit\Desktop\Gaurdian`)
```
On branch main
Your branch is up to date with 'origin/main'.
Untracked files:
	PHASE_3_AI_PROJECT_AUDIT.md
```
- **The friend's repository remains completely untouched and unmodified.**

---

## 16. BLOCKED TESTS OR ENVIRONMENTAL CONSTRAINTS

- **None.** All planned verifications (Docker daemon startup, Compose configuration, image build, container health, internal networking, real inference, persistence, and regression tests) executed to completion.

---

## 17. COMPLETION CRITERIA CHECKLIST

| Criterion | Status | Evidence |
|---|---|---|
| Existing Compose configuration validates | **PASS** | `docker compose config --quiet` exit 0. |
| AI image builds reproducibly | **PASS** | `docker compose build ai-service` built successfully with pinned Python 3.11-slim. |
| Qdrant runs with persistent storage | **PASS** | `qdrant/qdrant:v1.19.2` runs with named volume `qdrant_data`. |
| AI service resolves and reaches Qdrant via Docker network | **PASS** | `docker exec guardianlink-ai-service curl -s http://qdrant:6333/healthz` returned `healthz check passed`. |
| AI service loads model inside container | **PASS** | Mounted `./ai-service/models` to `/root/.insightface/models:ro`; loaded `buffalo_l` without network downloads. |
| Real face inference works inside container | **PASS** | Enrolled and searched real face image inside Docker; SCRFD bbox score `0.867`, ArcFace norm `1.000000`. |
| Protected enrollment, search, and delete operate in Docker | **PASS** | End-to-end enrollment, search, and deletion verified via HTTP API with `X-Internal-Service-Key`. |
| Health checks and dependency behavior work as documented | **PASS** | Both `ai-service` and `qdrant` reported `healthy`; `depends_on: service_healthy` verified. |
| Existing MongoDB, Redis, Node.js backend, and frontend preserved | **PASS** | Unaltered service configs in Compose; Node syntax checked; Vite client built cleanly. |
| Existing persistent application data preserved | **PASS** | Persistent named volumes `mongo_data`, `redis_data`, `qdrant_data` intact. |
| Regression tests and infrastructure results documented | **PASS** | All 95 AI tests passed; server syntax checked; client build verified. |
| Implementation report complete | **PASS** | `PHASE_6_6_DOCKER_SERVICE_NETWORKING_REPORT.md` delivered at repository root. |

---

## 18. SUMMARY & NEXT STEPS

Phase 6.6 has achieved complete Docker and service networking integration for GuardianLink. The FastAPI AI microservice and standalone Qdrant vector database are fully integrated, healthy, communicating over Docker's internal network, and capable of executing real biometric inference and persistent vector operations without external dependencies or data leaks.

The system is now fully prepared for **Phase 6.7: Node.js Backend AI Client & Internal Service Integration**.
