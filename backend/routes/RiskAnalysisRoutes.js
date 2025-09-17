const express = require("express");
const router = express.Router();

const {
  getPrice,
  calculateRisk,
  analyzePortfolio,
  getPredictionResult,
  getUserPredictionHistory,
  getPredictionVisualization,
} = require("../controllers/RiskAnalysisController");
const { protect } = require("../middleware/authMiddleware");

// ======= MARKET ROUTES =======
router.get("/market/price/:symbol", getPrice);
// Aliases to support existing frontend calls
router.get("/price/:symbol", getPrice);
router.get("/live/price/:symbol", getPrice);

// ======= RISK ROUTES =======
router.options("/risk/calculate", (req, res) => res.sendStatus(200));
router.post("/risk/calculate",protect, calculateRisk);


// ======= PREDICTION ROUTES (protected) =======
router.use("/predict", protect);
router.post("/predict/analyze", analyzePortfolio);
router.get("/predict/result/:id", getPredictionResult);
router.get("/predict/history", getUserPredictionHistory);
router.get("/predict/visualizations/:filename", getPredictionVisualization);

module.exports = router;
