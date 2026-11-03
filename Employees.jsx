import { useState } from "react";
import { api } from "../data/api.js";
import { useLoad } from "../lib/useLoad.js";
import { toast } from "../lib/toast.jsx";

export default function Employees() {
  const [list, reload] = useLoad(() => api.employees.list());
  const [f, setF] = useState({ name: "", email: "", password: "" });

  if (!list) return null;

  async function run(fn, ok) {
    try { await fn(); toast(ok); await reload(); return true; } catch (e) { toast(e.message, true); return false; }
  }

  return (
    <>
      <h1>Employees</h1>
      <p className="mu">Each employee signs in with their own email and password. Everything they record carries their name.</p>

      <form className="panel" onSubmit={async (e) => {
        e.preventDefault();
        if (await run(() => api.employees.add(f), "Employee added")) setF({ name: "", email: "", password: "" });
      }}>
        <h2>Add an employee</h2>
        <div className="row">
          <label>Full name<input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></label>
          <label>Email<input type="email" autoComplete="off" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required /></label>
          <label>Password (8+)<input type="text" autoComplete="off" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required /></label>
          <button className="pri">Add</button>
        </div>
      </form>

      <div className="sc">
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th /></tr></thead>
          <tbody>
            {list.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{u.role === "management" ? "Management" : "Employee"}</td>
                <td>
                  {u.role === "employee" && (
                    <>
                      <button className="lnk" onClick={() => {
                        const pw = window.prompt(`New password for ${u.name} (8+ characters):`);
                        if (pw) run(() => api.employees.resetPassword(u.id, pw), "Password reset");
                      }}>Reset password</button>
                      <button className="lnk del" onClick={() => window.confirm(`Remove ${u.name}?`) && run(() => api.employees.remove(u.id), "Employee removed")}>Remove</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
