const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
require("dotenv").config();

// Database & Cache Services
const connectDB = require("./config/db");
const { initRedis } = require("./config/redis");
const bootstrapAdmin = require("./utils/bootstrapAdmin");

// Route Imports
const rootRoutes = require("./routes/rootRoutes");
const healthRoutes = require("./routes/healthRoutes");
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");

// Middleware Imports
const errorHandler = require("./middleware/errorHandler");

const app = express();

// Initialize Database, Admin bootstrap & Redis Cache
const initializeServices = async () => {
  await connectDB();
  await bootstrapAdmin();
  initRedis();
};
initializeServices();

// Security HTTP Headers
app.use(helmet());

// Cross-Origin Resource Sharing with Credentials (for HttpOnly Cookies)
const allowedOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173"
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps, curl, postman)
      if (!origin) return callback(null, true);
      // Return origin string explicitly for credentialed requests
      if (allowedOrigins.includes(origin) || process.env.NODE_ENV !== "production") {
        return callback(null, origin);
      }
      return callback(null, origin);
    },
    credentials: true
  })
);

// Cookie Parser Middleware
app.use(cookieParser(process.env.COOKIE_SECRET || "guardianlink_cookie_secret_key_774411"));

// Body Parser Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Mount Routes
app.use("/", rootRoutes);
app.use("/api", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);

// Catch 404 & forward to error handler
app.use((req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
});

// Mount Global Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`=============================================`);
  console.log(`🛡️  GuardianLink Full-Stack Server Started`);
  console.log(`📡 API Running on : http://localhost:${PORT}`);
  console.log(`⚙️  Environment : ${process.env.NODE_ENV || "development"}`);
  console.log(`=============================================`);
});

module.exports = app;
