const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true
        },
        email: {
            type: String,
            required: true,
            unique: true
        },
        password: {
            type: String,
            required: false
        },
        googleId: { 
            type: String, 
            required: false
        },
        providers: {
            type: [String],
            default: ['local']
        },
    savedPortfolio: [{
        stockName: String,
        quantity: Number,
        buyPrice: Number,
        addedAt: {
            type: Date,
            default: Date.now
        }
    }],
        calculationHistory: [{
            calculationType: {
                type: String,
                enum: ['current_risk', 'forecast_risk']
            },
            portfolio: [{
                stockName: String,
                quantity: Number,
                buyPrice: Number
            }],
            confidenceLevel: Number,
            forecastDays: Number,
            results: {
                portfolio_summary: mongoose.Schema.Types.Mixed,
                individual_stocks: mongoose.Schema.Types.Mixed
            },
            calculatedAt: {
                type: Date,
                default: Date.now
            }
        }]
    },
    {
        timestamps: true
    }
);

const User = mongoose.model("User", userSchema);
module.exports = User;
