import { useRef, useState } from "react";
import { api } from "../data/api.js";
import { useMe } from "../context.js";
import { useLoad } from "../lib/useLoad.js";
import { toast } from "../lib/toast.jsx";
import { naira, timeOnly, num } from "../lib/format.js";

export default function Orders() {
  const me = useMe();
  const isM = me.role === "management";
  const [dishes, reloadDishes] = useLoad(() => api.dishes.list());
  const [stock, reloadStock] = useLoad(() => api.ingredients.list());
  const [today, reloadToday] = useLoad(() => api.orders.today());
  const [cart, setCart] = useState({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const slip = useRef(null);

  if (!dishes || !stock || !today) return null;

  const have = Object.fromEntries(stock.map((i) => [i.id, i.qty]));
  // How many plates of a dish the current stock can make.
  const maxFor = (d) =>
    Math.floor(Math.min(...d.recipe.map((r) => (have[r.ingredientId] ?? 0) / r.qty)) + 1e-9);

  const lines = dishes.filter((d) => cart[d.id]).map((d) => ({ ...d, q: cart[d.id] }));
  const total = lines.reduce((s, l) => s + l.q * l.price, 0);
  const count = lines.reduce((s, l) => s + l.q, 0);

  function change(d, by) {
    const next = (cart[d.id] || 0) + by;
    if (by > 0 && next > maxFor(d)) return toast(`Not enough stock for another ${d.name}.`, true);
    setDone(false);
    setCart((c) => {
      const n = { ...c };
      if (next <= 0) delete n[d.id]; else n[d.id] = next;
      return n;
    });
  }

  async function place() {
    setBusy(true);
    try {
      await api.orders.place(lines.map((l) => ({ dishId: l.id, qty: l.q })));
      setCart({});
      setDone(true);
      toast("Order recorded");
    } catch (e) {
      toast(e.message, true);
    } finally {
      await Promise.all([reloadDishes(), reloadStock(), reloadToday()]);
      setBusy(false);
    }
  }

  async function voidOrder(o) {
    if (!window.confirm(`Void this order of ${naira(o.total)}? Its ingredients go back into stock.`)) return;
    try {
      await api.orders.void(o.id);
      toast("Order voided");
    } catch (e) {
      toast(e.message, true);
    }
    await Promise.all([reloadStock(), reloadToday()]);
  }

  const live = today.filter((o) => !o.voided);
  return (
    <>
      <div className="two">
        <div>
          <h1>Orders</h1>
          <p className="mu">Tap a dish to add it to the order.</p>
          {dishes.length === 0 ? (
            <p>{isM ? "Add dishes on the Menu screen first." : "No dishes yet. Ask management to add the menu."}</p>
          ) : (
            <div className="dishes">
              {dishes.map((d) => {
                const max = maxFor(d);
                return (
                  <button key={d.id} className={"dish" + (cart[d.id] ? " in" : "")} disabled={max <= 0} onClick={() => change(d, 1)}>
                    <b>{d.name}</b>
                    <span>{naira(d.price)}</span>
                    <i>{max <= 0 ? "Out of stock" : cart[d.id] ? `${cart[d.id]} in order` : `${max} left`}</i>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="side" ref={slip}>
          <h2>Current order</h2>
          {done && <div className="stamp">RECORDED</div>}
          <div className="slip">
            <div className="t">Kepcord</div>
            <div className="faint">{me.name}</div>
            {lines.length === 0 && <p className="faint" style={{ margin: "10px 0 0" }}>No dishes added yet.</p>}
            {lines.map((l) => (
              <div className="r" key={l.id}>
                <span className="nm">{l.name}</span>
                <span className="d" />
                <button onClick={() => change(l, -1)} aria-label={`One less ${l.name}`}>−</button>
                <b>{l.q}</b>
                <button onClick={() => change(l, 1)} aria-label={`One more ${l.name}`}>+</button>
                <span style={{ minWidth: 70, textAlign: "right" }}>{naira(l.q * l.price)}</span>
              </div>
            ))}
            <div className="tot"><span>Total</span><span>{naira(total)}</span></div>
            <button className="pri" disabled={!lines.length || busy} onClick={place}>
              {busy ? "Recording…" : "Record order"}
            </button>
          </div>
        </div>
      </div>

      {lines.length > 0 && (
        <button className="float" onClick={() => slip.current?.scrollIntoView({ behavior: "smooth" })}>
          View order · {count} · {naira(total)}
        </button>
      )}

      <h2>Today's orders</h2>
      <p className="mu">{live.length} orders · {naira(live.reduce((s, o) => s + o.total, 0))}</p>
      {today.length === 0 ? (
        <p className="mu">Nothing recorded yet today.</p>
      ) : (
        <div className="sc">
          <table>
            <thead><tr><th>Time</th><th>By</th><th>Items</th><th className="n">Total</th>{isM && <th />}</tr></thead>
            <tbody>
              {today.map((o) => (
                <tr key={o.id} style={o.voided ? { opacity: 0.55 } : undefined}>
                  <td>{timeOnly(o.at)}</td>
                  <td>{o.byName}</td>
                  <td>{o.lines.map((l) => `${num(l.qty)} × ${l.name}`).join(", ")}{o.voided && <span className="tag">VOIDED</span>}</td>
                  <td className="n">{naira(o.total)}</td>
                  {isM && <td>{!o.voided && <button className="lnk del" onClick={() => voidOrder(o)}>Void</button>}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
