const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

// Register
router.post("/register", async (req, res) => {
  try {
    const {
      shopName,
      ownerName,
      email,
      password,
      phone,
      address,
      city,
      category,
    } = req.body;

    if (!shopName || !ownerName || !email || !password) {
      return res.status(400).json({
        message: "Please fill in all required fields.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      shopName,
      ownerName,
      email: normalizedEmail,
      password: hashedPassword,
      phone,
      address,
      city,
      category,
    });

    return res.status(201).json({
      message: "Registration successful.",
      user: {
        id: user._id.toString(),
        shopName: user.shopName,
        ownerName: user.ownerName,
        email: user.email,
        phone: user.phone,
        address: user.address,
        city: user.city,
        category: user.category,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);

    return res.status(500).json({
      message: "Registration failed.",
    });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is missing.");

      return res.status(500).json({
        message: "Authentication configuration error.",
      });
    }

    const token = jwt.sign(
      { userId: user._id.toString() },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      message: "Login successful.",
      token,
      user: {
        id: user._id.toString(),
        shopName: user.shopName,
        ownerName: user.ownerName,
        email: user.email,
        phone: user.phone,
        address: user.address,
        city: user.city,
        category: user.category,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      message: "Login failed. Please try again.",
    });
  }
});

module.exports = router;
