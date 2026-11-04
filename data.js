// Kepcord data layer: stores everything in this browser (localStorage).
// Every rule (roles, stock checks, voiding, requisitions) lives here.
const api = (() => {

const KEY = "kepcord_db_v1";
const SKEY = "kepcord_session";

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const now = () => new Date().toISOString();
const r3 = (n) => Math.round(n * 1000) / 1000;
const show = (n) => String(r3(n));
const dayKey = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};

const empty = () => ({
  shop: null, users: [], ingredients: [], dishes: [],
  orders: [], moves: [], reqs: [], log: [],
});

function load() {
  try {
    return { ...empty(), ...JSON.parse(localStorage.getItem(KEY) || "{}") };
  } catch {
    return empty();
  }
}
const save = (db) => localStorage.setItem(KEY, JSON.stringify(db));

async function hash(s) {
  const text = "kepcord:" + s;
  if (globalThis.crypto?.subtle) {
    const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
  }
  let h = 5381; // fallback when the page is opened over plain http on a network address
  for (const c of text) h = ((h << 5) + h + c.charCodeAt(0)) | 0;
  return "x" + h;
}

const getSid = () => sessionStorage.getItem(SKEY) || localStorage.getItem(SKEY);
const pub = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role });

function me(db) {
  const u = db.users.find((x) => x.id === getSid());
  if (!u) throw new Error("Please sign in again.");
  return u;
}
function mgmt(db) {
  const u = me(db);
  if (u.role !== "management") throw new Error("Only management can do that.");
  return u;
}
function addLog(db, u, text) {
  db.log.push({ id: uid(), at: now(), byName: u.name, text });
}

// Runs fn on fresh data; saves only on success; always returns a promise.
const tx = (fn) => (...args) => {
  try {
    const db = load();
    const out = fn(db, ...args);
    save(db);
    return Promise.resolve(out);
  } catch (e) {
    return Promise.reject(e);
  }
};
const read = (fn) => (...args) => {
  try {
    return Promise.resolve(fn(load(), ...args));
  } catch (e) {
    return Promise.reject(e);
  }
};

function findIng(db, id) {
  const i = db.ingredients.find((x) => x.id === id);
  if (!i) throw new Error("That ingredient no longer exists.");
  return i;
}
function ensureIngredient(db, name, unit) {
  const n = String(name).trim();
  const ex = db.ingredients.find((i) => i.name.toLowerCase() === n.toLowerCase());
  if (ex) return ex;
  const i = { id: uid(), name: n, unit: unit || "pcs", qty: 0, min: 0 };
  db.ingredients.push(i);
  return i;
}
function isLow(i) {
  return i.qty <= 0 || (i.min > 0 && i.qty <= i.min);
}
function checkReorder(db, ing) {
  if (!isLow(ing)) return;
  if (db.reqs.some((r) => r.ingredientId === ing.id && r.status === "open")) return;
  db.reqs.push({
    id: uid(), ingredientId: ing.id, name: ing.name, unit: ing.unit,
    qty: r3(Math.max(ing.min * 2 - ing.qty, 1)),
    reason: ing.qty <= 0 ? "Ran out" : "Reached reorder level",
    status: "open", at: now(),
  });
}
function hydrateDish(db, d) {
  return {
    id: d.id, name: d.name, price: d.price,
    recipe: d.recipe.map((r) => {
      const i = db.ingredients.find((x) => x.id === r.ingredientId);
      return { ingredientId: r.ingredientId, name: i ? i.name : "(removed)", unit: i ? i.unit : "", qty: r.qty };
    }),
  };
}
function buildRecipe(db, input) {
  const merged = new Map();
  for (const l of input || []) {
    const name = String(l.name || "").trim();
    if (!name) continue;
    const q = Number(l.qty);
    if (!(q > 0)) throw new Error(`Enter how much ${name} goes in one plate.`);
    const ing = ensureIngredient(db, name, l.unit);
    merged.set(ing.id, r3((merged.get(ing.id) || 0) + q));
  }
  if (!merged.size) throw new Error("Add at least one ingredient to the dish.");
  return [...merged].map(([ingredientId, qty]) => ({ ingredientId, qty }));
}
function checkDish(db, p, selfId) {
  const name = String(p.name || "").trim();
  if (!name) throw new Error("Give the dish a name.");
  const price = Number(p.price);
  if (!(price >= 0) || p.price === "" || p.price == null) throw new Error("Enter the price in naira.");
  if (db.dishes.some((d) => d.id !== selfId && d.name.toLowerCase() === name.toLowerCase()))
    throw new Error(`There is already a dish called ${name}.`);
  return { name, price, recipe: buildRecipe(db, p.recipe) };
}
function checkPassword(pw) {
  if (String(pw || "").length < 8) throw new Error("Password must be at least 8 characters.");
}
function checkEmail(db, email, selfId) {
  const e = String(email || "").trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(e)) throw new Error("Enter a valid email address.");
  if (db.users.some((u) => u.id !== selfId && u.email === e)) throw new Error("That email is already in use.");
  return e;
}
function startSession(id, remember) {
  sessionStorage.removeItem(SKEY);
  localStorage.removeItem(SKEY);
  (remember ? localStorage : sessionStorage).setItem(SKEY, id);
}

