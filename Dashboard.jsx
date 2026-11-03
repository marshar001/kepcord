import { useState } from "react";
import { api } from "../data/api.js";
import { useLoad } from "../lib/useLoad.js";
import { naira, when, num } from "../lib/format.js";
import Chart from "../components/Chart.jsx";

export default function Dashboard() {
  const [days, setDays] = useState(7);
  const [sum] = useLoad(() => api.reports.summary());
  const [series] = useLoad(() => api.reports.salesByDay(days), [days]);
  const [recent] = useLoad(() => api.orders.recent(8));

  if (!sum || !series || !recent) return null;
  return (
    <>
      <h1>Dashboard</h1>
      <p className="mu">Voided orders are not counted in sales.</p>
      <div className="figs">
        <div><b>{naira(sum.todaySales)}</b><span>Sales today</span></div>
        <div><b>{sum.todayOrders}</b><span>Orders today</span></div>
        <div><b>{naira(sum.weekSales)}</b><span>Last 7 days</span></div>
        <div><b>{sum.lowCount}</b><span>Low or out of stock</span></div>
        <div><b>{sum.openReqs}</b><span>Open requisitions</span></div>
      </div>

      <h2>Sales</h2>
      <div className="seg" role="group" aria-label="Period">
        {[7, 30].map((n) => (
          <button key={n} className={days === n ? "on" : ""} aria-pressed={days === n} onClick={() => setDays(n)}>
            {n} days
          </button>
        ))}
      </div>
      <Chart data={series} />

      <h2>Best sellers (30 days)</h2>
      {sum.top.length === 0 ? (
        <p className="mu">No sales yet.</p>
      ) : (
        <table>
          <tbody>
            {sum.top.map((t) => (
              <tr key={t.name}><td>{t.name}</td><td className="n">{num(t.qty)} sold</td></tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>Latest orders</h2>
      {recent.length === 0 ? (
        <p className="mu">No orders yet.</p>
      ) : (
        <div className="sc">
          <table>
            <thead><tr><th>When</th><th>By</th><th>Items</th><th className="n">Total</th></tr></thead>
            <tbody>
              {recent.map((o) => (
                <tr key={o.id}>
                  <td>{when(o.at)}</td>
                  <td>{o.byName}</td>
                  <td>{o.lines.map((l) => `${l.qty} × ${l.name}`).join(", ")}{o.voided && <span className="tag">VOIDED</span>}</td>
                  <td className="n">{naira(o.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
