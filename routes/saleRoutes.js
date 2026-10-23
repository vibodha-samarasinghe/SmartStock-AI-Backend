const express = require("express");
const mongoose = require("mongoose");

const Sale = require("../models/Sale");
const Product = require("../models/Product");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Require an authenticated user.
// Authentication middleware must verify the session/JWT
// and set req.user.id before these routes run.
function requireAuth(req, res, next) {
  if (!req.user || !req.user.id) {
    return res.status(401).json({
      message: "Please log in to access sales.",
    });
  }

  if (!mongoose.isValidObjectId(req.user.id)) {
    return res.status(401).json({
      message: "Invalid authenticated user.",
    });
  }

  next();
}
router.use(authMiddleware);
router.use(requireAuth);

// GET: Retrieve only the logged-in owner's sales
router.get("/", async (req, res) => {
  try {
    const sales = await Sale.find({
      ownerId: req.user.id,
    }).sort({ createdAt: -1 });

    res.status(200).json(sales);
  } catch (error) {
    console.error("Get sales error:", error);

    res.status(500).json({
      message: "Failed to fetch sales",
    });
  }
});

// POST: Create a sale and reduce the owner's product stock
router.post("/", async (req, res) => {
  try {
    const {
      productId,
      quantity,
      customerName,
      paymentMethod,
    } = req.body;

    // Validate product ID
    if (!productId) {
      return res.status(400).json({
        message: "Product ID is required",
      });
    }

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({
        message: "Invalid product ID",
      });
    }

    // Validate quantity
    const saleQuantity = Number(quantity);

    if (!Number.isSafeInteger(saleQuantity) || saleQuantity < 1) {
      return res.status(400).json({
        message: "Quantity must be a positive whole number",
      });
    }

    // Validate payment method
    const method = paymentMethod || "Cash";

    if (!["Cash", "Card"].includes(method)) {
      return res.status(400).json({
        message: "Payment method must be Cash or Card",
      });
    }

    // Find the product AND verify it belongs to this owner
    const product = await Product.findOne({
      _id: productId,
      ownerId: req.user.id,
    });

    if (!product) {
      return res.status(404).json({
        message: "Product not found in your shop",
      });
    }

    // Price is taken from the database, not trusted from the client
    const unitPrice = Number(product.price);

    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      return res.status(400).json({
        message: "Product has an invalid price",
      });
    }

    const totalAmount = unitPrice * saleQuantity;

    if (!Number.isFinite(totalAmount)) {
      return res.status(400).json({
        message: "Invalid sale total",
      });
    }

    // Atomically reduce stock only if enough stock is available.
    // This avoids overselling when two requests happen together.
    const updatedProduct = await Product.findOneAndUpdate(
      {
        _id: product._id,
        ownerId: req.user.id,
        stock: { $gte: saleQuantity },
      },
      {
        $inc: { stock: -saleQuantity },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedProduct) {
      const latestProduct = await Product.findOne({
        _id: product._id,
        ownerId: req.user.id,
      });

      if (!latestProduct) {
        return res.status(404).json({
          message: "Product not found in your shop",
        });
      }

      return res.status(400).json({
        message: `Insufficient stock. Available stock: ${latestProduct.stock}`,
      });
    }

    // Create the sale using trusted database values.
    let sale;

    try {
      sale = await Sale.create({
        ownerId: req.user.id,
        productId: updatedProduct._id,
        productName: updatedProduct.name,
        quantity: saleQuantity,
        price: unitPrice,
        totalAmount,
        customerName:
          typeof customerName === "string" && customerName.trim()
            ? customerName.trim()
            : "Walk-in Customer",
        paymentMethod: method,
      });
    } catch (saleError) {
      // Restore stock if saving the sale fails.
      await Product.updateOne(
        {
          _id: updatedProduct._id,
          ownerId: req.user.id,
        },
        {
          $inc: { stock: saleQuantity },
        }
      );

      throw saleError;
    }

    return res.status(201).json({
      message: "Sale completed successfully",
      sale,
      updatedStock: updatedProduct.stock,
    });
  } catch (error) {
    console.error("Create sale error:", error);

    return res.status(400).json({
      message: "Failed to create sale",
      error: error.message,
    });
  }
});

module.exports = router;
