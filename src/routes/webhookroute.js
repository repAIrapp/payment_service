const express = require("express");
const router = express.Router();
const stripeWebhook = require("../webhook/stripeWebhook");

// ✅ Stripe attend du JSON brut
router.post("/", express.raw({ type: "application/json" }), stripeWebhook);

module.exports = router;
