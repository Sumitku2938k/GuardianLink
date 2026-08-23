const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
require("dotenv").config();

// Database & Cache Services
const connectDB = require("./config/db");
const { initRedis } = require("./config/redis");

// Route Imports
const rootRoutes = require("./routes/rootRoutes");
const healthRoutes = require("./routes/healthRoutes");
const authRoutes = require("./routes/authRoutes");

// Middleware Imports
const errorHandler = require("./middleware/errorHandler");

const app = express();

// Initialize Database & Redis Cache
connectDB();
initRedis();

// Security HTTP Headers
app.use(helmet());

// Cross-Origin Resource Sharing with Credentials (for HttpOnly Cookies)
const allowedOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:3000"
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive in dev mode for testing
      }
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
