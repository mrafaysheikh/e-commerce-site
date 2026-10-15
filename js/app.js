/* =====================================================
   NOTED2SELF. - store logic (original code)
   -----------------------------------------------------
   Products load from the backend API when it is running
   (GET /api/products). If the backend is off, the sample
   products below are shown instead.
   API base URL is stored in localStorage key "yb_api"
   (default http://localhost:5000, change on track.html
   or checkout.html).
   To customise: edit PRODUCTS, or manage products via
   the backend admin API.
   To show a product photo: add imgFile: "images/products/your-photo.jpg"
   to that product. Put the photo file in images/products/.
   ===================================================== */
const API_BASE = (localStorage.getItem("yb_api") || "http://localhost:5000").replace(/\/$/, "");

let PRODUCTS = [
  { id: 1, name: "Essential Cotton T-Shirt", price: 29, oldPrice: null, cat: "men",    badge: "NEW",  img: "men", desc: "Soft 100% cotton tee with a clean regular fit. Everyday essential." },
  { id: 2, name: "Classic Denim Jacket",    price: 89, oldPrice: null, cat: "men",    badge: "",     img: "men", desc: "Heavyweight denim jacket with button front. A timeless layer." },
  { id: 3, name: "Slim Fit Trousers",       price: 59, oldPrice: null, cat: "men",    badge: "",     img: "men", desc: "Stretch cotton trousers with a sharp slim fit. Office to evening." },
  { id: 4, name: "Oversized Hoodie",        price: 69, oldPrice: 89,   cat: "women", badge: "SALE", img: "women", desc: "Brushed fleece hoodie with a relaxed oversized fit. Our bestseller." },
  { id: 5, name: "Linen Shirt",             price: 49, oldPrice: null, cat: "women", badge: "NEW",  img: "women", desc: "Breathable linen shirt, perfect for summer days." },
  { id: 6, name: "Summer Dress",            price: 79, oldPrice: null, cat: "women", badge: "",     img: "women", desc: "Light flowy dress with a flattering cut. Easy summer staple." },
  { id: 7, name: "Leather Belt",            price: 25, oldPrice: null, cat: "accessories", badge: "", img: "acc", desc: "Genuine leather belt with a matte buckle. One size fits most." },
  { id: 8, name: "Canvas Sneakers",         price: 99, oldPrice: 129,  cat: "accessories", badge: "SALE", img: "acc", desc: "Lightweight canvas sneakers for all-day comfort." },
];

/* ---------------- State ---------------- */
let cart = JSON.parse(localStorage.getItem("yb_cart") || "[]");
let activeFilter = "all";
let modalProduct = null;
let modalQty = 1;
let modalSize = "S";

const grid = document.getElementById("productGrid");
const cartCount = document.getElementById("cartCount");
const cartHeadCount = document.getElementById("cartHeadCount");
const cartItemsEl = document.getElementById("cartItems");
const cartTotalEl = document.getElementById("cartTotal");

const money = n => "$" + Number(n).toLocaleString("en-US");
const productKey = p => String(p._id || p.id);

/* ---------------- Load products from backend (if running) ---------------- */
async function loadProducts() {
  try {
    const res = await fetch(`${API_BASE}/api/products`);
    if (!res.ok) return;
    const data = await res.json();
    if (Array.isArray(data) && data.length) {
      PRODUCTS = data;
      // Drop stale cart items that no longer exist in the catalogue.
      cart = cart.filter(i => PRODUCTS.some(p => productKey(p) === String(i.productId)));
      saveCart();
      renderProducts();
      renderCart();
    }
  } catch { /* backend off: keep sample products */ }
}

