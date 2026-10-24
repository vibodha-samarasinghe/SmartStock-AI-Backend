const mongoose = require("mongoose");
const app = require("../server");

let connectionPromise;

module.exports = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      if (!connectionPromise) {
        connectionPromise = mongoose
          .connect(process.env.MONGODB_URI)
          .catch((error) => {
            connectionPromise = null;
            throw error;
          });
      }

      await connectionPromise;
    }

    return app(req, res);
  } catch (error) {
    console.error("Database connection failed:", error.message);

    return res.status(500).json({
      message: "Database connection failed",
    });
  }
};