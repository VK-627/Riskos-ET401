// db.js
const mongoose = require("mongoose");
require("dotenv").config();

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/riskos";

    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`MongoDB Connected: ${mongoURI.includes('mongodb+srv') ? 'Atlas Cluster' : 'Local Database'}`);
  } catch (err) {
    console.error("MongoDB connection Error:", err.message);
    process.exit(1);
  }
};

module.exports = connectDB;

