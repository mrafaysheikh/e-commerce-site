/* =====================================================
   NOTED2SELF. - API server (Node.js + Express + MongoDB)
   Run:  npm install  (first time)
         npm start
   Needs a .env file (see .env.example). NEVER commit
   .env or share its values in chat.
   ===================================================== */
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const bcrypt = require("bcryptjs");
const { Product, Admin } = require("./models");
const routes = require("./routes");

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(",") : true }));
app.use(express.json({ limit: "100kb" }));

app.get("/api/health", (req, res) => res.json({ ok: true }));
app.use("/api", routes);
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Server error" });
});

const PORT = process.env.PORT || 5000;

const SAMPLE_PRODUCTS = [
  { name: "Essential Cotton T-Shirt", price: 29, oldPrice: null, cat: "men", badge: "NEW", img: "men", desc: "Soft 100% cotton tee with a clean regular fit." },
  { name: "Classic Denim Jacket", price: 89, oldPrice: null, cat: "men", badge: "", img: "men", desc: "Heavyweight denim jacket with button front." },
  { name: "Slim Fit Trousers", price: 59, oldPrice: null, cat: "men", badge: "", img: "men", desc: "Stretch cotton trousers with a sharp slim fit." },
  { name: "Oversized Hoodie", price: 69, oldPrice: 89, cat: "women", badge: "SALE", img: "women", desc: "Brushed fleece hoodie, relaxed oversized fit." },
  { name: "Linen Shirt", price: 49, oldPrice: null, cat: "women", badge: "NEW", img: "women", desc: "Breathable linen shirt, perfect for summer." },
  { name: "Summer Dress", price: 79, oldPrice: null, cat: "women", badge: "", img: "women", desc: "Light flowy dress with a flattering cut." },
  { name: "Leather Belt", price: 25, oldPrice: null, cat: "accessories", badge: "", img: "acc", desc: "Genuine leather belt with a matte buckle." },
  { name: "Canvas Sneakers", price: 99, oldPrice: 129, cat: "accessories", badge: "SALE", img: "acc", desc: "Lightweight canvas sneakers for all-day comfort." },
];

async function seed() {
  if ((await Product.countDocuments()) === 0) {
    await Product.insertMany(SAMPLE_PRODUCTS);
    console.log("Seeded sample products");
  }
  if ((await Admin.countDocuments()) === 0 && process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
    await Admin.create({ email: process.env.ADMIN_EMAIL.toLowerCase(), passwordHash: hash });
    console.log("Seeded admin:", process.env.ADMIN_EMAIL);
  }
}

if (!process.env.MONGO_URI) {
  console.error("Missing MONGO_URI in .env. Copy .env.example to .env and fill it in.");
  process.exit(1);
}

mongoose.connect(process.env.MONGO_URI).then(async () => {
  console.log("MongoDB connected");
  await seed();
  app.listen(PORT, () => console.log("API running on port " + PORT));
}).catch(err => {
  console.error("MongoDB connection failed:", err.message);
  process.exit(1);
});
