const express = require("express");
const router = express.Router();
const { createCheckoutSession } = require("../controllers/paymentController");
const { body, validationResult } = require("express-validator");


// router.post("/create-session", createCheckoutSession);
router.post(
  "/create-session",
  [
    body("email").isEmail().withMessage("Email invalide"),
    body("userId").notEmpty().withMessage("userId requis"),
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    next();
  },
  createCheckoutSession
);

module.exports = router;
