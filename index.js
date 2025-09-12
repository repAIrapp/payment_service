const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const paymentRoutes = require("./src/routes/paymentRoute");
const webhookRoutes = require("./src/routes/webhookroute"); 
const client = require("prom-client");
const rateLimit = require("express-rate-limit");
//const mongoSanitize = require("express-mongo-sanitize");
const helmet = require("helmet");

dotenv.config();
const app = express();

const register = new client.Registry();
const paymentRequestsCounter = new client.Counter({
  name: "payment_requests_total",
  help: "Nombre total de requêtes sur le service payment",
  labelNames: ["method", "route", "status"]
});

register.registerMetric(paymentRequestsCounter);

client.collectDefaultMetrics({ register });

app.use(helmet());
//app.use(mongoSanitize());
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
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100, // Limite chaque IP à 100 requêtes par fenêtre
});

app.use(limiter);
app.use("/api/webhook", webhookRoutes); 

app.use(cors());
app.use(express.json()); 

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
  console.log("payment service metrics exposed on http://localhost:9103/metrics");
});