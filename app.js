require("dotenv").config();
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const db = require("./db");

// Middleware to parse JSON
app.use(bodyParser.json());

// Default Routes
app.get("/", function (req, res) {
  res.send("Hello");
});

// Server PORT
const PORT = process.env.PORT || 3000;

// Imports the Routes Files
const adminuser = require("./routes/admin");
const userRoutes = require("./routes/users");
const turfRoutes = require("./routes/turf");
const bookRoutes = require("./routes/booking");
const communityRoutes = require("./routes/community");
const otpRoutes = require("./routes/otp");
const paymentRoutes = require('./routes/payments');

// Use the routes
app.use("/admin", adminuser);
app.use("/users", userRoutes);
app.use("/turf", turfRoutes);
app.use("/booking", bookRoutes);
app.use("/community-group", communityRoutes);
app.use("/", otpRoutes);
app.use('/payments', paymentRoutes);

// Server Start
app.listen(PORT, () => console.log(`Server Started at PORT:${PORT}`));