/* ---------------- Render products ---------------- */
function renderProducts() {
  const list = PRODUCTS.filter(p => {
    if (activeFilter === "all") return true;
    if (activeFilter === "sale") return p.badge === "SALE";
    return p.cat === activeFilter;
  });
  grid.innerHTML = list.map(p => {
    const idx = PRODUCTS.indexOf(p);
    return `
    <article class="product-card" data-index="${idx}">
      <div class="product-img ${p.imgFile ? "has-photo" : "p-" + p.img}">
        ${p.badge ? `<span class="product-badge ${p.badge === "NEW" ? "new" : ""}">${p.badge}</span>` : ""}
        ${p.imgFile ? `<img src="${p.imgFile}" alt="${p.name}">` : p.name}
      </div>
      <div class="product-info">
        <p class="product-cat">${p.cat}</p>
        <h3>${p.name}</h3>
        <p class="product-price">${money(p.price)} ${p.oldPrice ? `<s>${money(p.oldPrice)}</s>` : ""}</p>
        <button class="add-btn" data-add-index="${idx}">ADD TO CART</button>
      </div>
    </article>`;
  }).join("");
}

/* ---------------- Cart ---------------- */
function saveCart() { localStorage.setItem("yb_cart", JSON.stringify(cart)); }

function cartQtyTotal() { return cart.reduce((s, i) => s + i.qty, 0); }
function cartPriceTotal() { return cart.reduce((s, i) => s + i.qty * i.price, 0); }

function renderCart() {
  cartCount.textContent = cartQtyTotal();
  cartHeadCount.textContent = cartQtyTotal();
  cartTotalEl.textContent = money(cartPriceTotal());
  if (!cart.length) {
    cartItemsEl.innerHTML = `<p class="cart-empty">Your cart is empty.<br>Add something you like.</p>`;
    return;
  }
  cartItemsEl.innerHTML = cart.map(i => `
    <div class="cart-item">
      <div class="cart-item-img ${i.imgFile ? "has-photo" : "p-" + i.img}">${i.imgFile ? `<img src="${i.imgFile}" alt="${i.name}">` : i.name}</div>
      <div class="cart-item-info">
        <h4>${i.name}</h4>
        <p>Size: ${i.size} &nbsp;|&nbsp; ${money(i.price)}</p>
        <div class="cart-qty">
          <button data-dec="${i.productId}|${i.size}">-</button>
          <span>${i.qty}</span>
          <button data-inc="${i.productId}|${i.size}">+</button>
        </div>
        <button class="cart-remove" data-remove="${i.productId}|${i.size}">Remove</button>
      </div>
    </div>`).join("");
}

function addToCart(product, size = "M", qty = 1) {
  const key = productKey(product) + "|" + size;
  const found = cart.find(i => (String(i.productId) + "|" + i.size) === key);
  if (found) found.qty += qty;
  else cart.push({ productId: productKey(product), name: product.name, price: product.price, img: product.img, imgFile: product.imgFile || null, size, qty });
  saveCart(); renderCart(); openCart();
}

/* ---------------- Cart drawer ---------------- */
const drawer = document.getElementById("cartDrawer");
const overlay = document.getElementById("cartOverlay");
function openCart() { drawer.classList.add("open"); overlay.classList.add("show"); }
function closeCart() { drawer.classList.remove("open"); overlay.classList.remove("show"); }
document.getElementById("cartBtn").addEventListener("click", openCart);
document.getElementById("closeCart").addEventListener("click", closeCart);
document.getElementById("continueShopping").addEventListener("click", closeCart);
overlay.addEventListener("click", closeCart);

cartItemsEl.addEventListener("click", e => {
  const inc = e.target.dataset.inc, dec = e.target.dataset.dec, rem = e.target.dataset.remove;
  if (inc) { const it = cart.find(i => (String(i.productId) + "|" + i.size) === inc); if (it) it.qty++; }
  if (dec) { const it = cart.find(i => (String(i.productId) + "|" + i.size) === dec); if (it) { it.qty--; if (it.qty <= 0) cart = cart.filter(i => (String(i.productId) + "|" + i.size) !== dec); } }
  if (rem) { cart = cart.filter(i => (String(i.productId) + "|" + i.size) !== rem); }
  if (inc || dec || rem) { saveCart(); renderCart(); }
});

