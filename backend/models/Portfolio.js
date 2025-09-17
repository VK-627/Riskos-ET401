const mongoose = require('mongoose');

const portfolioSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    portfolioName: { type: String, required: true },
    stocks: [{ 
        symbol: String, 
        quantity: Number 
    }],
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Portfolio', portfolioSchema);
