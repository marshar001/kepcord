import { useState } from "react";
import { api } from "../data/api.js";
import { useMe } from "../context.js";
import { useLoad } from "../lib/useLoad.js";
import { toast } from "../lib/toast.jsx";
import { num } from "../lib/format.js";
import { UNITS } from "../lib/units.js";

export default function Inventory() {
  const me = useMe();
  const isM = me.role === "management";
  const [list, reload] = useLoad(() => api.ingredients.list());
  const [sel, setSel] = useState("");
  const [amt, setAmt] = useState("");
  const [nw, setNw] = useState({ name: "", unit: "kg", qty: "", min: "" });

  if (!list) return null;
  const chosen = list.find((i) => i.id === sel);

  async function run(fn, ok) {
    let good = true;
    try {
      await fn();
      if (ok) toast(ok);
    } catch (e) {
      good = false;
      toast(e.message, true);
    }
    await reload();
    return good;
  }
  async function update(mode) {
    if (!sel) return toast("Choose an ingredient first.", true);
    if (await run(() => api.ingredients.adjust(sel, { mode, qty: amt }), mode === "received" ? "Stock added" : "Count saved")) setAmt("");
  }

  return (
    <>
      <h1>Inventory</h1>
      <p className="mu">Stock goes down by itself when orders are recorded. Use the form below when stock arrives or after a count.</p>

      <div className="panel">
        <h2>Update stock</h2>
        <div className="row">
          <label>Ingredient
            <select value={sel} onChange={(e) => setSel(e.target.value)}>
              <option value="">Choose…</option>
              {list.map((i) => <option key={i.id} value={i.id}>{i.name} ({num(i.qty)} {i.unit})</option>)}
            </select>
          </label>
          <label>Amount {chosen ? `(${chosen.unit})` : ""}
            <input type="number" inputMode="decimal" min="0" step="any" value={amt} onChange={(e) => setAmt(e.target.value)} />
          </label>
        </div>
        <div className="row" style={{ marginBottom: 0 }}>
          <button className="pri" onClick={() => update("received")}>Received (add to stock)</button>
          <button onClick={() => update("counted")}>Counted (set stock to this)</button>
        </div>
      </div>

      {list.length === 0 ? (
        <p className="mu">No ingredients yet. They appear here automatically when you add dishes on the Menu screen.</p>
      ) : (
        <div className="sc">
          <table>
            <thead><tr><th>Ingredient</th><th>In stock</th><th>Reorder at</th>{isM && <th />}</tr></thead>
            <tbody>
              {list.map((i) => {
                const pct = i.min > 0 ? Math.min(100, (i.qty / (i.min * 3)) * 100) : i.qty > 0 ? 100 : 0;
                return (
                  <tr key={i.id}>
                    <td>{i.name}{i.qty <= 0 ? <span className="tag">OUT</span> : i.low ? <span className="tag">LOW</span> : null}</td>
                    <td>
                      {num(i.qty)} {i.unit}
                      <div className={"bar" + (i.low ? " lo" : "")}><i style={{ width: pct + "%" }} /></div>
                    </td>
                    <td>
                      {isM ? (
                        <input
                          type="number" inputMode="decimal" min="0" step="any"
                          key={i.id + "-" + i.min}
                          defaultValue={i.min}
                          aria-label={`Reorder level for ${i.name}`}
                          onBlur={(e) => e.target.value !== String(i.min) && run(() => api.ingredients.setMin(i.id, e.target.value), "Reorder level saved")}
                        />
                      ) : (
                        <>{num(i.min)} {i.unit}</>
                      )}
                    </td>
                    {isM && (
                      <td>
                        <button className="lnk del" onClick={() => window.confirm(`Remove ${i.name}?`) && run(() => api.ingredients.remove(i.id), "Removed")}>
                          Remove
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {isM && (
        <div className="panel" style={{ marginTop: 22 }}>
          <h2>Add an ingredient by hand</h2>
          <div className="row">
            <label>Name<input value={nw.name} onChange={(e) => setNw({ ...nw, name: e.target.value })} /></label>
            <label>Unit
              <select value={nw.unit} onChange={(e) => setNw({ ...nw, unit: e.target.value })}>
                {UNITS.map((u) => <option key={u}>{u}</option>)}
              </select>
            </label>
          </div>
          <div className="row">
            <label>Starting stock<input type="number" inputMode="decimal" min="0" step="any" value={nw.qty} onChange={(e) => setNw({ ...nw, qty: e.target.value })} /></label>
            <label>Reorder level<input type="number" inputMode="decimal" min="0" step="any" value={nw.min} onChange={(e) => setNw({ ...nw, min: e.target.value })} /></label>
            <button className="pri" onClick={async () => {
              if (await run(() => api.ingredients.add(nw), "Ingredient added")) setNw({ name: "", unit: "kg", qty: "", min: "" });
            }}>Add</button>
          </div>
        </div>
      )}
    </>
  );
}
