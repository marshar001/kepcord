// The stock table: one editable sheet per day, like a spreadsheet.
// Type opening stock, stock received (Added) or what was given free (Comp) straight into the cells.
// Sold comes from orders by itself. Total, Closing and the money columns are worked out automatically.
// opts.money = true shows prices, values, cost of goods used and profit (management only).
function stockGrid(me, root, opts) {
  const money = !!opts.money && me.role === "management";
  let key = dayKey(new Date()), sheet = null;
  const N = (v) => Number(v || 0).toLocaleString("en-NG", { maximumFractionDigits: 2 });
  const sumq = (f) => qtyText(sheet.rows.reduce((s, r) => s + r[f], 0));

  async function load(redraw) {
    try { sheet = await api.stock.sheet(key); } catch (e) { return toast(e.message, true); }
    redraw === false ? update() : draw();
  }

  const inp = (r, f, v, ed) => ed
    ? `<td class="in${f === "closing" && r.low ? " low" : ""}"><input type="number" inputmode="decimal" step="any" min="0" value="${num(v)}" data-id="${r.id}" data-f="${f}" aria-label="${f} of ${esc(r.name)}"></td>`
    : `<td class="cal${f === "closing" && r.low ? " low" : ""}" data-c="${f}" data-id="${r.id}">${qtyText(v)}</td>`;

  function draw() {
    const live = sheet.isToday, rows = sheet.rows;
    const colspan = money ? 14 : 7;
    const tabs = [["stock", "Stock"], ...(money || me.role === "management" ? [["inventory", "Inventory"]] : []), ["requisitions", "Requisitions"]];
    const profitChip = money ? `<div><b id="c-profit">${naira(sheet.totals.profit)}</b><span>profit</span></div>` : "";
    root.innerHTML = `
      <h1>${money ? "Inventory" : "Stock"}</h1>
      <p class="mu">${live ? "Type in the warm boxes. Sold fills in by itself when orders are recorded; the dark boxes are worked out for you." : "This is a past day. It cannot be changed."}</p>
      <div class="chips">
        <div><b>${rows.length}</b><span>items</span></div>
        <div><b id="c-sold">${sumq("sold")}</b><span>sold</span></div>
        <div><b id="c-closing">${sumq("closing")}</b><span>left</span></div>
        ${profitChip}
      </div>
      <section class="xl">
        <div class="xl-rib"><b>${money ? "Kitchen inventory" : "Stock"} · ${esc(longDate(key))}</b><span>${esc(me.name)}</span></div>
        <div class="xl-bar noprint">${dateBarHTML(key)}<button type="button" id="print">Print</button></div>
        <div class="fx"><i>fx</i><div id="fxt">Closing = Open + Added − Sold − Comp. Tap a cell to see its working.</div></div>
        <div class="sc"><table class="xt${money ? "" : " narrow"}">
          <thead><tr><th class="item">Item</th><th>Open stock</th><th>Added stock</th><th>Total stock</th><th>Sold</th><th>Comp</th><th>Closing stock</th>${money ? "<th>Unit price</th><th>Selling price</th><th>Open stock value</th><th>Cost of goods used</th><th>Closing stock value</th><th>Profit</th><th>Reorder at</th>" : ""}</tr></thead>
          <tbody>${rows.map((r) => rowHTML(r, live)).join("")}
            ${live ? `<tr class="newrow noprint"><td class="item"><input id="nName" placeholder="New item" maxlength="60" aria-label="New item name"><select id="nUnit" aria-label="Unit">${unitOptions("kg")}</select></td>
              <td><input id="nQty" type="number" inputmode="decimal" step="any" min="0" placeholder="Opening" aria-label="Opening stock"></td>
              <td colspan="${colspan - 2}"><button type="button" class="pri" id="nAdd">Add to table</button></td></tr>` : ""}
          </tbody>
          <tfoot><tr><td class="item">TOTAL</td>
            <td id="t-open">${sumq("open")}</td><td id="t-added">${sumq("added")}</td><td id="t-total">${sumq("total")}</td><td id="t-sold">${sumq("sold")}</td><td id="t-comp">${sumq("comp")}</td><td id="t-closing">${sumq("closing")}</td>
            ${money ? `<td></td><td></td><td id="t-openValue">${N(sheet.totals.openValue)}</td><td id="t-cogs">${N(sheet.totals.cogs)}</td><td id="t-closeValue">${N(sheet.totals.closeValue)}</td><td id="t-profit">${N(sheet.totals.profit)}</td><td></td>` : ""}</tr></tfoot>
        </table></div>
        ${rows.length === 0 ? '<p class="fine">Nothing in the table yet. Type an item name and its opening stock in the last row.</p>' : ""}
        ${money ? `<table class="sumbox">
          <tr><td>Opening stock</td><td id="s-open">${naira(sheet.totals.openValue)}</td></tr>
          <tr><td>Closing stock</td><td id="s-close">${naira(sheet.totals.closeValue)}</td></tr>
          <tr><td>Cost of goods used</td><td id="s-cogs">${naira(sheet.totals.cogs)}</td></tr>
          <tr><td>Profit</td><td id="s-profit">${naira(sheet.totals.profit)}</td></tr></table>` : ""}
        <p class="fine">Total stock = Open + Added. Closing = Total − Sold − Comp. To correct the closing figure after counting, type what you actually counted under Closing; any difference is recorded. ${money ? "Cost of goods used = (Sold + Comp) × Unit price. Profit = Sold × Selling price − Cost of goods used. Prices apply to every day." : ""}</p>
        <nav class="xl-tabs noprint" aria-label="Sheets">${tabs.map(([id, l]) => `<a href="${id}.html"${id === opts.id ? ' class="on" aria-current="page"' : ""}>${l}</a>`).join("")}</nav>
      </section>`;
    wireDateBar(root, key, (k) => { key = k; load(); });
  }

  function rowHTML(r, live) {
    return `<tr data-row="${r.id}">
      <td class="item">${esc(r.name)}<small>${esc(r.unit)}</small>${live && money ? ` <button type="button" class="rm noprint" data-rm="${r.id}" aria-label="Remove ${esc(r.name)}">×</button>` : ""}</td>
      ${inp(r, "open", r.open, live)}${inp(r, "added", r.added, live)}
      <td class="cal" data-c="total" data-id="${r.id}">${qtyText(r.total)}</td><td class="cal" data-c="sold" data-id="${r.id}">${qtyText(r.sold)}</td>
      ${inp(r, "comp", r.comp, live)}${inp(r, "closing", r.closing, live)}
      ${money ? `<td class="in"><input type="number" inputmode="decimal" step="any" min="0" value="${r.price}" data-id="${r.id}" data-f="price" aria-label="Unit price of ${esc(r.name)}"></td>
        <td class="in"><input type="number" inputmode="decimal" step="any" min="0" value="${r.sell}" data-id="${r.id}" data-f="sell" aria-label="Selling price of ${esc(r.name)}"></td>
        <td class="cal" data-c="openValue" data-id="${r.id}">${N(r.openValue)}</td><td class="cal" data-c="cogs" data-id="${r.id}">${N(r.cogs)}</td><td class="cal" data-c="closeValue" data-id="${r.id}">${N(r.closeValue)}</td><td class="cal" data-c="profit" data-id="${r.id}">${r.profit === null ? "—" : N(r.profit)}</td>
        <td class="${live ? "in" : "cal"}">${live ? `<input type="number" inputmode="decimal" step="any" min="0" value="${r.min}" data-id="${r.id}" data-f="min" aria-label="Reorder level of ${esc(r.name)}">` : qtyText(r.min)}</td>` : ""}</tr>`;
  }

  // After an edit, change only the cells whose numbers moved, so nothing the person is typing into is replaced.
  function update() {
    const active = document.activeElement;
    for (const r of sheet.rows) {
      const tr = root.querySelector(`tr[data-row="${r.id}"]`);
      if (!tr) return draw();
      const set = (f, v, text) => {
        const el = tr.querySelector(`[data-f="${f}"]`);
        if (el) { if (el !== active) el.value = num(v); }
        else { const c = tr.querySelector(`[data-c="${f}"]`); if (c) c.textContent = text ?? qtyText(v); }
      };
      ["open", "added", "comp", "closing"].forEach((f) => set(f, r[f]));
      set("total", r.total); set("sold", r.sold);
      if (money) {
        set("price", r.price); set("sell", r.sell); set("min", r.min);
        set("openValue", 0, N(r.openValue)); set("cogs", 0, N(r.cogs)); set("closeValue", 0, N(r.closeValue));
        set("profit", 0, r.profit === null ? "—" : N(r.profit));
      }
      tr.children[6].classList.toggle("low", !!r.low);
    }
    const put = (id, v) => { const e = root.querySelector("#" + id); if (e) e.textContent = v; };
    ["open", "added", "total", "sold", "comp", "closing"].forEach((f) => put("t-" + f, sumq(f)));
    put("c-sold", sumq("sold")); put("c-closing", sumq("closing"));
    if (money) {
      const t = sheet.totals;
      put("t-openValue", N(t.openValue)); put("t-cogs", N(t.cogs)); put("t-closeValue", N(t.closeValue)); put("t-profit", N(t.profit));
      put("c-profit", naira(t.profit));
      put("s-open", naira(t.openValue)); put("s-close", naira(t.closeValue)); put("s-cogs", naira(t.cogs)); put("s-profit", naira(t.profit));
    }
  }

  root.addEventListener("change", async (e) => {
    const t = e.target, id = t.dataset.id, f = t.dataset.f;
    if (!id || !f) return;
    const r = sheet.rows.find((x) => x.id === id), v = Number(t.value);
    const back = () => { t.value = num(r[f]); };
    try {
      if (t.value === "" || !(v >= 0)) { back(); throw new Error("Enter 0 or more."); }
      if (f === "open") await api.ingredients.setOpening(id, v);
      else if (f === "closing") await api.ingredients.adjust(id, { mode: "counted", qty: v });
      else if (f === "added" || f === "comp") {
        if (v === r[f]) return;
        if (v < r[f]) { back(); throw new Error(`${f === "added" ? "Added" : "Comp"} can only go up. If the amount in the kitchen is wrong, type the real count under Closing.`); }
        await api.ingredients.adjust(id, { mode: f === "added" ? "received" : "comp", qty: v - r[f] });
      }
      else if (f === "price" || f === "sell") {
        const tr = t.closest("tr");
        await api.ingredients.setPrices(id, { price: Number(tr.querySelector('[data-f="price"]').value), sell: Number(tr.querySelector('[data-f="sell"]').value) });
      }
      else if (f === "min") await api.ingredients.setMin(id, v);
      await load(false);
    } catch (err) { toast(err.message, true); load(false); }
  });

  root.addEventListener("click", async (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.id === "print") return window.print();
    if (b.id === "nAdd") {
      const name = root.querySelector("#nName").value, q = root.querySelector("#nQty").value;
      try {
        await api.ingredients.add({ name, unit: root.querySelector("#nUnit").value, qty: q === "" ? 0 : q });
        toast("Added to the table");
        await load();
        const n = root.querySelector("#nName"); if (n) n.focus();
      } catch (err) { toast(err.message, true); }
    }
    if (b.dataset.rm) {
      const r = sheet.rows.find((x) => x.id === b.dataset.rm);
      if (!window.confirm(`Remove ${r.name} from the table?`)) return;
      try { await api.ingredients.remove(r.id); toast("Removed"); } catch (err) { toast(err.message, true); }
      load();
    }
  });
  // The formula bar explains how the selected cell is worked out.
  const LBL = { open: "Open", added: "Added", total: "Total", sold: "Sold", comp: "Comp", closing: "Closing", price: "Unit price", sell: "Selling price", openValue: "Open value", cogs: "Cost of goods used", closeValue: "Closing value", profit: "Profit", min: "Reorder at" };
  function explain(id, f) {
    const r = sheet.rows.find((x) => x.id === id);
    if (!r) return;
    const q = qtyText;
    const E = {
      open: `${r.name} · Open = what was in the kitchen at the start (${q(r.open)} ${r.unit}). Type to correct it.`,
      added: `${r.name} · Added = stock received today = ${q(r.added)} ${r.unit}. Type a bigger number to add more.`,
      total: `${r.name} · Total = Open + Added = ${q(r.open)} + ${q(r.added)} = ${q(r.total)}`,
      sold: `${r.name} · Sold comes from recorded orders = ${q(r.sold)} ${r.unit}`,
      comp: `${r.name} · Comp = given free today = ${q(r.comp)} ${r.unit}`,
      closing: `${r.name} · Closing = Total − Sold − Comp = ${q(r.total)} − ${q(r.sold)} − ${q(r.comp)} = ${q(r.closing)} ${r.unit}. Type a count to correct it.`,
    };
    if (money) Object.assign(E, {
      price: `${r.name} · Unit price = what one ${r.unit} costs you`,
      sell: `${r.name} · Selling price = what one ${r.unit} sells for`,
      openValue: `${r.name} · Open value = Open × Unit price = ${q(r.open)} × ${N(r.price)} = ${N(r.openValue)}`,
      cogs: `${r.name} · Cost of goods used = (Sold + Comp) × Unit price = (${q(r.sold)} + ${q(r.comp)}) × ${N(r.price)} = ${N(r.cogs)}`,
      closeValue: `${r.name} · Closing value = Closing × Unit price = ${q(r.closing)} × ${N(r.price)} = ${N(r.closeValue)}`,
      profit: `${r.name} · Profit = Sold × Selling price − Cost of goods used = ${q(r.sold)} × ${N(r.sell)} − ${N(r.cogs)} = ${r.profit === null ? "—" : N(r.profit)}`,
      min: `${r.name} · Reorder at = when closing stock is at or below this, a requisition line is added`,
    });
    const fx = root.querySelector("#fxt");
    if (fx && E[f]) fx.textContent = E[f];
    root.querySelectorAll("td.sel").forEach((x) => x.classList.remove("sel"));
    const tr = root.querySelector(`tr[data-row="${id}"]`);
    const el = tr && (tr.querySelector(`[data-f="${f}"]`) || tr.querySelector(`[data-c="${f}"]`));
    if (el) (el.closest("td")).classList.add("sel");
  }
  root.addEventListener("focusin", (e) => { if (e.target.dataset.f) explain(e.target.dataset.id, e.target.dataset.f); });
  root.addEventListener("click", (e) => { const td = e.target.closest("td[data-c]"); if (td) explain(td.dataset.id, td.dataset.c); });
  root.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.matches("input[data-f]")) e.target.blur();
    if (e.key === "Enter" && e.target.id === "nName" || e.key === "Enter" && e.target.id === "nQty") root.querySelector("#nAdd").click();
  });
  return load();
}
