import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import connectDB from './config/db.js';
import apiRoutes from './routes/index.js';
import { stripeWebhook } from './controllers/webhookController.js';

process.on("uncaughtException", (err) => {
  console.error("❌ UNCAUGHT EXCEPTION:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("❌ UNHANDLED REJECTION:", err);
});

const app = express();
const PORT = process.env.PORT || 5000;

app.set("trust proxy", 1);

process.env.MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
process.env.MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

console.log("MONGODB_URI:", process.env.MONGODB_URI ? "Loaded ✅" : "Missing ❌");

const allowedOrigins = [
  "http://localhost:3000",
  "https://rentify11-aryan-s-projects-323c3d5d.vercel.app",
  "https://rentify11.vercel.app"
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // Postman / mobile apps

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      console.error("❌ Blocked by CORS:", origin);
      return callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));

app.options("*", cors());


app.post(
  '/api/webhook/stripe',
  express.raw({ type: 'application/json' }),
  (req, res) => {
    try {
      stripeWebhook(req, res);
    } catch (err) {
      console.error("❌ Stripe webhook error:", err);
      res.status(500).send("Webhook error");
    }
  }
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(cookieParser());

app.use(apiRoutes);



app.use((err, req, res, next) => {
  console.error("❌ Express Error:", err);

  res.status(500).json({
    message: err.message || 'Server error'
  });
});

const startServer = async () => {
  try {
    await connectDB();
    console.log("✅ MongoDB Connected");

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

  } catch (error) {
    console.error("❌ Failed to connect MongoDB:", error.message);
    process.exit(1);
  }
};

startServer();