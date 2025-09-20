const express = require("express");
const router = express.Router();
const passport = require('passport');
require('../config/passport');
const {registerUser, loginUser, getUser} = require("../controllers/authController");
const { protect } = require('../middleware/authMiddleware'); // Ensure the file name matches exactly


router.post("/register", registerUser);

router.post("/login", loginUser);

router.get("/me", protect, getUser);

// Start Google OAuth flow
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Google OAuth callback
router.get('/google/callback',
	passport.authenticate('google', { session: false, failureRedirect: '/' }),
	(req, res) => {
		// req.user is expected to be { user, token } from passport callback
		const token = req.user && req.user.token;
		const frontend = process.env.FRONTEND_URL || 'http://localhost:5001';
		// Redirect to frontend with token (simple approach)
		res.redirect(`${frontend}/oauth-callback?token=${token}`);
	}
);

module.exports = router;
