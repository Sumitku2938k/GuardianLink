# GuardianLink AI Microservice (`ai-service`)

**Status:** Phase 6.2 Application Skeleton & Folder Structure  
**Architecture Reference:** [PHASE_6_1_AI_INTEGRATION_AUDIT.md](../PHASE_6_1_AI_INTEGRATION_AUDIT.md)  
**Parent Ecosystem:** GuardianLink Child Safety Platform  

---

## 1. Overview

The `ai-service` is an internal Python microservice built with **FastAPI**, **InsightFace (`buffalo_l`)**, **ONNX Runtime**, and **Qdrant Client**. It provides facial biometric capabilities to GuardianLink:

1. **Face Detection & Validation:** Verifies that enrollment portraits contain exactly one human face.
2. **Biometric Feature Extraction:** Generates 512-dimensional $L_2$-normalized ArcFace facial embeddings.
3. **Vector Storage & Retrieval:** Indexes and queries embeddings in a standalone Qdrant vector database using cosine similarity distance.

---

## 2. Architectural Boundaries & Strict Separation of Concerns

* **No User or Auth Logic:** The AI service does **not** manage users, passwords, sessions, or roles. GuardianLink Express backend owns 100% of authentication and access control.
* **No Direct Public Access:** All routes are prefixed with `/internal/` and require an internal pre-shared key header:
  ```http
  X-Internal-Service-Key: <INTERNAL_SERVICE_KEY>
  ```
* **No Personally Identifiable Information (PII):** The AI service stores only mathematical vectors, deterministic UUIDv5 identifiers, and foreign key references (`child_id`). It never handles parent names, email addresses, phone numbers, or residential addresses.
* **No Database Contamination:** The AI service does **not** connect to MongoDB. All child metadata and incident status filtering is handled exclusively upstream by GuardianLink.

---

## 3. Directory Layout

```text
ai-service/
├── app/
│   ├── __init__.py
│   ├── main.py                     # FastAPI application factory & lifespan handler
│   ├── config.py                   # Centralized Pydantic settings & environment configuration
│   ├── middleware/
│   │   ├── __init__.py
│   │   └── internal_auth.py        # Validates X-Internal-Service-Key header
│   ├── schemas/
│   │   ├── __init__.py
│   │   └── biometric.py            # Typed Pydantic request & response contracts
│   ├── engine/
│   │   ├── __init__.py
│   │   ├── face_engine.py          # Unified singleton holding shared InsightFace model
│   │   ├── detector.py             # Adapted face detector wrapper
│   │   └── embedding.py            # Adapted 512-dim embedding extractor & 1-face guard
│   ├── vector/
│   │   ├── __init__.py
│   │   ├── client.py               # Standalone Qdrant client connection factory
│   │   ├── store.py                # Collection management (512-dim, Cosine)
│   │   ├── indexer.py              # Child vector indexing with deterministic UUIDv5
│   │   └── searcher.py             # Vector similarity query returning candidate IDs
│   └── routes/
│       ├── __init__.py
│       ├── health.py               # GET /health & GET / (Service status & probe)
│       ├── enroll.py               # POST /internal/ai/enroll (501 skeleton)
│       ├── search.py               # POST /internal/ai/search (501 skeleton)
│       └── delete.py               # DELETE /internal/ai/delete/{child_id} (501 skeleton)
├── tests/
│   ├── __init__.py
│   ├── assets/
│   │   └── test.png                # Verified reference test portrait
│   └── test_api.py                 # Endpoint registration, auth & health unit tests
├── requirements.txt
├── Dockerfile
├── .env.example
└── README.md
```

---

## 4. Phase Implementation Status

| Component / Route | Current Status | Designated Phase |
|---|---|---|
| Folder Structure & Skeleton | **COMPLETE** | Phase 6.2 |
| `GET /health` & `GET /` | **OPERATIONAL** | Phase 6.2 |
| Internal Key Auth Guard | **OPERATIONAL** | Phase 6.2 |
| Singleton Engine Interface | **SKELETON** | Phase 6.3 (Real Model Inference) |
| Qdrant Client Configuration | **SKELETON** | Phase 6.4 (Vector DB Integration) |
| `POST /internal/ai/enroll` | **501 SKELETON** | Phase 6.5 (Endpoint Implementation) |
| `POST /internal/ai/search` | **501 SKELETON** | Phase 6.5 (Endpoint Implementation) |
| `DELETE /internal/ai/delete/{id}` | **501 SKELETON** | Phase 6.5 (Endpoint Implementation) |
| Docker Compose Multi-Container | **DEFERRED** | Phase 6.6 (Networking & Qdrant Service) |
| GuardianLink Node Client | **DEFERRED** | Phase 6.7 (Backend AI Service) |

---

## 5. Local Setup & Testing

### 1. Virtual Environment Activation
```powershell
# Using the pre-configured project virtual environment
.\.venv\Scripts\Activate.ps1
```

### 2. Running Unit Tests
```powershell
python -m pytest tests/test_api.py -v
```

### 3. Starting the Development Server
```powershell
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
Interactive API documentation: `http://localhost:8000/docs`
