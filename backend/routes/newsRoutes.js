const express = require('express');
const router = express.Router();
const { getStockNews } = require('../controllers/newsController');

router.get('/', getStockNews); // This maps to /api/news/
module.exports = router;
