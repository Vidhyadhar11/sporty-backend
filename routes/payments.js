const express = require("express");
const routes = express.Router();
const Razorpay = require("razorpay");
const crypto = require("crypto"); // Importing the crypto module
const Payment = require("./../models/payments");

// Configure Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

routes.post('/createOrder', async (req, res) => {
  const options = {
    amount: req.body.amount,
    currency: 'INR',
    receipt: 'receipt_order_74394'
  };

  try {
    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (error) {
    res.status(500).send(error);
  }
});

routes.post('/verifyPayment', async (req, res) => {
  const secret = process.env.RAZORPAY_KEY_SECRET;

  const shasum = crypto.createHmac('sha256', secret);
  shasum.update(req.body.razorpay_order_id + "|" + req.body.razorpay_payment_id);
  const digest = shasum.digest('hex');

  if (digest === req.body.razorpay_signature) {
    const payment = new Payment({
      userId: req.body.userId,
      amount: req.body.amount,
      paymentId: req.body.razorpay_payment_id,
      orderId: req.body.razorpay_order_id
    });

    try {
      const savedPayment = await payment.save();
      res.json({ status: 'success', payment: savedPayment });
    } catch (err) {
      res.status(500).send(err);
    }
  } else {
    res.status(400).json({ status: 'failure' });
  }
});

routes.get('/admin', async (req, res) => {
  const { type } = req.query; // daily, weekly, monthly
  let date = new Date();
  
  if (type === 'daily') {
    date.setDate(date.getDate() - 1);
  } else if (type === 'weekly') {
    date.setDate(date.getDate() - 7);
  } else if (type === 'monthly') {
    date.setMonth(date.getMonth() - 1);
  }

  try {
    const payments = await Payment.find({ paymentDate: { $gte: date } });
    res.json(payments);
  } catch (error) {
    res.status(500).send(error);
  }
});

routes.get('/earning', async (req, res) => {
  const { type } = req.query; // daily, weekly, monthly
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
      { $match: { paymentDate: { $gte: date } } },
      { $group: { _id: null, totalAmount: { $sum: "$amount" } } }
    ]);
    
    const totalAmount = payments.length > 0 ? payments[0].totalAmount : 0;
    res.json({ totalAmount });
  } catch (error) {
    res.status(500).send(error);
  }
});

module.exports = routes;
