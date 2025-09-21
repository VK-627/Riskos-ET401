const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');

// Add stock to portfolio
router.post('/add-stock', protect, async (req, res) => {
    try {
        const { stockName, quantity, buyPrice } = req.body;
        const userId = req.user.id;

        if (!stockName || !quantity || !buyPrice) {
            return res.status(400).json({ error: 'Stock name, quantity, and buy price are required' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check if stock already exists
        const existingStockIndex = user.savedPortfolio.findIndex(
            stock => stock?.stockName?.toLowerCase() === stockName?.toLowerCase()

        );

        if (existingStockIndex !== -1) {
            // Update existing stock
            user.savedPortfolio[existingStockIndex].quantity = quantity;
            user.savedPortfolio[existingStockIndex].buyPrice = buyPrice;
            user.savedPortfolio[existingStockIndex].addedAt = new Date();
        } else {
            // Add new stock
            user.savedPortfolio.push({
                stockName,
                quantity,
                buyPrice,
                addedAt: new Date()
            });
        }

        await user.save();
        res.status(200).json({ message: 'Stock added/updated successfully', savedPortfolio: user.savedPortfolio });
    } catch (error) {
        console.error('Error adding stock:', error);
        res.status(500).json({ error: 'Failed to add stock' });
    }
});

// Update stock in portfolio
router.put('/update-stock/:stockId', protect, async (req, res) => {
    try {
        const { stockId } = req.params;
        const { stockName, quantity, buyPrice } = req.body;
        const userId = req.user.id;

        if (!stockName || !quantity || !buyPrice) {
            return res.status(400).json({ error: 'Stock name, quantity, and buy price are required' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const stockIndex = user.savedPortfolio.findIndex(stock => stock._id.toString() === stockId);
        if (stockIndex === -1) {
            return res.status(404).json({ error: 'Stock not found' });
        }

        user.savedPortfolio[stockIndex].stockName = stockName;
        user.savedPortfolio[stockIndex].quantity = quantity;
        user.savedPortfolio[stockIndex].buyPrice = buyPrice;
        user.savedPortfolio[stockIndex].addedAt = new Date();

        await user.save();
        res.status(200).json({ message: 'Stock updated successfully', savedPortfolio: user.savedPortfolio });
    } catch (error) {
        console.error('Error updating stock:', error);
        res.status(500).json({ error: 'Failed to update stock' });
    }
});

// Delete stock from portfolio
router.delete('/delete-stock/:stockId', protect, async (req, res) => {
    try {
        const { stockId } = req.params;
        const userId = req.user.id;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const stockIndex = user.savedPortfolio.findIndex(stock => stock._id.toString() === stockId);
        if (stockIndex === -1) {
            return res.status(404).json({ error: 'Stock not found' });
        }

        user.savedPortfolio.splice(stockIndex, 1);
        await user.save();
        res.status(200).json({ message: 'Stock deleted successfully', savedPortfolio: user.savedPortfolio });
    } catch (error) {
        console.error('Error deleting stock:', error);
        res.status(500).json({ error: 'Failed to delete stock' });
    }
});

// Get saved portfolio
router.get('/saved', protect, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId).select('savedPortfolio');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ savedPortfolio: user.savedPortfolio });
    } catch (error) {
        console.error('Error fetching portfolio:', error);
        res.status(500).json({ error: 'Failed to fetch portfolio' });
    }
});

// Save calculation to history
router.post('/save-calculation', protect, async (req, res) => {
    try {
        const { calculationType, portfolio, confidenceLevel, forecastDays, results } = req.body;
        const userId = req.user.id;

        if (!calculationType || !portfolio || !results) {
            return res.status(400).json({ error: 'Calculation data is required' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const historyEntry = {
            calculationType,
            portfolio,
            confidenceLevel,
            forecastDays,
            results,
            calculatedAt: new Date()
        };

        user.calculationHistory.unshift(historyEntry); // Add to beginning of array

        // Keep only last 50 calculations to prevent database bloat
        if (user.calculationHistory.length > 50) {
            user.calculationHistory = user.calculationHistory.slice(0, 50);
        }

        await user.save();

        res.json({ 
            message: 'Calculation saved to history',
            historyEntry
        });
    } catch (error) {
        console.error('Error saving calculation:', error);
        res.status(500).json({ error: 'Failed to save calculation' });
    }
});

// Get calculation history
router.get('/history', protect, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId).select('calculationHistory');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ history: user.calculationHistory });
    } catch (error) {
        console.error('Error fetching history:', error);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

// Clear all history
router.delete('/clear-history', protect, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        user.calculationHistory = [];
        await user.save();

        res.json({ message: 'History cleared successfully' });
    } catch (error) {
        console.error('Error clearing history:', error);
        res.status(500).json({ error: 'Failed to clear history' });
    }
});

// Clear portfolio
router.delete('/clear', protect, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        user.savedPortfolio = user.savedPortfolio.filter(stock => stock.stockName);
        await user.save();

        res.json({ message: 'Portfolio cleared successfully' });
    } catch (error) {
        console.error('Error clearing portfolio:', error);
        res.status(500).json({ error: 'Failed to clear portfolio' });
    }
});

module.exports = router;
