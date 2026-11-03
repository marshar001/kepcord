// Shared helpers and the page frame (menu bar, sign-in check). Loaded by every page after data.js.

// Names and text can come from users, so they are always escaped before going into the page.
const esc = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const naira = (n) => "₦" + Number(n || 0).toLocaleString("en-NG", { maximumFractionDigits: 2 });
const when = (iso) => new Date(iso).toLocaleString("en-NG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const timeOnly = (iso) => new Date(iso).toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit" });
const num = (n) => String(Math.round(Number(n) * 1000) / 1000);
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

const SCREENS = [
  { id: "dashboard", label: "Dashboard", mgmt: true },
  { id: "orders", label: "Orders" },
  { id: "inventory", label: "Inventory" },
  { id: "menu", label: "Menu", mgmt: true },
  { id: "requisitions", label: "Requisitions" },
  { id: "employees", label: "Employees", mgmt: true },
  { id: "activity", label: "Activity", mgmt: true },
  { id: "settings", label: "Settings", mgmt: true },
];

// Every screen calls boot(). It sends signed-out people to the login page, keeps
// employees out of management screens, draws the menu bar, then runs the screen's code.
async function boot(opts, run) {
  try {
    const me = await api.auth.session();
    if (!me) return location.replace("index.html");
    const isM = me.role === "management";
    if (opts.mgmt && !isM) return location.replace("orders.html");
    const shop = (await api.shop.info()).name;
    const links = SCREENS.filter((s) => !s.mgmt || isM)
      .map((s) => `<a href="${s.id}.html" class="${s.id === opts.id ? "on" : ""}"${s.id === opts.id ? ' aria-current="page"' : ""}>${s.label}</a>`)
      .join("");
    document.getElementById("page").insertAdjacentHTML(
      "beforebegin",
      `<aside>
        <div class="brand">Kepcord</div>
        <div class="who">${esc(shop)} · ${esc(me.name)} (${isM ? "Management" : "Employee"})</div>
        <button class="out" id="signOut">Sign out</button>
        <nav aria-label="Main">${links}</nav>
      </aside>`
    );
    document.getElementById("signOut").onclick = async () => {
      await api.auth.signOut();
      location.href = "index.html";
    };
    await run(me, document.getElementById("page"));
  } catch (e) {
    toast(e.message, true);
  }
}