/* ---------------- Filters ---------------- */
document.getElementById("filters").addEventListener("click", e => {
  const btn = e.target.closest(".filter-btn"); if (!btn) return;
  document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  activeFilter = btn.dataset.filter;
  renderProducts();
});
document.querySelectorAll("[data-filter-link]").forEach(el => {
  el.addEventListener("click", () => {
    activeFilter = "sale";
    document.querySelectorAll(".filter-btn").forEach(b => b.classList.toggle("active", b.dataset.filter === "sale"));
    renderProducts();
  });
});
document.querySelectorAll(".collection-card").forEach(card => {
  card.addEventListener("click", () => {
    if (!card.dataset.filter) {
      activeFilter = "all";
      document.querySelectorAll(".filter-btn").forEach(b => b.classList.toggle("active", b.dataset.filter === "all"));
      renderProducts();
      return;
    }
    activeFilter = card.dataset.filter;
    document.querySelectorAll(".filter-btn").forEach(b => b.classList.toggle("active", b.dataset.filter === activeFilter));
    renderProducts();
  });
});

/* ---------------- Quick view ---------------- */
const modal = document.getElementById("quickModal");
const modalOverlay = document.getElementById("modalOverlay");
function openQuickView(index) {
  const p = PRODUCTS[index]; if (!p) return;
  modalProduct = p; modalQty = 1; modalSize = "S";
  document.getElementById("qtyVal").textContent = "1";
  document.querySelectorAll(".size-btn").forEach(b => b.classList.toggle("active", b.textContent === "S"));
  const mImg = document.getElementById("modalImg");
  if (p.imgFile) {
    mImg.className = "modal-img";
    mImg.style.backgroundImage = `url('${p.imgFile}')`;
    mImg.style.backgroundSize = "cover";
    mImg.style.backgroundPosition = "center";
    mImg.textContent = "";
  } else {
    mImg.style.backgroundImage = "";
    mImg.className = "modal-img p-" + p.img;
    mImg.textContent = p.name;
  }
  document.getElementById("modalBadge").textContent = p.badge ? p.badge + " | " + p.cat.toUpperCase() : p.cat.toUpperCase();
  document.getElementById("modalName").textContent = p.name;
  document.getElementById("modalPrice").innerHTML = `${money(p.price)} ${p.oldPrice ? `<s>${money(p.oldPrice)}</s>` : ""}`;
  document.getElementById("modalDesc").textContent = p.desc;
  modal.classList.add("show"); modalOverlay.classList.add("show");
}
function closeQuickView() { modal.classList.remove("show"); modalOverlay.classList.remove("show"); }

/* ---------------- Everyday Essentials (photo cards) ---------------- */
const ESSENTIALS = [
  { id: 101, name: "The Lido Short", price: 96, oldPrice: 120, cat: "women", badge: "SALE", img: "women", imgFile: "images/collections/collection-bottoms.jpg", desc: "Easy tailored shorts in soft linen. Relaxed fit, everyday staple." },
  { id: 102, name: "The Brisa Overshirt", price: 132, oldPrice: null, cat: "women", badge: "", img: "women", imgFile: "images/collections/collection-layers.jpg", desc: "Long open overshirt in olive linen. Light layer for any outfit." },
  { id: 103, name: "The Arden Co-ord", price: 214, oldPrice: null, cat: "women", badge: "", img: "women", imgFile: "images/collections/collection-tops.jpg", desc: "Matching linen shirt and wide-leg trousers. One easy set." },
  { id: 104, name: "The Noir Dress", price: 148, oldPrice: null, cat: "women", badge: "NEW", img: "women", imgFile: "images/collections/collection-dresses.jpg", desc: "Dark wrap dress with a waist tie. Day to dinner in one piece." },
];
function openQuickViewEssential(index) {
  const p = ESSENTIALS[index]; if (!p) return;
  modalProduct = p; modalQty = 1; modalSize = "S";
  document.getElementById("qtyVal").textContent = "1";
  document.querySelectorAll(".size-btn").forEach(b => b.classList.toggle("active", b.textContent === "S"));
  const mImg = document.getElementById("modalImg");
  mImg.className = "modal-img";
  mImg.style.backgroundImage = `url('${p.imgFile}')`;
  mImg.style.backgroundSize = "cover";
  mImg.style.backgroundPosition = "center";
  mImg.textContent = "";
  document.getElementById("modalBadge").textContent = p.badge ? p.badge + " | " + p.cat.toUpperCase() : p.cat.toUpperCase();
  document.getElementById("modalName").textContent = p.name;
  document.getElementById("modalPrice").innerHTML = `${money(p.price)} ${p.oldPrice ? `<s>${money(p.oldPrice)}</s>` : ""}`;
  document.getElementById("modalDesc").textContent = p.desc;
  modal.classList.add("show"); modalOverlay.classList.add("show");
}
document.querySelectorAll("[data-essential]").forEach(el =>
  el.addEventListener("click", () => openQuickViewEssential(Number(el.dataset.essential))));
