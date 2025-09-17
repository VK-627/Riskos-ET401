const Portfolio = require('../models/Portfolio');

exports.createPortfolio = async (req, res) => {
    try {
        const { portfolioName, stocks } = req.body;
        const newPortfolio = new Portfolio({
            user: req.user._id,
            portfolioName,
            stocks
        });
        await newPortfolio.save();
        res.status(201).json(newPortfolio);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getUserPortfolios = async (req, res) => {
    try {
        const portfolios = await Portfolio.find({ user: req.user._id });
        res.json(portfolios);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
