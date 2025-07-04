const express = require("express");
const router = express.Router();
const { createCheckoutSession } = require("../controllers/paymentController");

// 📦 Créer une session Stripe Checkout
router.post("/create-session", createCheckoutSession);

module.exports = router;