document.getElementById("closeModal").addEventListener("click", closeQuickView);
modalOverlay.addEventListener("click", closeQuickView);

grid.addEventListener("click", e => {
  const add = e.target.dataset.addIndex;
  if (add !== undefined) { addToCart(PRODUCTS[Number(add)], "M", 1); return; }
  const card = e.target.closest(".product-card");
  if (card) openQuickView(Number(card.dataset.index));
});
document.querySelectorAll("[data-index]").forEach(el =>
  el.addEventListener("click", () => openQuickView(Number(el.dataset.index))));

document.querySelectorAll(".size-btn").forEach(b =>
  b.addEventListener("click", () => {
    document.querySelectorAll(".size-btn").forEach(x => x.classList.remove("active"));
    b.classList.add("active"); modalSize = b.textContent;
  }));
document.getElementById("qtyMinus").addEventListener("click", () => {
  if (modalQty > 1) { modalQty--; document.getElementById("qtyVal").textContent = modalQty; }
});
document.getElementById("qtyPlus").addEventListener("click", () => {
  modalQty++; document.getElementById("qtyVal").textContent = modalQty;
});
document.getElementById("modalAddBtn").addEventListener("click", () => {
  if (!modalProduct) return;
  addToCart(modalProduct, modalSize, modalQty);
  closeQuickView();
});

/* ---------------- Header: solid on scroll + mobile menu ---------------- */
const header = document.getElementById("header");
function onScroll() { header.classList.toggle("scrolled", window.scrollY > 30); }
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();
document.getElementById("menuBtn").addEventListener("click", () =>
  header.classList.toggle("menu-open"));
document.querySelectorAll(".nav-group a").forEach(a =>
  a.addEventListener("click", () => header.classList.remove("menu-open")));

/* ---------------- Search + newsletter ---------------- */
document.getElementById("searchBtn").addEventListener("click", () => {
  const q = prompt("Search products:");
  if (!q) return;
  const found = PRODUCTS.filter(p => p.name.toLowerCase().includes(q.toLowerCase()));
  activeFilter = "all";
  document.querySelectorAll(".filter-btn").forEach(b => b.classList.toggle("active", b.dataset.filter === "all"));
  if (!found.length) {
    grid.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:#666">No products found for "${q}".</p>`;
  } else {
    const keep = PRODUCTS;
    PRODUCTS = found;
    renderProducts();
    PRODUCTS = keep;
  }
  document.getElementById("shop").scrollIntoView({ behavior: "smooth" });
});
document.getElementById("newsletterForm").addEventListener("submit", e => {
  e.preventDefault();
  document.getElementById("newsletterMsg").textContent = "Thanks! Your 10% code will be sent to " + document.getElementById("newsletterEmail").value;
  e.target.reset();
});

/* ---------------- Init ---------------- */
renderProducts();
renderCart();
loadProducts();
