const mongoose = require("mongoose");

const riskResultSchema = new mongoose.Schema({
  // Fields from your existing schema
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  type: {
    type: String,
    enum: ["calculate", "predict"],
    required: true
  },
  input: {
    symbols: [String],
    quantities: [Number],
    buyPrices: [Number],
    predictionMonths: Number
  },
  output: {
    var: Number,
    cvar: Number,
    sharpeRatio: Number,
    maxDrawdown: Number,
    monteCarlo: {
      meanReturn: Number,
      stdDeviation: Number
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  // Fields from the new schema you want to merge
  analysisDate: {
    type: Date,
    default: Date.now
  },
  portfolioValue: String,
  profitLoss: String,
  varAmount: String,
  cvarAmount: String,
  riskLevel: String,
  recommendation: String,
  stocks: [{
    symbol: String,
    positionValue: String,
    weight: String,
    profitLoss: String,
    roi: String,
    varAmount: String,
    cvarAmount: String,
    sharpeRatio: Number,
    maxDrawdown: String,
    forecast: {
      expectedReturn: String,
      recommendation: String
    }
  }],
  visualizationPaths: {
    type: Map,
    of: String
  }
}, {
  // Schema options
  timestamps: true, // Adds createdAt and updatedAt automatically
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Add index for better query performance
riskResultSchema.index({ user: 1, createdAt: -1 });

// You can add virtuals or methods if needed
riskResultSchema.virtual('formattedDate').get(function() {
  return this.createdAt.toLocaleDateString();
});

// Export the model using the pattern that prevents OverwriteModelError
module.exports = mongoose.models.RiskResult || 
       mongoose.model("RiskResult", riskResultSchema);