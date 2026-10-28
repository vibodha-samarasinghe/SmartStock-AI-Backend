require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const productRoutes = require("./routes/productRoutes");
const userRoutes = require("./routes/userRoutes");
const saleRoutes = require("./routes/saleRoutes");

const app = express();
const PORT = process.env.PORT || 5001;
const miraRoutes = require("./routes/miraRoutes");
const miraVoiceRoutes = require("./routes/miraVoiceRoutes");
app.use(cors());
app.use(express.json({ limit: "5mb" }));

app.use("/api/products", productRoutes);
app.use("/api/users", userRoutes);
app.use("/api/mira/voice", miraVoiceRoutes);
app.use("/api/sales", saleRoutes);
app.use("/api/mira", miraRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "SmartStock AI Backend is running successfully!",
  });
});

// Local development server
if (require.main === module) {
  mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => {
      console.log("MongoDB connected successfully!");

      app.listen(PORT, () => {
        console.log(
          `Backend running on http://localhost:${PORT}`
        );
      });
    })
    .catch((error) => {
      console.error(
        "MongoDB connection failed:",
        error.message
      );
      process.exitCode = 1;
    });
}

// Export Express app for deployment
module.exports = app;
