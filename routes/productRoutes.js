const express = require("express");
const mongoose = require("mongoose");
const Product = require("../models/Product");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Protect all product routes
router.use(authMiddleware);

// Allowed product fields
const allowedFields = [
  "name",
  "sku",
  "category",
  "price",
  "stock",
  "minimumStock",
  "barcode",
  "image",
  "description",
];

// Validate MongoDB ID
function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// GET /api/products
// Get products belonging only to the logged-in shop owner
router.get("/", async (req, res) => {
  try {
    const products = await Product.find({
      ownerId: req.user.id,
    }).sort({ createdAt: -1 });

    return res.status(200).json(products);
  } catch (error) {
    console.error("Get products error:", error);

    return res.status(500).json({
      message: "Failed to fetch products.",
    });
  }
});

// GET /api/products/:id
// Get one product belonging to the logged-in owner
router.get("/:id", async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid product ID.",
      });
    }

    const product = await Product.findOne({
      _id: req.params.id,
      ownerId: req.user.id,
    });

    if (!product) {
      return res.status(404).json({
        message: "Product not found.",
      });
    }

    return res.status(200).json(product);
  } catch (error) {
    console.error("Get product error:", error);

    return res.status(500).json({
      message: "Failed to fetch product.",
    });
  }
});

// POST /api/products
// Add a product to the logged-in owner's shop
router.post("/", async (req, res) => {
  try {
    const productData = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        productData[field] = req.body[field];
      }
    }

    // Required fields
    const requiredFields = [
      "name",
      "sku",
      "category",
      "price",
    ];

    for (const field of requiredFields) {
      if (
        productData[field] === undefined ||
        productData[field] === null ||
        String(productData[field]).trim() === ""
      ) {
        return res.status(400).json({
          message: `${field} is required.`,
        });
      }
    }

    // Validate numeric fields
    for (const field of [
      "price",
      "stock",
      "minimumStock",
    ]) {
      if (
        productData[field] !== undefined &&
        (
          productData[field] === "" ||
          !Number.isFinite(Number(productData[field])) ||
          Number(productData[field]) < 0
        )
      ) {
        return res.status(400).json({
          message: `${field} must be a valid non-negative number.`,
        });
      }
    }

    // Stock must be a whole number
    for (const field of ["stock", "minimumStock"]) {
      if (
        productData[field] !== undefined &&
        !Number.isInteger(Number(productData[field]))
      ) {
        return res.status(400).json({
          message: `${field} must be a whole number.`,
        });
      }
    }

    // Owner ID must come from the verified JWT, never the request body
    productData.ownerId = req.user.id;

    const product = await Product.create(productData);

    return res.status(201).json({
      message: "Product added successfully.",
      product,
    });
  } catch (error) {
    console.error("Create product error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "This SKU already exists in your shop.",
      });
    }

    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid product data.",
        error: error.message,
      });
    }

    return res.status(500).json({
      message: "Failed to add product.",
    });
  }
});

// PUT /api/products/:id
// Update only a product owned by the logged-in user
router.put("/:id", async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid product ID.",
      });
    }

    const updateData = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        message: "No valid product fields provided.",
      });
    }

    // Validate required text fields when supplied
    for (const field of ["name", "sku", "category"]) {
      if (
        updateData[field] !== undefined &&
        String(updateData[field]).trim() === ""
      ) {
        return res.status(400).json({
          message: `${field} cannot be empty.`,
        });
      }
    }

    // Validate numeric fields
    for (const field of [
      "price",
      "stock",
      "minimumStock",
    ]) {
      if (
        updateData[field] !== undefined &&
        (
          updateData[field] === "" ||
          !Number.isFinite(Number(updateData[field])) ||
          Number(updateData[field]) < 0
        )
      ) {
        return res.status(400).json({
          message: `${field} must be a valid non-negative number.`,
        });
      }
    }

    for (const field of ["stock", "minimumStock"]) {
      if (
        updateData[field] !== undefined &&
        !Number.isInteger(Number(updateData[field]))
      ) {
        return res.status(400).json({
          message: `${field} must be a whole number.`,
        });
      }
    }

    const product = await Product.findOneAndUpdate(
      {
        _id: req.params.id,
        ownerId: req.user.id,
      },
      { $set: updateData },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!product) {
      return res.status(404).json({
        message: "Product not found.",
      });
    }

    return res.status(200).json({
      message: "Product updated successfully.",
      product,
    });
  } catch (error) {
    console.error("Update product error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "This SKU already exists in your shop.",
      });
    }

    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid product data.",
        error: error.message,
      });
    }

    return res.status(500).json({
      message: "Failed to update product.",
    });
  }
});

// DELETE /api/products/:id
// Delete only a product owned by the logged-in user
router.delete("/:id", async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid product ID.",
      });
    }

    const product = await Product.findOneAndDelete({
      _id: req.params.id,
      ownerId: req.user.id,
    });

    if (!product) {
      return res.status(404).json({
        message: "Product not found.",
      });
    }

    return res.status(200).json({
      message: "Product deleted successfully.",
      productId: product._id,
    });
  } catch (error) {
    console.error("Delete product error:", error);

    return res.status(500).json({
      message: "Failed to delete product.",
    });
  }
});

module.exports = router;