const api = {
  auth: {
    status: read((db) => ({ setup: !!db.shop })),
    session: read((db) => {
      const u = db.users.find((x) => x.id === getSid());
      return u ? pub(u) : null;
    }),
    async setup({ shop, name, email, password, remember }) {
      const db = load();
      if (db.shop) throw new Error("This business is already set up. Please log in.");
      if (!String(shop || "").trim()) throw new Error("Enter your business name.");
      if (!String(name || "").trim()) throw new Error("Enter your full name.");
      const e = checkEmail(db, email);
      checkPassword(password);
      const u = { id: uid(), name: name.trim(), email: e, role: "management", pass: await hash(password) };
      db.shop = { name: shop.trim() };
      db.users.push(u);
      addLog(db, u, "Set up the business");
      save(db);
      startSession(u.id, remember);
      return pub(u);
    },
    async signIn({ email, password, remember }) {
      const db = load();
      const e = String(email || "").trim().toLowerCase();
      const u = db.users.find((x) => x.email === e);
      if (!u || u.pass !== (await hash(password || ""))) throw new Error("Wrong email or password.");
      startSession(u.id, remember);
      return pub(u);
    },
    signOut() {
      sessionStorage.removeItem(SKEY);
      localStorage.removeItem(SKEY);
      return Promise.resolve();
    },
    async changePassword({ oldPassword, newPassword }) {
      const db = load();
      const u = me(db);
      if (u.pass !== (await hash(oldPassword || ""))) throw new Error("Your current password is wrong.");
      checkPassword(newPassword);
      u.pass = await hash(newPassword);
      addLog(db, u, "Changed own password");
      save(db);
    },
  },

  shop: { info: read((db) => ({ name: db.shop ? db.shop.name : "" })) },

  employees: {
    list: read((db) => { mgmt(db); return db.users.map(pub); }),
    async add({ name, email, password }) {
      const db = load();
      const m = mgmt(db);
      if (!String(name || "").trim()) throw new Error("Enter the employee's name.");
      const e = checkEmail(db, email);
      checkPassword(password);
      db.users.push({ id: uid(), name: name.trim(), email: e, role: "employee", pass: await hash(password) });
      addLog(db, m, `Added employee ${name.trim()}`);
      save(db);
    },
    async resetPassword(id, password) {
      const db = load();
      const m = mgmt(db);
      const u = db.users.find((x) => x.id === id);
      if (!u) throw new Error("Employee not found.");
      checkPassword(password);
      u.pass = await hash(password);
      addLog(db, m, `Reset password for ${u.name}`);
      save(db);
    },
    remove: tx((db, id) => {
      const m = mgmt(db);
      const u = db.users.find((x) => x.id === id);
      if (!u) throw new Error("Employee not found.");
      if (u.role === "management") throw new Error("You can't remove a management account.");
      db.users = db.users.filter((x) => x.id !== id);
      addLog(db, m, `Removed employee ${u.name}`);
    }),
  },

  ingredients: {
    list: read((db) => {
      me(db);
      return [...db.ingredients]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((i) => ({ ...i, low: isLow(i) }));
    }),
    add: tx((db, { name, unit, qty, min }) => {
      const m = mgmt(db);
      const n = String(name || "").trim();
      if (!n) throw new Error("Enter the ingredient name.");
      if (db.ingredients.some((i) => i.name.toLowerCase() === n.toLowerCase()))
        throw new Error(`${n} is already in inventory.`);
      const q = Number(qty || 0), mn = Number(min || 0);
      if (q < 0 || mn < 0) throw new Error("Amounts can't be negative.");
      const i = { id: uid(), name: n, unit: unit || "pcs", qty: q, min: mn };
      db.ingredients.push(i);
      addLog(db, m, `Added ingredient ${n}`);
      checkReorder(db, i);
    }),
    // mode "received": add to stock. mode "counted": set stock to what was counted.
    adjust: tx((db, id, { mode, qty }) => {
      const u = me(db);
      const i = findIng(db, id);
      const q = Number(qty);
      if (!Number.isFinite(q) || String(qty) === "") throw new Error("Enter an amount.");
      let delta;
      if (mode === "received") {
        if (!(q > 0)) throw new Error("Received amount must be more than zero.");
        delta = q;
      } else if (mode === "counted") {
        if (q < 0) throw new Error("A count can't be negative.");
        delta = r3(q - i.qty);
      } else throw new Error("Unknown stock action.");
      i.qty = r3(i.qty + delta);
      const reason = mode === "received" ? "Received" : "Counted";
      db.moves.push({ id: uid(), at: now(), ingredientId: i.id, name: i.name, delta, reason, byName: u.name });
      addLog(db, u, mode === "received"
        ? `Received ${show(q)} ${i.unit} of ${i.name}`
        : `Counted ${i.name}: ${show(q)} ${i.unit} (was ${show(i.qty - delta)})`);
      checkReorder(db, i);
    }),
    setMin: tx((db, id, min) => {
      const m = mgmt(db);
      const i = findIng(db, id);
      const v = Number(min);
      if (!(v >= 0)) throw new Error("Reorder level can't be negative.");
      i.min = v;
      addLog(db, m, `Set reorder level of ${i.name} to ${show(v)} ${i.unit}`);
      checkReorder(db, i);
    }),
    remove: tx((db, id) => {
      const m = mgmt(db);
      const i = findIng(db, id);
      const used = db.dishes.find((d) => d.recipe.some((r) => r.ingredientId === id));
      if (used) throw new Error(`${i.name} is used by ${used.name}. Edit or delete that dish first.`);
      db.ingredients = db.ingredients.filter((x) => x.id !== id);
      db.reqs.forEach((r) => { if (r.ingredientId === id && r.status === "open") { r.status = "dismissed"; r.closedAt = now(); } });
      addLog(db, m, `Removed ingredient ${i.name}`);
    }),
  },

  dishes: {
    list: read((db) => { me(db); return db.dishes.map((d) => hydrateDish(db, d)).sort((a, b) => a.name.localeCompare(b.name)); }),
    add: tx((db, p) => {
      const m = mgmt(db);
      const d = { id: uid(), ...checkDish(db, p) };
      db.dishes.push(d);
      addLog(db, m, `Added dish ${d.name}`);
    }),
    update: tx((db, id, p) => {
      const m = mgmt(db);
      const d = db.dishes.find((x) => x.id === id);
      if (!d) throw new Error("Dish not found.");
      Object.assign(d, checkDish(db, p, id));
      addLog(db, m, `Edited dish ${d.name}`);
    }),
    remove: tx((db, id) => {
      const m = mgmt(db);
      const d = db.dishes.find((x) => x.id === id);
      if (!d) throw new Error("Dish not found.");
      db.dishes = db.dishes.filter((x) => x.id !== id);
      addLog(db, m, `Deleted dish ${d.name}`);
    }),
  },

  orders: {
    place: tx((db, lines) => {
      const u = me(db);
      if (!lines || !lines.length) throw new Error("Add at least one dish.");
      const need = {};
      const items = [];
      let total = 0;
      for (const l of lines) {
        const d = db.dishes.find((x) => x.id === l.dishId);
        if (!d) throw new Error("A dish on this order no longer exists.");
        const q = Math.floor(Number(l.qty));
        if (!(q > 0)) throw new Error("Quantities must be at least 1.");
        items.push({ dishId: d.id, name: d.name, qty: q, price: d.price });
        total += q * d.price;
        for (const r of d.recipe) need[r.ingredientId] = (need[r.ingredientId] || 0) + r.qty * q;
      }
      for (const [id, n] of Object.entries(need)) {
        const i = db.ingredients.find((x) => x.id === id);
        if (!i) throw new Error("An ingredient for this order was removed.");
        if (i.qty < n - 1e-9)
          throw new Error(`Not enough ${i.name}: need ${show(n)} ${i.unit}, only ${show(i.qty)} left.`);
      }
      const at = now();
      const order = {
        id: uid(), at, by: u.id, byName: u.name, lines: items, total, voided: false,
        usage: Object.entries(need).map(([ingredientId, qty]) => ({ ingredientId, qty: r3(qty) })),
      };
      for (const [id, n] of Object.entries(need)) {
        const i = findIng(db, id);
        i.qty = r3(i.qty - n);
        db.moves.push({ id: uid(), at, ingredientId: id, name: i.name, delta: -r3(n), reason: "Order", byName: u.name, ref: order.id });
        checkReorder(db, i);
      }
      db.orders.push(order);
      addLog(db, u, `Recorded order: ${items.map((x) => `${x.qty} × ${x.name}`).join(", ")} (₦${total.toLocaleString("en-NG")})`);
      return order;
    }),
    void: tx((db, id) => {
      const m = mgmt(db);
      const o = db.orders.find((x) => x.id === id);
      if (!o) throw new Error("Order not found.");
      if (o.voided) throw new Error("This order is already voided.");
      const at = now();
      for (const u of o.usage || []) {
        const i = db.ingredients.find((x) => x.id === u.ingredientId);
        if (!i) continue;
        i.qty = r3(i.qty + u.qty);
        db.moves.push({ id: uid(), at, ingredientId: i.id, name: i.name, delta: u.qty, reason: "Order voided", byName: m.name, ref: o.id });
      }
      o.voided = true; o.voidedBy = m.name; o.voidedAt = at;
      addLog(db, m, `Voided order of ₦${o.total.toLocaleString("en-NG")} by ${o.byName}`);
    }),
    today: read((db) => {
      me(db);
      const t = dayKey(new Date());
      return db.orders.filter((o) => dayKey(o.at) === t).sort((a, b) => b.at.localeCompare(a.at));
    }),
    day: read((db, key) => {
      mgmt(db);
      return db.orders.filter((o) => dayKey(o.at) === key).sort((a, b) => b.at.localeCompare(a.at));
    }),
    recent: read((db, limit = 10) => {
      mgmt(db);
      return [...db.orders].sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
    }),
  },

  requisitions: {
    open: read((db) => { me(db); return db.reqs.filter((r) => r.status === "open").sort((a, b) => b.at.localeCompare(a.at)); }),
    closed: read((db) => {
      me(db);
      return db.reqs.filter((r) => r.status !== "open")
        .sort((a, b) => (b.closedAt || "").localeCompare(a.closedAt || "")).slice(0, 30);
    }),
    receive: tx((db, id, qty) => {
      const u = me(db);
      const r = db.reqs.find((x) => x.id === id);
      if (!r || r.status !== "open") throw new Error("This requisition is already closed.");
      const q = qty == null || qty === "" ? r.qty : Number(qty);
      if (!(q > 0)) throw new Error("Received amount must be more than zero.");
      const i = db.ingredients.find((x) => x.id === r.ingredientId);
      if (i) {
        i.qty = r3(i.qty + q);
        db.moves.push({ id: uid(), at: now(), ingredientId: i.id, name: i.name, delta: q, reason: "Requisition received", byName: u.name, ref: r.id });
      }
      r.status = "received"; r.receivedQty = q; r.closedAt = now(); r.closedBy = u.name;
      addLog(db, u, `Marked requisition received: ${show(q)} ${r.unit} of ${r.name}`);
    }),
    dismiss: tx((db, id) => {
      const m = mgmt(db);
      const r = db.reqs.find((x) => x.id === id);
      if (!r || r.status !== "open") throw new Error("This requisition is already closed.");
      r.status = "dismissed"; r.closedAt = now(); r.closedBy = m.name;
      addLog(db, m, `Dismissed requisition for ${r.name}`);
    }),
  },

  activity: {
    list: read((db, limit = 150) => { mgmt(db); return [...db.log].reverse().slice(0, limit); }),
  },

  reports: {
    summary: read((db) => {
      mgmt(db);
      const live = db.orders.filter((o) => !o.voided);
      const t = dayKey(new Date());
      const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - 6);
      const monthStart = new Date(); monthStart.setDate(monthStart.getDate() - 29);
      const wk = dayKey(weekStart), mo = dayKey(monthStart);
      const today = live.filter((o) => dayKey(o.at) === t);
      const yd = new Date(); yd.setDate(yd.getDate() - 1);
      const yesterday = live.filter((o) => dayKey(o.at) === dayKey(yd));
      const top = {};
      live.filter((o) => dayKey(o.at) >= mo).forEach((o) => o.lines.forEach((l) => { top[l.name] = (top[l.name] || 0) + l.qty; }));
      return {
        todaySales: today.reduce((s, o) => s + o.total, 0),
        todayOrders: today.length,
        yesterdaySales: yesterday.reduce((s, o) => s + o.total, 0),
        weekSales: live.filter((o) => dayKey(o.at) >= wk).reduce((s, o) => s + o.total, 0),
        lowCount: db.ingredients.filter(isLow).length,
        openReqs: db.reqs.filter((r) => r.status === "open").length,
        top: Object.entries(top).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, qty]) => ({ name, qty })),
      };
    }),
    // Sales per hour (0-23) for one day, voided orders left out.
    hours: read((db, key) => {
      mgmt(db);
      const out = Array.from({ length: 24 }, (_, hour) => ({ hour, value: 0, count: 0 }));
      db.orders.filter((o) => !o.voided && dayKey(o.at) === key).forEach((o) => {
        const h = new Date(o.at).getHours();
        out[h].value += o.total; out[h].count += 1;
      });
      return out;
    }),
    salesByDay: read((db, days = 7) => {
      mgmt(db);
      const out = [];
      for (let k = days - 1; k >= 0; k--) {
        const d = new Date(); d.setDate(d.getDate() - k);
        out.push({
          date: dayKey(d),
          label: d.toLocaleDateString("en-NG", { day: "numeric", month: "short" }),
          value: 0,
        });
      }
      const idx = Object.fromEntries(out.map((o, n) => [o.date, n]));
      db.orders.filter((o) => !o.voided).forEach((o) => {
        const n = idx[dayKey(o.at)];
        if (n != null) out[n].value += o.total;
      });
      return out;
    }),
  },

  // Wipes orders, stock, menu, requisitions and the log. Keeps the business and its accounts.
  admin: {
    eraseAll: tx((db) => {
      const m = mgmt(db);
      db.ingredients = []; db.dishes = []; db.orders = []; db.moves = []; db.reqs = []; db.log = [];
      addLog(db, m, "Erased all business data");
    }),
  },
};

return api;
})();
