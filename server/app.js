const express = require("express");
const cors = require("cors");
require("dotenv").config();

// Route Imports
const rootRoutes = require("./routes/rootRoutes");
const healthRoutes = require("./routes/healthRoutes");

// Middleware Imports
const errorHandler = require("./middleware/errorHandler");

const app = express();

// Enable Cross-Origin Resource Sharing
app.use(cors());

// Body Parser Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Mount Routes
app.use("/", rootRoutes);
app.use("/api", healthRoutes);

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
  console.log(`🛡️  GuardianLink Server Started Successfully`);
  console.log(`📡 Server Running on : http://localhost:${PORT}`);
  console.log(`⚙️  Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`=============================================`);
});

module.exports = app;
