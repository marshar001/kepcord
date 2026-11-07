// Shared helpers and the page frame (menu bar, sign-in check). Loaded by every page after data.js.

// Names and text can come from users, so they are always escaped before going into the page.
const esc = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const naira = (n) => "₦" + Number(n || 0).toLocaleString("en-NG", { maximumFractionDigits: 2 });
const when = (iso) => new Date(iso).toLocaleString("en-NG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const timeOnly = (iso) => new Date(iso).toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit" });
const num = (n) => String(Math.round(Number(n) * 1000) / 1000);
// Dates are handled as local "YYYY-MM-DD" keys.
const dayKey = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};
const dmy = (key) => { const [y, m, d] = key.split("-"); return `${Number(d)}/${Number(m)}/${y}`; };
const longDate = (key) => new Date(key + "T12:00:00").toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" });
const shiftDay = (key, n) => { const d = new Date(key + "T12:00:00"); d.setDate(d.getDate() + n); return dayKey(d); };

// Quantities the way they are written in the stock book: 8½, 21½, ¼.
function qtyText(n) {
  n = Math.round(Number(n) * 1000) / 1000;
  const a = Math.abs(n), whole = Math.floor(a + 1e-9), f = Math.round((a - whole) * 1000) / 1000;
  const frac = { 0.25: "¼", 0.5: "½", 0.75: "¾" }[f];
  const t = f === 0 ? String(whole) : frac ? (whole ? String(whole) : "") + frac : String(a);
  return (n < 0 ? "−" : "") + t;
}

// Previous day / date box / next day, shared by the stock book and the inventory sheet.
function dateBarHTML(key) {
  const today = dayKey(new Date());
  return `<div class="datebar noprint">
    <button type="button" id="dPrev" aria-label="Previous day">‹</button>
    <input type="date" id="dPick" value="${key}" max="${today}" aria-label="Choose a day">
    <button type="button" id="dNext" aria-label="Next day" ${key >= today ? "disabled" : ""}>›</button>
    ${key !== today ? '<button type="button" id="dToday">Today</button>' : ""}
  </div>`;
}
function wireDateBar(root, key, onPick) {
  const today = dayKey(new Date());
  const go = (k) => { if (/^\d{4}-\d{2}-\d{2}$/.test(k) && k <= today) onPick(k); };
  root.querySelector("#dPrev").onclick = () => go(shiftDay(key, -1));
  root.querySelector("#dNext").onclick = () => go(shiftDay(key, 1));
  root.querySelector("#dPick").onchange = (e) => go(e.target.value);
  const t = root.querySelector("#dToday");
  if (t) t.onclick = () => go(today);
}

const UNITS = ["kg", "g", "L", "ml", "pcs", "packs", "bottles", "tins", "cups"];
const unitOptions = (sel) => UNITS.map((u) => `<option${u === sel ? " selected" : ""}>${u}</option>`).join("");

function toast(text, bad) {
  const t = document.createElement("div");
  t.className = "toast" + (bad ? " bad" : "");
  t.setAttribute("role", "status");
  t.textContent = text;
  document.querySelectorAll(".toast").forEach((x) => x.remove());
  document.body.appendChild(t);
  setTimeout(() => t.remove(), bad ? 5000 : 2600);
}

