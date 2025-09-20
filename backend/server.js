require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const connectDB = require("./db"); // MongoDB connection file
const authRoutes = require("./routes/authRoutes");
const newsRoutes = require("./routes/newsRoutes");
const riskAnalysisRoutes = require("./routes/RiskAnalysisRoutes");
const portfolioRoutes = require("./routes/portfolioRoutes");
const app = express();
const passport = require('passport');
require('./config/passport'); // initialize strategies

// Middleware
app.use(express.json());

// CORS configuration (adjust based on your frontend port)
app.use(
  cors({
    origin: "http://localhost:5001",  // React frontend URL
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type" , 'Authorization'],
  })
);

// MongoDB connection
connectDB(); // Connect to MongoDB

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/news", newsRoutes);
app.use("/api", riskAnalysisRoutes);
app.use("/api/portfolio", portfolioRoutes);
app.use(passport.initialize());
// Example of getting current user (authentication should be handled properly)
app.get("/api/auth/current-user", (req, res) => {
  const user = req.user; // Assuming user info is attached to the request (JWT or session)
  if (user) {
    res.json(user);  // If user exists, return user data
  } else {
    res.status(404).json({ message: "User not found" });
  }
});

// Base route (optional)
app.get("/", (req, res) => {
  res.send("RISKOS Backend is Running!");
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

// Start Server with retry if port in use
const startServer = (port) => {
  const server = app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      const fallback = 5003;
      if (port !== fallback) {
        console.warn(`Port ${port} in use. Retrying on ${fallback}...`);
        startServer(fallback);
      } else {
        console.error(`Fallback port ${fallback} also in use.`);
        process.exit(1);
      }
    } else {
      console.error('Server error:', err);
      process.exit(1);
    }
  });
};

startServer(parseInt(process.env.PORT, 10) || 5000);
