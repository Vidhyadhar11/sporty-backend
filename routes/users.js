const express = require("express");
const routes = express.Router();
const User = require("./../models/users");
const { S3Client } = require("@aws-sdk/client-s3");
const { Upload } = require("@aws-sdk/lib-storage");
const multer = require("multer");
const multerS3 = require("multer-s3");
require("dotenv").config();


const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Configure multer and multerS3 for image uploads
const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.S3_BUCKET_NAME,
    acl: "public-read",
    key: function (req, file, cb) {
      cb(null, `user_profiles/${Date.now()}_${file.originalname}`);
    },
  }),
});

// Create a new user
routes.post("/", async (req, res) => {
  try {
    const data = req.body; // Assuming the request body contains the user data
    const newUser = new User(data);
    const response = await newUser.save();
    console.log("Data Saved Successfully");
    res.status(200).json(response);
  } catch (error) {
    console.log("Error Saving user", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Update a user's profile picturen
routes.put("/profile/:id", upload.single("profile"), async (req, res) => {
  try {
    const userId = req.params.id;
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "Profile image is required" });
    }

    const profileUrl = file.location;
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profile: profileUrl },
      { new: true }
    );
    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    console.log("User profile updated successfully");
    res.status(200).json(updatedUser);
  } catch (error) {
    console.log("Error updating user profile", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Get all users
routes.get("/", async (req, res) => {
  try {
    // Select specific fields to exclude sensitive information
    const data = await User.find().select("-otp -otpExpires -isVerified");
    console.log("Data fetched successfully");
    res.status(200).json(data);
  } catch (error) {
    console.log("Error Fetching users", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Get a specific user by ID
routes.get("/:id", async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId).select(
      "-otp -otpExpires -isVerified"
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    console.log("User details fetched successfully");
    res.status(200).json(user);
  } catch (error) {
    console.log("Error fetching user details", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Update a user
routes.put("/:id", async (req, res) => {
  try {
    const userId = req.params.id;
    const updates = req.body;
    const options = { new: true, runValidators: true };

    const updatedUser = await User.findByIdAndUpdate(userId, updates, options);
    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    console.log("User updated successfully");
    res.status(200).json(updatedUser);
  } catch (error) {
    console.log("Error updating user", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Delete a user
routes.delete("/:id", async (req, res) => {
  try {
    const userId = req.params.id;

    const deletedUser = await User.findByIdAndDelete(userId);
    if (!deletedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    console.log("User deleted successfully");
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.log("Error deleting user", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = routes;