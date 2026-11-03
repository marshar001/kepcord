import { useState } from "react";
import { api } from "../data/api.js";
import { useMe } from "../context.js";
import { useLoad } from "../lib/useLoad.js";
import { toast } from "../lib/toast.jsx";
import { when, num } from "../lib/format.js";

export default function Requisitions() {
  const isM = useMe().role === "management";
  const [open, reloadOpen] = useLoad(() => api.requisitions.open());
  const [closed, reloadClosed] = useLoad(() => api.requisitions.closed());
  const [qty, setQty] = useState({});

  if (!open || !closed) return null;

  async function act(fn, ok) {
    try { await fn(); toast(ok); } catch (e) { toast(e.message, true); }
    await Promise.all([reloadOpen(), reloadClosed()]);
  }

  return (
    <>
      <h1>Requisitions</h1>
      <p className="mu">Raised automatically when an ingredient reaches its reorder level or runs out. When the goods arrive, mark it received and the stock goes up.</p>

      {open.length === 0 ? (
        <p>Nothing to reorder right now.</p>
      ) : (
        <div className="sc">
          <table>
            <thead><tr><th>Ingredient</th><th>Needed</th><th>Received</th><th /></tr></thead>
            <tbody>
              {open.map((r) => (
                <tr key={r.id}>
                  <td>{r.name}<div className="mu">{r.reason} · {when(r.at)}</div></td>
                  <td className="n">{num(r.qty)} {r.unit}</td>
                  <td>
                    <input
                      type="number" inputMode="decimal" min="0" step="any"
                      aria-label={`Quantity received for ${r.name}`}
                      value={qty[r.id] ?? r.qty}
                      onChange={(e) => setQty({ ...qty, [r.id]: e.target.value })}
                    />
                  </td>
                  <td>
                    <button className="pri" onClick={() => act(() => api.requisitions.receive(r.id, qty[r.id] ?? r.qty), "Stock updated")}>Mark received</button>
                    {isM && <button className="lnk del" onClick={() => act(() => api.requisitions.dismiss(r.id), "Dismissed")}>Dismiss</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2>History</h2>
      {closed.length === 0 ? (
        <p className="mu">Nothing yet.</p>
      ) : (
        <div className="sc">
          <table>
            <thead><tr><th>Ingredient</th><th>Result</th><th>Closed</th></tr></thead>
            <tbody>
              {closed.map((r) => (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td>{r.status === "received" ? `Received ${num(r.receivedQty)} ${r.unit}` : "Dismissed"}</td>
                  <td>{when(r.closedAt)} · {r.closedBy || ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
