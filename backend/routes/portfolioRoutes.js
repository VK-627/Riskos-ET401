const express = require('express');
const router = express.Router();
const { createPortfolio, getUserPortfolios } = require('../controllers/portfolioController');
const { protect } = require('../middleware/authMiddleware');

// POST a new portfolio
router.post('/', protect, createPortfolio);

// GET all portfolios of the logged-in user
router.get('/', protect, getUserPortfolios);

module.exports = router;
