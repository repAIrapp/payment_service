const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const paymentRoutes = require("./src/routes/paymentRoute");
const webhookRoutes = require("./src/routes/webhookroute"); 
const client = require("prom-client");
dotenv.config();
const app = express();

const register = new client.Registry();
// Crée une métrique de type Counter
const paymentRequestsCounter = new client.Counter({
  name: "payment_requests_total",
  help: "Nombre total de requêtes sur le service payment",
  labelNames: ["method", "route", "status"]
});

// Enregistre la métrique dans le registre
register.registerMetric(paymentRequestsCounter);

// Collecte les métriques système par défaut
client.collectDefaultMetrics({ register });

// Middleware pour enregistrer chaque requête
app.use((req, res, next) => {
  res.on("finish", () => {
    paymentRequestsCounter.inc({
      method: req.method,
      route: req.path,
      status: res.statusCode
    });
  });
  next();
});

// 🟠 Le webhook Stripe a besoin du body brut — donc il doit être défini AVANT express.json()
app.use("/api/webhook", webhookRoutes); // ✅ Branche d'abord le webhook ici

app.use(cors());
app.use(express.json()); // 🔴 À ne PAS mettre avant le webhook
// app.use(bodyParser.raw({ type: "application/json" })); ❌ À enlever, c’est remplacé par express.text dans la route webhook

// ✅ Routes de paiement
app.use("/api/payments", paymentRoutes);
app.get("/metrics", async (req, res) => {
  res.setHeader("Content-Type", register.contentType);
  res.send(await register.metrics());
});
app.listen(process.env.PORT, () =>
  console.log(` Paiement service running on http://localhost:${process.env.PORT}`)
);
const metricsApp = express();
metricsApp.get("/metrics", async (req, res) => {
  res.setHeader("Content-Type", register.contentType);
  res.send(await register.metrics());
});
metricsApp.listen(9103, () => {
  console.log("📊 payment service metrics exposed on http://localhost:9103/metrics");
});