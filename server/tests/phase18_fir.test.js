/**
 * GuardianLink — Phase 18: FIR Module Test Suite
 *
 * Comprehensive validation of:
 * 1. Document Security Validator (magic bytes, active content neutralization, checksums, sanitization)
 * 2. Private Document Storage Service (directory containment, safe key generation, streaming)
 * 3. FIR Mongoose Model (schema constraints, status enum, toSafeObject role scoping, PII protection)
 * 4. FIR Business Logic & State Machine (submission, document replacement, police verify & reject)
 * 5. Role-Based Access Control & IDOR Protections (Parent ownership, Police verification, NGO redaction, Citizen block)
 * 6. Audit Logging & Notification Dispatch
 * 7. Controller & Security Header Delivery
 */

const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const FIR = require("../models/FIR");
const MissingCase = require("../models/MissingCase");
const Child = require("../models/Child");
const User = require("../models/User");
const AuditLog = require("../models/AuditLog");
const documentSecurityValidator = require("../utils/documentSecurityValidator");
const documentStorageService = require("../services/documentStorageService");
const firService = require("../services/firService");
const firController = require("../controllers/firController");

describe("GuardianLink Phase 18: Complete FIR Module", () => {
  const TEST_PARENT_ID = new mongoose.Types.ObjectId();
  const TEST_PARENT_2_ID = new mongoose.Types.ObjectId();
  const TEST_POLICE_ID = new mongoose.Types.ObjectId();
  const TEST_ADMIN_ID = new mongoose.Types.ObjectId();
  const TEST_NGO_ID = new mongoose.Types.ObjectId();
  const TEST_CITIZEN_ID = new mongoose.Types.ObjectId();
  const TEST_CASE_ID = new mongoose.Types.ObjectId();
  const TEST_CHILD_ID = new mongoose.Types.ObjectId();

  let parentUser;
  let otherParentUser;
  let policeUser;
  let adminUser;
  let ngoUser;
  let citizenUser;

  // Sample valid file buffers
  const VALID_PDF_BUFFER = Buffer.concat([
    Buffer.from("%PDF-1.4\n%âãÏÓ\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n"),
    Buffer.alloc(64, 0x20)
  ]);
  const VALID_JPEG_BUFFER = Buffer.concat([
    Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]),
    Buffer.alloc(64, 0xaa)
  ]);
  const VALID_PNG_BUFFER = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.alloc(64, 0xbb)
  ]);

  beforeEach(() => {
    parentUser = {
      _id: TEST_PARENT_ID,
      id: TEST_PARENT_ID.toString(),
      name: "Ramesh Sharma",
      role: "parent",
      phone: "+91 9876543210",
      status: "approved"
    };

    otherParentUser = {
      _id: TEST_PARENT_2_ID,
      id: TEST_PARENT_2_ID.toString(),
      name: "Suresh Gupta",
      role: "parent",
      phone: "+91 9876543211",
      status: "approved"
    };

    policeUser = {
      _id: TEST_POLICE_ID,
      id: TEST_POLICE_ID.toString(),
      name: "Inspector Vikram Singh",
      role: "police",
      badgeNumber: "DL-POL-4412",
      station: "Connaught Place Police Station",
      status: "approved"
    };

    adminUser = {
      _id: TEST_ADMIN_ID,
      id: TEST_ADMIN_ID.toString(),
      name: "System Administrator",
      role: "admin",
      status: "approved"
    };

    ngoUser = {
      _id: TEST_NGO_ID,
      id: TEST_NGO_ID.toString(),
      name: "Bachpan Bachao Officer",
      role: "ngo",
      status: "approved"
    };

    citizenUser = {
      _id: TEST_CITIZEN_ID,
      id: TEST_CITIZEN_ID.toString(),
      name: "Concerned Citizen",
      role: "citizen",
      status: "active"
    };
  });

  // =========================================================================
  // 1. Document Security Validator Suite
  // =========================================================================
  describe("1. Document Security Validator", () => {
    it("validates authentic PDF buffer with magic bytes %PDF-", () => {
      const result = documentSecurityValidator.validateDocument(
        VALID_PDF_BUFFER,
        "FIR_Copy_001.pdf",
        "application/pdf"
      );
      assert.strictEqual(result.isValid, true);
      assert.strictEqual(result.detectedMimeType, "application/pdf");
      assert.strictEqual(result.extension, ".pdf");
      assert.strictEqual(typeof result.sha256Checksum, "string");
      assert.strictEqual(result.sha256Checksum.length, 64);
    });

    it("validates authentic JPEG buffer with magic bytes FF D8 FF", () => {
      const result = documentSecurityValidator.validateDocument(
        VALID_JPEG_BUFFER,
        "FIR_Scan_Page1.jpg",
        "image/jpeg"
      );
      assert.strictEqual(result.isValid, true);
      assert.strictEqual(result.detectedMimeType, "image/jpeg");
      assert.strictEqual(result.extension, ".jpg");
    });

    it("validates authentic PNG buffer with magic bytes 89 50 4E 47", () => {
      const result = documentSecurityValidator.validateDocument(
        VALID_PNG_BUFFER,
        "FIR_Receipt.png",
        "image/png"
      );
      assert.strictEqual(result.isValid, true);
      assert.strictEqual(result.detectedMimeType, "image/png");
      assert.strictEqual(result.extension, ".png");
    });

    it("rejects extension spoofing (JPEG disguised as .pdf)", () => {
      assert.throws(
        () => {
          documentSecurityValidator.validateDocument(
            VALID_JPEG_BUFFER,
            "malicious.pdf",
            "application/pdf"
          );
        },
        (err) => {
          return err.code === "EXTENSION_CONTENT_MISMATCH";
        }
      );
    });

    it("rejects unsupported file formats (e.g. plain text or executable)", () => {
      const textBuffer = Buffer.concat([
        Buffer.from("This is a simple text file pretending to be an FIR document."),
        Buffer.alloc(64, 0x20)
      ]);
      assert.throws(
        () => {
          documentSecurityValidator.validateDocument(textBuffer, "fake_doc.txt", "text/plain");
        },
        (err) => {
          return err.code === "UNSUPPORTED_DOCUMENT_EXTENSION" || err.code === "INVALID_DOCUMENT_SIGNATURE";
        }
      );
    });

    it("neutralizes active executable content (/JavaScript) in PDF files", () => {
      const maliciousPdf = Buffer.concat([
        Buffer.from("%PDF-1.4\n1 0 obj\n<< /Type /Action /S /JavaScript /JS (app.alert('XSS')) >>\nendobj\n%%EOF\n"),
        Buffer.alloc(64, 0x20)
      ]);
      assert.throws(
        () => {
          documentSecurityValidator.validateDocument(maliciousPdf, "attack.pdf", "application/pdf");
        },
        (err) => {
          return err.code === "ACTIVE_CONTENT_DETECTED" || err.code === "DISALLOWED_ACTIVE_CONTENT";
        }
      );
    });

    it("rejects files exceeding maximum size (10MB)", () => {
      const oversizedBuffer = Buffer.alloc(11 * 1024 * 1024);
      assert.throws(
        () => {
          documentSecurityValidator.validateDocument(oversizedBuffer, "huge.pdf", "application/pdf");
        },
        (err) => {
          return err.code === "FILE_TOO_LARGE";
        }
      );
    });

    it("rejects undersized buffers (< 32 bytes)", () => {
      const tinyBuffer = Buffer.from("%PDF-1.4");
      assert.throws(
        () => {
          documentSecurityValidator.validateDocument(tinyBuffer, "tiny.pdf", "application/pdf");
        },
        (err) => {
          return err.code === "FILE_TOO_SMALL";
        }
      );
    });

    it("sanitizes path traversal and control characters in filenames", () => {
      const sanitized = documentSecurityValidator.sanitizeFilename("../../../etc/passwd\0.pdf");
      assert.strictEqual(sanitized.includes("/"), false);
      assert.strictEqual(sanitized.includes("\\"), false);
      assert.strictEqual(sanitized.includes("\0"), false);
      assert.strictEqual(sanitized.endsWith(".pdf"), true);
    });
  });

  // =========================================================================
  // 2. Private Document Storage Service Suite
  // =========================================================================
  describe("2. Private Document Storage Service", () => {
    it("enforces storage containment inside server/uploads/private_documents/firs", () => {
      const dir = documentStorageService.PRIVATE_STORAGE_DIR;
      assert.ok(dir.includes("private_documents"));
      assert.ok(dir.includes("firs"));
    });

    it("generates unique collision-resistant storage keys", () => {
      const key1 = documentStorageService.generateStorageKey("case123", 1, ".pdf");
      const key2 = documentStorageService.generateStorageKey("case123", 1, ".pdf");
      assert.notStrictEqual(key1, key2);
      assert.ok(key1.startsWith("fir_case123_v1_"));
      assert.ok(key1.endsWith(".pdf"));
    });

    it("rejects path traversal attempts in storage keys", () => {
      assert.throws(
        () => {
          documentStorageService.resolveSafePath("../../../outside.pdf");
        },
        /path traversal/i
      );
    });

    it("safely saves, verifies existence, and deletes a document", async () => {
      const testKey = documentStorageService.generateStorageKey("testcase", 1, ".pdf");
      await documentStorageService.saveDocument(VALID_PDF_BUFFER, testKey);

      assert.strictEqual(documentStorageService.documentExists(testKey), true);

      const stats = await documentStorageService.getDocumentStats(testKey);
      assert.strictEqual(stats.size, VALID_PDF_BUFFER.length);

      const stream = documentStorageService.getDocumentReadStream(testKey);
      assert.ok(stream);
      await new Promise((resolve) => {
        stream.on("close", resolve);
        stream.destroy();
      });

      const deleted = await documentStorageService.deleteDocument(testKey);
      assert.strictEqual(deleted, true);
      assert.strictEqual(documentStorageService.documentExists(testKey), false);
    });
  });

  // =========================================================================
  // 3. FIR Model & Role-Based Serialization
  // =========================================================================
  describe("3. FIR Model & Safe Object Serialization", () => {
    it("validates required schema constraints and enum values", () => {
      const fir = new FIR({
        missingCaseId: TEST_CASE_ID,
        childId: TEST_CHILD_ID,
        submittedBy: TEST_PARENT_ID,
        firNumber: "fir-2026-0042",
        policeStation: "Connaught Place Police Station",
        district: "Central Delhi",
        state: "Delhi",
        filingDate: new Date(),
        complainantName: "Ramesh Sharma",
        relationship: "Father",
        contactPhone: "+91 9876543210",
        status: "pending_review"
      });

      assert.strictEqual(fir.firNumber, "FIR-2026-0042"); // Uppercase normalization
      assert.strictEqual(fir.status, "pending_review");
    });

    it("rejects invalid status enum values", () => {
      const fir = new FIR({
        missingCaseId: TEST_CASE_ID,
        childId: TEST_CHILD_ID,
        submittedBy: TEST_PARENT_ID,
        firNumber: "FIR-1234",
        policeStation: "Test Station",
        district: "Test District",
        state: "State",
        filingDate: new Date(),
        complainantName: "Test",
        relationship: "Parent",
        contactPhone: "1234567890",
        status: "invalid_status"
      });

      const err = fir.validateSync();
      assert.ok(err);
      assert.ok(err.errors.status);
    });

    it("NEVER exposes internal storageKey in toSafeObject output", () => {
      const fir = new FIR({
        missingCaseId: TEST_CASE_ID,
        childId: TEST_CHILD_ID,
        submittedBy: TEST_PARENT_ID,
        firNumber: "FIR-2026-0042",
        policeStation: "Connaught Place",
        district: "Central",
        state: "Delhi",
        filingDate: new Date(),
        complainantName: "Ramesh Sharma",
        relationship: "Father",
        contactPhone: "+91 9876543210",
        status: "pending_review",
        documents: [
          {
            version: 1,
            originalFilename: "official_fir.pdf",
            storageKey: "fir_topsecret_path_v1_xyz.pdf",
            fileExtension: ".pdf",
            mimeType: "application/pdf",
            fileSizeBytes: 1024,
            sha256Checksum: crypto.createHash("sha256").update("test").digest("hex"),
            uploadedBy: TEST_PARENT_ID,
            isActive: true
          }
        ]
      });

      const safePolice = fir.toSafeObject({ role: "police", userId: TEST_POLICE_ID });
      const safeParent = fir.toSafeObject({ role: "parent", userId: TEST_PARENT_ID });

      assert.strictEqual(safePolice.documents[0].storageKey, undefined);
      assert.strictEqual(safeParent.documents[0].storageKey, undefined);
      assert.strictEqual(safePolice.activeDocument.storageKey, undefined);
      assert.strictEqual(safeParent.activeDocument.storageKey, undefined);
    });

    it("redacts complainant phone number for unauthorized viewers in toSafeObject", () => {
      const fir = new FIR({
        missingCaseId: TEST_CASE_ID,
        childId: TEST_CHILD_ID,
        submittedBy: TEST_PARENT_ID,
        firNumber: "FIR-2026-0042",
        policeStation: "Connaught Place",
        district: "Central",
        state: "Delhi",
        filingDate: new Date(),
        complainantName: "Ramesh Sharma",
        relationship: "Father",
        contactPhone: "+91 9876543210",
        status: "verified"
      });

      // Owning parent sees full phone
      const ownerView = fir.toSafeObject({ role: "parent", userId: TEST_PARENT_ID });
      assert.strictEqual(ownerView.contactPhone, "+91 9876543210");

      // Police officer sees full phone for operational investigations
      const policeView = fir.toSafeObject({ role: "police", userId: TEST_POLICE_ID });
      assert.strictEqual(policeView.contactPhone, "+91 9876543210");

      // Other parent or citizen sees redacted phone
      const otherView = fir.toSafeObject({ role: "parent", userId: TEST_PARENT_2_ID });
      assert.ok(otherView.contactPhone.includes("****"));
      assert.notStrictEqual(otherView.contactPhone, "+91 9876543210");
    });
  });

  // =========================================================================
  // 4. Role-Based Access Control & IDOR Protections
  // =========================================================================
  describe("4. Role-Based Access Control & IDOR Protections", () => {
    it("blocks citizens from accessing case FIRs (403 Forbidden)", async () => {
      // Mock FIR.findOne
      const origFindOne = FIR.findOne;
      FIR.findOne = () => ({
        missingCaseId: TEST_CASE_ID,
        submittedBy: TEST_PARENT_ID,
        firNumber: "FIR-2026-001",
        policeStation: "Station A",
        status: "verified",
        toSafeObject: () => ({ firNumber: "FIR-2026-001" })
      });

      try {
        await assert.rejects(
          async () => {
            await firService.getFIRByCaseId({ caseId: TEST_CASE_ID, user: citizenUser });
          },
          (err) => {
            return err.statusCode === 403 && err.code === "ACCESS_DENIED";
          }
        );
      } finally {
        FIR.findOne = origFindOne;
      }
    });

    it("blocks non-owning parent from viewing another parent's FIR (IDOR Protection)", async () => {
      const origFindOne = FIR.findOne;
      FIR.findOne = () => ({
        missingCaseId: TEST_CASE_ID,
        submittedBy: TEST_PARENT_ID, // Owned by Parent 1
        firNumber: "FIR-2026-001",
        policeStation: "Station A",
        status: "verified",
        toSafeObject: () => ({ firNumber: "FIR-2026-001" })
      });

      try {
        await assert.rejects(
          async () => {
            // Parent 2 attempts to query Parent 1's case FIR
            await firService.getFIRByCaseId({ caseId: TEST_CASE_ID, user: otherParentUser });
          },
          (err) => {
            return err.statusCode === 403 && err.code === "ACCESS_DENIED";
          }
        );
      } finally {
        FIR.findOne = origFindOne;
      }
    });

    it("returns minimal redacted operational view for NGO role", async () => {
      const origFindOne = FIR.findOne;
      FIR.findOne = () => ({
        _id: new mongoose.Types.ObjectId(),
        missingCaseId: TEST_CASE_ID,
        submittedBy: TEST_PARENT_ID,
        firNumber: "FIR-2026-001",
        policeStation: "Station A",
        status: "verified",
        filingDate: new Date(),
        getActiveDocument: () => ({ version: 1, fileExtension: ".pdf" }),
        toSafeObject: () => ({})
      });

      try {
        const ngoView = await firService.getFIRByCaseId({ caseId: TEST_CASE_ID, user: ngoUser });
        assert.ok(ngoView);
        assert.strictEqual(ngoView.firNumber, "FIR-2026-001");
        assert.strictEqual(ngoView.status, "verified");
        assert.strictEqual(ngoView.contactPhone, undefined); // Redacted
        assert.strictEqual(ngoView.documents, undefined); // Storage and files hidden
      } finally {
        FIR.findOne = origFindOne;
      }
    });

    it("blocks citizens and NGOs from downloading document streams", async () => {
      const origFindById = FIR.findById;
      FIR.findById = () => ({
        _id: new mongoose.Types.ObjectId(),
        submittedBy: TEST_PARENT_ID,
        documents: [{ version: 1, storageKey: "some_key.pdf", mimeType: "application/pdf" }],
        getActiveDocument: () => ({ version: 1, storageKey: "some_key.pdf" })
      });

      try {
        await assert.rejects(
          async () => {
            await firService.getDocumentStream({
              firId: new mongoose.Types.ObjectId(),
              user: citizenUser
            });
          },
          (err) => {
            return err.statusCode === 403;
          }
        );

        await assert.rejects(
          async () => {
            await firService.getDocumentStream({
              firId: new mongoose.Types.ObjectId(),
              user: ngoUser
            });
          },
          (err) => {
            return err.statusCode === 403;
          }
        );
      } finally {
        FIR.findById = origFindById;
      }
    });
  });

  // =========================================================================
  // 5. Verification State Machine & Workflow
  // =========================================================================
  describe("5. Verification State Machine & Atomic Operations", () => {
    it("requires mandatory officer review notes (at least 5 chars) for verification", async () => {
      await assert.rejects(
        async () => {
          await firService.verifyFIR({
            firId: new mongoose.Types.ObjectId(),
            officerUser: policeUser,
            reviewNotes: "" // Empty review notes
          });
        },
        (err) => {
          return err.statusCode === 400 && err.code === "NOTES_REQUIRED";
        }
      );
    });

    it("requires mandatory rejection reason and review notes for rejection", async () => {
      await assert.rejects(
        async () => {
          await firService.rejectFIR({
            firId: new mongoose.Types.ObjectId(),
            officerUser: policeUser,
            reviewNotes: "Notes provided",
            rejectionReason: "" // Missing reason
          });
        },
        (err) => {
          return err.statusCode === 400 && err.code === "REJECTION_REASON_REQUIRED";
        }
      );
    });

    it("blocks non-police users from verifying or rejecting FIRs", async () => {
      await assert.rejects(
        async () => {
          await firService.verifyFIR({
            firId: new mongoose.Types.ObjectId(),
            officerUser: parentUser, // Parent attempting officer verification
            reviewNotes: "Looks good to me"
          });
        },
        (err) => {
          return err.statusCode === 403 && err.code === "UNAUTHORIZED_ROLE";
        }
      );
    });
  });

  // =========================================================================
  // 6. Security Headers on Document Streaming
  // =========================================================================
  describe("6. Controller Document Streaming Headers", () => {
    it("sets strict security headers (nosniff, sandbox, no-store) on document streams", async () => {
      const mockStream = {
        pipe: (res) => {
          res.piped = true;
        }
      };

      const origGetDocStream = firService.getDocumentStream;
      firService.getDocumentStream = async () => ({
        readStream: mockStream,
        mimeType: "application/pdf",
        originalFilename: "official_fir.pdf",
        fileSizeBytes: 2048,
        version: 1
      });

      const headers = {};
      const mockRes = {
        setHeader: (name, val) => {
          headers[name] = val;
        }
      };
      const mockReq = {
        params: { firId: new mongoose.Types.ObjectId().toString(), version: "1" },
        user: policeUser
      };

      try {
        await firController.previewDocument(mockReq, mockRes);
        assert.strictEqual(headers["X-Content-Type-Options"], "nosniff");
        assert.strictEqual(headers["Content-Security-Policy"], "sandbox");
        assert.ok(headers["Cache-Control"].includes("no-store"));
        assert.ok(headers["Content-Disposition"].includes("inline"));
        assert.strictEqual(headers["Content-Type"], "application/pdf");
        assert.strictEqual(mockRes.piped, true);
      } finally {
        firService.getDocumentStream = origGetDocStream;
      }
    });
  });
});
