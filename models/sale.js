const mongoose = require("mongoose");

const saleSchema = new mongoose.Schema(
  {
    // Shop owner who created this sale
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    productName: {
      type: String,
      required: true,
      trim: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    customerName: {
      type: String,
      trim: true,
      default: "Walk-in Customer",
    },

    paymentMethod: {
      type: String,
      enum: ["Cash", "Card"],
      default: "Cash",
    },
  },
  {
    timestamps: true,
  }
);

saleSchema.index({ ownerId: 1, createdAt: -1 });

module.exports = mongoose.model("Sale", saleSchema);