const ICONS = {
  dashboard: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
  orders: '<path d="M6 3.5h12A1.5 1.5 0 0 1 19.5 5v14a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 19V5A1.5 1.5 0 0 1 6 3.5Z"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  inventory: '<path d="M21 8 12 3 3 8v8l9 5 9-5V8Z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
  stock: '<path d="M5 3.5h12.5A1.5 1.5 0 0 1 19 5v15H6.5A1.5 1.5 0 0 1 5 18.5v-15Z"/><path d="M5 18.5A1.5 1.5 0 0 0 6.5 20H19M9 8h6M9 12h6"/>',
  menu: '<path d="M6 3v7a2 2 0 0 0 2 2v9M10 3v7M6 7h4"/><path d="M17 3c-2 1.5-3 4-3 7 0 1.5 1 2.5 3 2.5V21"/>',
  requisitions: '<path d="M9 5H6.5A1.5 1.5 0 0 0 5 6.5v13A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5v-13A1.5 1.5 0 0 0 17.5 5H15"/><rect x="9" y="3" width="6" height="4" rx="1.5"/><path d="m9 14 2 2 4-4"/>',
  employees: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.2a6.5 6.5 0 0 1 3.5 5.8"/>',
  activity: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>',
};
const icon = (name, size) =>
  `<svg width="${size || 22}" height="${size || 22}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ""}</svg>`;

const SCREENS = [
  { id: "dashboard", label: "Dashboard", mgmt: true },
  { id: "orders", label: "Orders" },
  { id: "stock", label: "Stock" },
  { id: "inventory", label: "Inventory", mgmt: true },
  { id: "menu", label: "Menu", mgmt: true },
  { id: "requisitions", label: "Requisitions" },
  { id: "employees", label: "Employees", mgmt: true },
  { id: "activity", label: "Activity", mgmt: true },
  { id: "settings", label: "Settings", mgmt: true },
];

// Every screen calls boot(). It sends signed-out people to the login page, keeps
// employees out of management screens, draws the top bar and sidebar, then runs the screen's code.
async function boot(opts, run) {
  try {
    const me = await api.auth.session();
    if (!me) return location.replace("index.html");
    const isM = me.role === "management";
    if (opts.mgmt && !isM) return location.replace("orders.html");
    const shop = (await api.shop.info()).name;
    const here = SCREENS.find((s) => s.id === opts.id);
    const links = SCREENS.filter((s) => !s.mgmt || isM)
      .map((s) => {
        const on = s.id === opts.id;
        return `<a href="${s.id}.html" class="${on ? "on" : ""}"${on ? ' aria-current="page"' : ""}>
          ${icon(s.id)}<span>${s.label}</span>
          <svg class="chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>
        </a>`;
      })
      .join("");

    document.getElementById("page").insertAdjacentHTML(
      "beforebegin",
      `<header class="topbar">
         <button class="burger" id="burger" aria-label="Open menu" aria-expanded="false" aria-controls="side">
           <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
         </button>
         <div class="toptitle">${esc(here ? here.label : "Kepcord")}</div>
       </header>
       <div class="backdrop" id="backdrop"></div>
       <aside id="side">
         <div class="sb-head">
           <div class="logo sm">K</div>
           <div><div class="brand">Kepcord</div><div class="sub2">${esc(shop)}</div></div>
           <button class="x" id="closeSide" aria-label="Close menu">
             <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
           </button>
         </div>
         <nav aria-label="Main">${links}</nav>
         <div class="sb-foot">
           <div class="who"><b>${esc(me.name)}</b><span>${isM ? "Management" : "Employee"}</span></div>
           <button class="out" id="signOut">Sign out</button>
         </div>
       </aside>`
    );

    const side = document.getElementById("side");
    const burger = document.getElementById("burger");
    const setOpen = (open) => {
      side.classList.toggle("open", open);
      document.body.classList.toggle("noscroll", open);
      burger.setAttribute("aria-expanded", String(open));
      if (open) side.querySelector("nav a").focus(); else if (document.activeElement && side.contains(document.activeElement)) burger.focus();
    };
    burger.onclick = () => setOpen(true);
    document.getElementById("closeSide").onclick = () => setOpen(false);
    document.getElementById("backdrop").onclick = () => setOpen(false);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") setOpen(false); });

    document.getElementById("signOut").onclick = async () => {
      await api.auth.signOut();
      location.href = "index.html";
    };
    await run(me, document.getElementById("page"));
  } catch (e) {
    toast(e.message, true);
  }
}
