const express = require("express");
const routes = express.Router();
const Razorpay = require("razorpay");

// Configure Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create a payment order
routes.post("/create-order", async (req, res) => {
  try {
    const { amount, currency, receipt } = req.body;
    
    const options = {
      amount: amount * 100, // Amount in paise
      currency,
      receipt,
    };

    const order = await razorpay.orders.create(options);
    res.status(200).json(order);
    console.log("Order created successfully");
  } catch (error) {
    console.log("Error creating order", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Verify payment
routes.post("/verify-payment", async (req, res) => {
  const crypto = require("crypto");
  try {
    const { order_id, payment_id, signature } = req.body;
    const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
    hmac.update(order_id + "|" + payment_id);
    const generatedSignature = hmac.digest("hex");

    if (generatedSignature === signature) {
      res.status(200).json({ message: "Payment verified successfully" });
      console.log("Payment verified successfully");
    } else {
      res.status(400).json({ error: "Invalid payment signature" });
      console.log("Invalid payment signature");
    }
  } catch (error) {
    console.log("Error verifying payment", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = routes;