const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const paymentRoutes = require("./src/routes/paymentRoute");
const webhookRoutes = require("./src/routes/webhookroute"); // ✅ Ajout de ta route webhook

dotenv.config();
const app = express();

// 🟠 Le webhook Stripe a besoin du body brut — donc il doit être défini AVANT express.json()
app.use("/webhook", webhookRoutes); // ✅ Branche d'abord le webhook ici

app.use(cors());
app.use(express.json()); // 🔴 À ne PAS mettre avant le webhook
// app.use(bodyParser.raw({ type: "application/json" })); ❌ À enlever, c’est remplacé par express.text dans la route webhook

// ✅ Routes de paiement
app.use("/api/payments", paymentRoutes);

app.listen(process.env.PORT, () =>
  console.log(` Paiement service running on http://localhost:${process.env.PORT}`)
);
