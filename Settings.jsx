import { useState } from "react";
import { api } from "../data/api.js";
import { useMe } from "../context.js";
import { toast } from "../lib/toast.jsx";

export default function Settings() {
  const me = useMe();
  const [pw, setPw] = useState({ oldPassword: "", newPassword: "" });
  const [word, setWord] = useState("");

  return (
    <>
      <h1>Settings</h1>
      <p className="mu">Signed in as {me.name} ({me.email}).</p>

      <form className="panel" onSubmit={async (e) => {
        e.preventDefault();
        try {
          await api.auth.changePassword(pw);
          toast("Password changed");
          setPw({ oldPassword: "", newPassword: "" });
        } catch (err) { toast(err.message, true); }
      }}>
        <h2>Change your password</h2>
        <div className="row">
          <label>Current password<input type="password" autoComplete="current-password" value={pw.oldPassword} onChange={(e) => setPw({ ...pw, oldPassword: e.target.value })} required /></label>
          <label>New password (8+)<input type="password" autoComplete="new-password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} required /></label>
          <button className="pri">Change</button>
        </div>
      </form>

      <div className="panel">
        <h2>Erase business data</h2>
        <p className="mu">Deletes all orders, stock, dishes, requisitions and the activity log. Accounts stay. This cannot be undone.</p>
        <div className="row" style={{ marginBottom: 0 }}>
          <label>Type ERASE to confirm<input value={word} onChange={(e) => setWord(e.target.value)} /></label>
          <button className="del" disabled={word !== "ERASE"} onClick={async () => {
            try { await api.admin.eraseAll(); toast("All business data erased"); setWord(""); } catch (e) { toast(e.message, true); }
          }}>Erase everything</button>
        </div>
      </div>

      <p className="mu">Data is currently stored in this browser only. It will move to the database in the next stage.</p>
    </>
  );
}
