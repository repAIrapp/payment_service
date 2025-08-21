const express = require("express");
const router = express.Router();
const stripeWebhook = require("../webhook/stripeWebhook");
const bodyParser = require("body-parser");

// router.post("/", express.raw({ type: "application/json" }), stripeWebhook);
router.post(
  "/",
  bodyParser.raw({ type: "application/json" }),
  stripeWebhook
);

module.exports = router;
