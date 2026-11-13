import { describe, it } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientRoot = path.resolve(__dirname, "..");
const distDir = path.join(clientRoot, "dist");

describe("GuardianLink Phase 15: Frontend Production Build & Bundle Security", () => {
  it("3.1 Production build output directory and index.html exist", () => {
    assert.ok(fs.existsSync(distDir), "client/dist directory must exist after build");
    const indexPath = path.join(distDir, "index.html");
    assert.ok(fs.existsSync(indexPath), "dist/index.html must exist");

    const htmlContent = fs.readFileSync(indexPath, "utf-8");
    assert.ok(htmlContent.includes("<div id=\"root\"></div>") || htmlContent.includes("id=\"root\""));
  });

  it("3.2 Compiled bundle assets exist and contain JavaScript and CSS files", () => {
    const assetsDir = path.join(distDir, "assets");
    assert.ok(fs.existsSync(assetsDir), "dist/assets directory must exist");

    const files = fs.readdirSync(assetsDir);
    const jsFiles = files.filter((f) => f.endsWith(".js"));
    const cssFiles = files.filter((f) => f.endsWith(".css"));

    assert.ok(jsFiles.length > 0, "dist/assets must contain at least one compiled JS file");
    assert.ok(cssFiles.length > 0, "dist/assets must contain at least one compiled CSS file");
  });

  it("3.3 Compiled client JavaScript bundle contains NO server secrets or private keys", () => {
    const assetsDir = path.join(distDir, "assets");
    const files = fs.readdirSync(assetsDir);
    const jsFiles = files.filter((f) => f.endsWith(".js"));

    const forbiddenTokens = [
      "JWT_SECRET",
      "SESSION_SECRET",
      "COOKIE_SECRET",
      "INTERNAL_SERVICE_KEY",
      "CLOUDINARY_API_SECRET",
      "dev_internal_secret_change_in_production",
      "guardianlink_super_secret_jwt_key_2026_safe_child_platform",
      "guardianlink_cookie_secret_key_774411"
    ];

    for (const jsFile of jsFiles) {
      const content = fs.readFileSync(path.join(assetsDir, jsFile), "utf-8");
      for (const token of forbiddenTokens) {
        assert.strictEqual(
          content.includes(token),
          false,
          `Security violation: Found forbidden server secret token '${token}' in public client bundle ${jsFile}`
        );
      }
    }
  });

  it("3.4 Production Nginx configuration enforces SPA routing and security headers", () => {
    const nginxConfPath = path.join(clientRoot, "nginx.conf");
    assert.ok(fs.existsSync(nginxConfPath), "client/nginx.conf must exist");

    const nginxConf = fs.readFileSync(nginxConfPath, "utf-8");
    assert.ok(nginxConf.includes("try_files $uri $uri/ /index.html;"), "Must configure SPA fallback routing");
    assert.ok(nginxConf.includes("X-Content-Type-Options \"nosniff\""), "Must configure nosniff header");
    assert.ok(nginxConf.includes("X-Frame-Options \"SAMEORIGIN\""), "Must configure frame options header");
    assert.ok(nginxConf.includes("Permissions-Policy \"camera=(self), microphone=(), geolocation=(self)\""), "Must configure origin-scoped camera and geolocation permissions policy");
    assert.ok(nginxConf.includes("location = /healthz"), "Must expose unauthenticated /healthz probe");
  });

  it("3.5 Production Dockerfile exists and configures multi-stage Nginx serving", () => {
    const dockerfileProdPath = path.join(clientRoot, "Dockerfile.prod");
    assert.ok(fs.existsSync(dockerfileProdPath), "client/Dockerfile.prod must exist");

    const dockerfileContent = fs.readFileSync(dockerfileProdPath, "utf-8");
    assert.ok(dockerfileContent.includes("AS builder"), "Must use multi-stage build");
    assert.ok(dockerfileContent.includes("FROM nginx:alpine"), "Must use lightweight nginx:alpine runtime");
    assert.ok(dockerfileContent.includes("CMD [\"nginx\", \"-g\", \"daemon off;\"]"), "Must start Nginx in foreground");
  });
});
