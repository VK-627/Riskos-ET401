const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Check if user already exists
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: "User already exists" });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create a new user
        const newUser = new User({
            name,
            email,
            password: hashedPassword
        });

        // Save user
        const savedUser = await newUser.save();

        // Generate JWT token
        const token = generateToken(savedUser._id);

        // Send response with user info and token
        res.status(201).json({
            _id: savedUser._id,
            name: savedUser.name,
            email: savedUser.email,
            token
        });
    } catch (error) {
        console.error("Error in registering user:", error);
        res.status(500).json({ message: "Error in registering user", error: error.message });
    }
};

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find the user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        // Compare password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid email or password" });
        }

        // Generate JWT token
        const token = generateToken(user._id);

        // Send response with user info and token
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            token
        });
    } catch (error) {
        console.error("Error during login:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

const getUser = async (req, res) => {
    try {
        const user = req.user;
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email
        });
    } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).json({ message: "Unable to fetch user", error: error.message });
    }
};

// Function to generate JWT token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });
};

module.exports = { registerUser, loginUser, getUser };
