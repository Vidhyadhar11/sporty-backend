const express = require("express");
const routes = express.Router();
const mongoose = require("mongoose");
const Razorpay = require("razorpay");
const crypto = require("crypto"); // Importing the crypto module
const Payment = require("./../models/payments");
const Turf = require('../models/turf');

// Configure Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create a Razorpay order
routes.post('/createOrder', async (req, res) => {
  const { amount, turfId, userId } = req.body;
  // Find the turf to get the ownerId
  const turf = await Turf.findById(turfId);
  if (!turf) {
    return res.status(404).json({ message: "Turf not found." });
  }

  const options = {
    amount: amount,
    currency: 'INR',
    receipt: `receipt_order_${Date.now()}`,
    notes: {
      turfId: turfId,
      ownerId: turf.ownerid,
      userId: userId
    }
  };

  try {
    const order = await razorpay.orders.create(options);
    res.status(201).json(order);
  } catch (error) {
    res.status(500).send(error);
  }
});

// Verify Razorpay payment
routes.post('/verifyPayment', async (req, res) => {
  const secret = process.env.RAZORPAY_KEY_SECRET;

  const shasum = crypto.createHmac('sha256', secret);
  shasum.update(req.body.razorpay_order_id + "|" + req.body.razorpay_payment_id);
  const digest = shasum.digest('hex');

  if (digest === req.body.razorpay_signature) {
    const { userId, amount, turfId } = req.body;
    
    // Find the turf to get ownerId
    const turf = await Turf.findById(turfId);
    if (!turf) {
      return res.status(404).json({ message: "Turf not found." });
    }

    const payment = new Payment({
      userId: userId,
      amount: amount,
      paymentId: req.body.razorpay_payment_id,
      orderId: req.body.razorpay_order_id,
      ownerId: turf.ownerid, 
      turfId: turfId
    });

    try {
      const savedPayment = await payment.save();
      res.json({ status: 'success', payment: savedPayment});
    } catch (err) {
      res.status(500).send(err);
    }
  } else {
    res.status(400).json({ status: 'failure' });
  }
});

// Get admin payments by date for a specific owner
routes.get('/admin', async (req, res) => {
  const { type, ownerId } = req.query; // daily, weekly, monthly and ownerId
  let date = new Date();

  if (type === 'daily') {
    date.setDate(date.getDate() - 1);
  } else if (type === 'weekly') {
    date.setDate(date.getDate() - 7);
  } else if (type === 'monthly') {
    date.setMonth(date.getMonth() - 1);
  }

  try {
    const payments = await Payment.find({
      ownerId: new mongoose.Types.ObjectId(ownerId),
      paymentDate: { $gte: date }
    });
    res.json(payments);
  } catch (error) {
    res.status(500).send(error);
  }
});

// Get total earnings for a specific owner
routes.get('/earning', async (req, res) => {
  const { type, ownerId } = req.query; // daily, weekly, monthly and ownerId
  let date = new Date();

  if (type === 'daily') {
    date.setDate(date.getDate() - 1);
  } else if (type === 'weekly') {
    date.setDate(date.getDate() - 7);
  } else if (type === 'monthly') {
    date.setMonth(date.getMonth() - 1);
  }

  try {
    const payments = await Payment.aggregate([
      { $match: { ownerId: new mongoose.Types.ObjectId(ownerId), paymentDate: { $gte: date } } },
      { $group: { _id: null, totalAmount: { $sum: "$amount" } } }
    ]);

    const totalAmount = payments.length > 0 ? payments[0].totalAmount : 0;
    res.json({ totalAmount });
  } catch (error) {
    res.status(500).send(error);
  }
});

module.exports = routes;
