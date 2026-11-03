import { api } from "../data/api.js";
import { useLoad } from "../lib/useLoad.js";
import { when } from "../lib/format.js";

export default function Activity() {
  const [log] = useLoad(() => api.activity.list());
  if (!log) return null;
  return (
    <>
      <h1>Activity</h1>
      <p className="mu">Who did what, newest first. Shows the latest 150 entries.</p>
      {log.length === 0 ? (
        <p className="mu">Nothing yet.</p>
      ) : (
        <div className="sc">
          <table>
            <thead><tr><th>When</th><th>Who</th><th>What</th></tr></thead>
            <tbody>
              {log.map((l) => (
                <tr key={l.id}><td style={{ whiteSpace: "nowrap" }}>{when(l.at)}</td><td>{l.byName}</td><td>{l.text}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
