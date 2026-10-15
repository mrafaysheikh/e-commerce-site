/* =====================================================
   NOTED2SELF. - database models (MongoDB / Mongoose)
   Collections: Product, Order, Admin
   Security notes:
   - Passwords are NEVER stored in plain text (bcrypt hash only).
   - Card details are NEVER stored anywhere. The payment
     gateway handles cards; we store only gateway txn id.
   ===================================================== */
const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  oldPrice: { type: Number, default: null },
  cat: { type: String, enum: ["men", "women", "accessories"], required: true },
  badge: { type: String, default: "" },
  img: { type: String, default: "men" },
  desc: { type: String, default: "" },
  stock: { type: Number, default: 100 },
  active: { type: Boolean, default: true },
}, { timestamps: true });

const orderItemSchema = new mongoose.Schema({
  productId: mongoose.Schema.Types.ObjectId,
  name: String,
  price: Number,
  qty: Number,
  size: String,
}, { _id: false });

const orderSchema = new mongoose.Schema({
  orderId: { type: String, unique: true, index: true },
  customer: {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, default: "" },
    address: { type: String, required: true },
    city: { type: String, required: true },
    country: { type: String, default: "" },
    postalCode: { type: String, default: "" },
  },
  items: [orderItemSchema],
  total: { type: Number, required: true },
  status: {
    type: String,
    enum: ["placed", "confirmed", "shipped", "delivered", "cancelled"],
    default: "placed",
  },
  payment: {
    method: { type: String, enum: ["cod", "bank", "gateway"], default: "cod" },
    gateway: { type: String, default: "" },
    txnId: { type: String, default: "" },
    status: { type: String, enum: ["pending", "paid", "failed", "refunded"], default: "pending" },
  },
}, { timestamps: true });

const adminSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  passwordHash: { type: String, required: true },
  role: { type: String, default: "admin" },
}, { timestamps: true });

module.exports = {
  Product: mongoose.model("Product", productSchema),
  Order: mongoose.model("Order", orderSchema),
  Admin: mongoose.model("Admin", adminSchema),
};
