/* =====================================================
   NOTED2SELF. - API routes
   Security notes:
   - Order totals are calculated on the SERVER from DB
     prices. The client-sent total is never trusted.
   - Tracking requires orderId + phone match, so one
     customer cannot look up another customer's order.
   - Admin routes need a JWT (8h expiry). Login is
     rate-limited to slow brute-force attempts.
   - No card data is accepted or stored by any route.
   ===================================================== */
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const rateLimit = require("express-rate-limit");
const { Product, Order, Admin } = require("./models");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "change-me";

function auth(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Login required" });
  try {
    req.admin = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Too many login attempts, try again later" },
});

/* ---------- Admin login ---------- */
router.post("/auth/login", loginLimiter, async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });
  const admin = await Admin.findOne({ email: String(email).toLowerCase() });
  if (!admin) return res.status(401).json({ error: "Invalid email or password" });
  const ok = await bcrypt.compare(password, admin.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid email or password" });
  const token = jwt.sign({ id: admin._id, email: admin.email }, JWT_SECRET, { expiresIn: "8h" });
  res.json({ token });
});

/* ---------- Products (public read) ---------- */
router.get("/products", async (req, res) => {
  const products = await Product.find({ active: true }).sort({ createdAt: -1 });
  res.json(products);
});

/* ---------- Products (admin manage) ---------- */
router.post("/products", auth, async (req, res) => {
  const { name, price, oldPrice, cat, badge, img, desc, stock } = req.body || {};
  if (!name || price == null || !cat) return res.status(400).json({ error: "name, price and cat are required" });
  const p = await Product.create({ name, price, oldPrice: oldPrice || null, cat, badge: badge || "", img: img || "men", desc: desc || "", stock: stock ?? 100 });
  res.status(201).json(p);
});

router.put("/products/:id", auth, async (req, res) => {
  const p = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!p) return res.status(404).json({ error: "Product not found" });
  res.json(p);
});

router.delete("/products/:id", auth, async (req, res) => {
  const p = await Product.findByIdAndUpdate(req.params.id, { active: false }, { new: true });
  if (!p) return res.status(404).json({ error: "Product not found" });
  res.json({ ok: true });
});

/* ---------- Create order (public) ---------- */
router.post("/orders", async (req, res) => {
  try {
    const { customer, items, paymentMethod, paymentGateway } = req.body || {};
    if (!customer || !customer.name || !customer.phone || !customer.address || !customer.city) {
      return res.status(400).json({ error: "Name, phone, address and city are required" });
    }
    if (!Array.isArray(items) || !items.length) {
      return res.status(400).json({ error: "Order must contain at least one item" });
    }
    let total = 0;
    const orderItems = [];
    for (const it of items) {
      if (!mongoose.Types.ObjectId.isValid(it.productId)) {
        return res.status(400).json({ error: "Invalid product in order" });
      }
      const p = await Product.findById(it.productId);
      if (!p || !p.active) return res.status(400).json({ error: "A product in the order is not available" });
      const qty = Math.min(Math.max(parseInt(it.qty) || 1, 1), 10);
      total += p.price * qty;
      orderItems.push({ productId: p._id, name: p.name, price: p.price, qty, size: String(it.size || "M") });
    }
    const orderId = "YB-" + Date.now().toString().slice(-6) + Math.floor(100 + Math.random() * 900);
    const order = await Order.create({
      orderId,
      customer: { name: customer.name, phone: customer.phone, email: customer.email || "", address: customer.address, city: customer.city, country: customer.country || "", postalCode: customer.postalCode || "" },
      items: orderItems,
      total,
      payment: { method: paymentMethod === "gateway" ? "gateway" : paymentMethod === "bank" ? "bank" : "cod", gateway: paymentGateway || "" },
    });
    res.status(201).json({ orderId: order.orderId, total: order.total, status: order.status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not create order" });
  }
});

/* ---------- Track order (orderId + phone must match) ---------- */
router.get("/orders/:orderId", async (req, res) => {
  const { phone } = req.query;
  if (!phone) return res.status(400).json({ error: "Phone number is required to track an order" });
  const order = await Order.findOne({ orderId: req.params.orderId });
  if (!order || order.customer.phone !== phone) {
    return res.status(404).json({ error: "Order not found" });
  }
  res.json({
    orderId: order.orderId,
    status: order.status,
    items: order.items,
    total: order.total,
    customer: { name: order.customer.name, city: order.customer.city },
    payment: order.payment,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  });
});

/* ---------- Admin: list orders + update status ---------- */
router.get("/admin/orders", auth, async (req, res) => {
  const orders = await Order.find().sort({ createdAt: -1 }).limit(200);
  res.json(orders);
});

router.patch("/admin/orders/:orderId/status", auth, async (req, res) => {
  const { status } = req.body || {};
  const allowed = ["placed", "confirmed", "shipped", "delivered", "cancelled"];
  if (!allowed.includes(status)) return res.status(400).json({ error: "Invalid status" });
  const order = await Order.findOneAndUpdate({ orderId: req.params.orderId }, { status }, { new: true });
  if (!order) return res.status(404).json({ error: "Order not found" });
  res.json({ orderId: order.orderId, status: order.status });
});

/* ---------- Payments adapter (MOCK for now) ----------
   Phase 2: replace the body below with the chosen
   gateway's API call. For an international store the
   realistic options are 2Checkout (works with a
   Pakistan-registered business) or Stripe (needs a
   US/UK/EU company). The gateway returns a checkout
   URL; the customer pays there. Card details never
   touch our server. */
router.post("/payments/create", async (req, res) => {
  const { orderId } = req.body || {};
  const order = await Order.findOne({ orderId });
  if (!order) return res.status(404).json({ error: "Order not found" });
  res.json({
    gateway: process.env.PAYMENT_GATEWAY || "mock",
    orderId: order.orderId,
    amount: order.total,
    checkoutUrl: null,
    note: "Mock payment. Connect a real gateway in Phase 2.",
  });
});

module.exports = router;
