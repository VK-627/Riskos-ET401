const express = require("express");
const router = express.Router();
const {registerUser, loginUser, getUser} = require("../controllers/authController");
const { protect } = require('../middleware/authMiddleware'); // Ensure the file name matches exactly


router.post("/register", registerUser);

router.post("/login", loginUser);

router.get("/me", protect, getUser);

module.exports = router;
