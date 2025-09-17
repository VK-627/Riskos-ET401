const axios = require("axios");
const PredictionResult = require("../models/PredictionResult");
const path = require("path");
const RiskResult = require("../models/RiskResult");

// =================== MARKET CONTROLLER SECTION ===================
const getPrice = async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const nseSymbol = symbol.endsWith(".NS") ? symbol : `${symbol}.NS`;

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${nseSymbol}?interval=1d&range=1d`;

    const response = await axios.get(url);
    const data = response.data;

    const result = data.chart.result[0];
    const price = result.meta.regularMarketPrice;

    res.json({ symbol, price });
  } catch (error) {
    console.error("Error fetching price:", error.message);
    res.status(500).json({ error: "Failed to fetch price." });
  }
};

// =================== RISK CONTROLLER SECTION ===================
const calculateRisk = async (req, res) => {
  console.log("Received request in Express:", req.body);

  try {
    const flaskUrl = "http://localhost:5002/calculate-risk";
    const response = await axios.post(flaskUrl, req.body);

    console.log("Flask response data:", response.data);
    
    // Save to MongoDB
    const riskResult = new RiskResult({
      user: req.user._id, // From auth middleware
      type: "calculate",
      input: {
        symbols: req.body.portfolio.map(stock => stock.stockName),
        quantities: req.body.portfolio.map(stock => parseInt(stock.quantity, 10)),
        buyPrices: req.body.portfolio.map(stock => parseInt(stock.buyPrice, 10))
      },
      output: {
        var: response.data.var,
        cvar: response.data.cvar,
        sharpeRatio: response.data.sharpeRatio,
        maxDrawdown: response.data.maxDrawdown,
        monteCarlo: response.data.monteCarlo || {
          meanReturn: 0,
          stdDeviation: 0
        }
      },
      // Additional fields from response if needed
      ...response.data
    });

    await riskResult.save();
    console.log("Risk result saved to MongoDB");
    
    res.json({
      ...response.data,
      mongoId: riskResult._id // Return the saved document ID
    });
  } catch (error) {
    console.error("Error in risk calculation:", error.message);
    if (error.response) {
      console.error("Flask error response:", error.response.data);
    }
    res.status(500).json({ error: "Something went wrong while calculating risk." });
  }
};
// =================== PREDICTION CONTROLLER SECTION ===================
const analyzePortfolio = async (req, res) => {
  // Log the incoming request data for debugging
  console.log("Calling Flask with:", req.body);

  try {
    // Make sure all numeric values are properly parsed before sending to Flask
    // The frontend is sending strings but Flask expects numbers
    const formattedPayload = {
      portfolio: req.body.portfolio.map(stock => ({
        stockName: stock.stockName,
        quantity: parseInt(stock.quantity, 10),  // Convert string to integer
        buyPrice: parseInt(stock.buyPrice, 10)   // Convert string to integer
      })),
      confidenceLevel: parseInt(req.body.confidenceLevel, 10),
      forecastDays: parseInt(req.body.forecastDays, 10),
      folderPath: req.body.folderPath
    };

    console.log("Formatted payload for Flask:", formattedPayload);

    const flaskUrl = "http://localhost:5002/predict-portfolio";
    const response = await axios.post(flaskUrl, formattedPayload, {
      headers: {
        'Content-Type': 'application/json'
      },
      // Increase timeout if needed for complex calculations
      timeout: 30000 // 30 seconds
    });

    const result = response.data;
    
    // Save the prediction to database
    const newPrediction = new PredictionResult({
      user: req.user._id,
      input: formattedPayload, // Save the formatted input
      result,
      visualization: result.visualization || null,
    });

    const saved = await newPrediction.save();
    res.json(saved);
  } catch (error) {
    console.error("Prediction error:", error.message);
    
    // Enhanced error handling with more details
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error("Flask API error response:", error.response.data);
      res.status(error.response.status).json({ 
        error: "Failed to analyze portfolio", 
        details: error.response.data.error || error.response.statusText 
      });
    } else if (error.request) {
      // The request was made but no response was received
      console.error("No response from Flask API");
      res.status(504).json({ 
        error: "Failed to analyze portfolio", 
        details: "No response received from prediction service" 
      });
    } else {
      // Something happened in setting up the request that triggered an Error
      res.status(500).json({ 
        error: "Failed to analyze portfolio", 
        details: error.message 
      });
    }
  }
};

const getPredictionResult = async (req, res) => {
  try {
    const result = await PredictionResult.findOne({ _id: req.params.id, user: req.user._id });
    if (!result) return res.status(404).json({ message: "Result not found" });
    res.json(result);
  } catch (error) {
    console.error("Get result error:", error.message);
    res.status(500).json({ error: "Failed to retrieve result" });
  }
};

const getUserPredictionHistory = async (req, res) => {
  try {
    const history = await PredictionResult.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(history);
  } catch (error) {
    console.error("History error:", error.message);
    res.status(500).json({ error: "Failed to fetch history" });
  }
};

const getPredictionVisualization = (req, res) => {
  const filePath = path.join(
    __dirname,
    "../../flask-api/portfolio_analysis_outputs",
    req.params.filename
  );
  res.sendFile(filePath);
};

module.exports = {
  getPrice,
  calculateRisk,
  analyzePortfolio,
  getPredictionResult,
  getUserPredictionHistory,
  getPredictionVisualization,
};