import { useState } from "react";
import { api } from "../data/api.js";
import { useLoad } from "../lib/useLoad.js";
import { toast } from "../lib/toast.jsx";
import { naira, num } from "../lib/format.js";
import { UNITS } from "../lib/units.js";

const blankLine = () => ({ name: "", qty: "", unit: "kg" });
const blank = () => ({ id: null, name: "", price: "", lines: [blankLine()] });

export default function Menu() {
  const [dishes, reloadDishes] = useLoad(() => api.dishes.list());
  const [ings, reloadIngs] = useLoad(() => api.ingredients.list());
  const [f, setF] = useState(blank());
  const [busy, setBusy] = useState(false);

  if (!dishes || !ings) return null;
  const existing = (name) => ings.find((i) => i.name.toLowerCase() === name.trim().toLowerCase());

  const setLine = (n, patch) => setF((x) => ({ ...x, lines: x.lines.map((l, k) => (k === n ? { ...l, ...patch } : l)) }));

  function edit(d) {
    setF({
      id: d.id, name: d.name, price: String(d.price),
      lines: d.recipe.map((r) => ({ name: r.name, qty: String(r.qty), unit: r.unit })),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    const payload = {
      name: f.name,
      price: f.price,
      recipe: f.lines.filter((l) => l.name.trim()).map((l) => ({ name: l.name, qty: l.qty, unit: existing(l.name)?.unit || l.unit })),
    };
    try {
      if (f.id) await api.dishes.update(f.id, payload);
      else await api.dishes.add(payload);
      toast(f.id ? "Dish updated" : "Dish added");
      setF(blank());
    } catch (err) {
      toast(err.message, true);
    }
    await Promise.all([reloadDishes(), reloadIngs()]);
    setBusy(false);
  }

  async function remove(d) {
    if (!window.confirm(`Delete ${d.name}? Past orders keep their record.`)) return;
    try { await api.dishes.remove(d.id); toast("Dish deleted"); } catch (e) { toast(e.message, true); }
    if (f.id === d.id) setF(blank());
    await reloadDishes();
  }

  return (
    <>
      <h1>Menu</h1>
      <p className="mu">List what goes into ONE plate. New ingredients are added to Inventory automatically (starting at zero stock).</p>

      <form className="panel" onSubmit={save}>
        <h2>{f.id ? "Edit dish" : "Add a dish"}</h2>
        <div className="row">
          <label>Dish name<input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></label>
          <label>Price (₦)<input type="number" inputMode="decimal" min="0" step="any" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} required /></label>
        </div>

        <datalist id="ing-names">{ings.map((i) => <option key={i.id} value={i.name} />)}</datalist>
        <p className="mu" style={{ marginBottom: 6 }}>Ingredients per plate</p>
        {f.lines.map((l, n) => {
          const ex = existing(l.name);
          return (
            <div className="ln" key={n}>
              <input list="ing-names" placeholder="Ingredient" aria-label="Ingredient" value={l.name} onChange={(e) => setLine(n, { name: e.target.value })} />
              <input type="number" inputMode="decimal" min="0" step="any" placeholder="Qty" aria-label="Quantity per plate" value={l.qty} onChange={(e) => setLine(n, { qty: e.target.value })} />
              <select aria-label="Unit" value={ex ? ex.unit : l.unit} disabled={!!ex} onChange={(e) => setLine(n, { unit: e.target.value })}>
                {UNITS.map((u) => <option key={u}>{u}</option>)}
              </select>
              <button type="button" className="lnk del" aria-label="Remove ingredient line" disabled={f.lines.length === 1} onClick={() => setF({ ...f, lines: f.lines.filter((_, k) => k !== n) })}>✕</button>
            </div>
          );
        })}
        <div className="row" style={{ marginTop: 12, marginBottom: 0 }}>
          <button type="button" onClick={() => setF({ ...f, lines: [...f.lines, blankLine()] })}>+ Ingredient</button>
          <button className="pri" disabled={busy}>{f.id ? "Save changes" : "Save dish"}</button>
          {f.id && <button type="button" onClick={() => setF(blank())}>Cancel</button>}
        </div>
      </form>

      <h2>Your dishes</h2>
      {dishes.length === 0 && <p className="mu">No dishes yet.</p>}
      {dishes.map((d) => (
        <div className="dishrow" key={d.id}>
          <div className="top"><b>{d.name}</b><span>{naira(d.price)}</span></div>
          <p className="mu" style={{ margin: "4px 0 8px" }}>{d.recipe.map((r) => `${r.name} ${num(r.qty)} ${r.unit}`).join(" · ")}</p>
          <button className="lnk" onClick={() => edit(d)}>Edit</button>
          <button className="lnk del" onClick={() => remove(d)}>Delete</button>
        </div>
      ))}
    </>
  );
}
