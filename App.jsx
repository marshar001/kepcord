import { useEffect, useState } from "react";
import { api } from "./data/api.js";
import { UserContext } from "./context.js";
import { Toasts } from "./lib/toast.jsx";
import Shell from "./components/Shell.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Orders from "./pages/Orders.jsx";
import Inventory from "./pages/Inventory.jsx";
import Menu from "./pages/Menu.jsx";
import Requisitions from "./pages/Requisitions.jsx";
import Employees from "./pages/Employees.jsx";
import Activity from "./pages/Activity.jsx";
import Settings from "./pages/Settings.jsx";

// mgmt: true means management only. Employees never see those screens.
const SCREENS = [
  { id: "dashboard", label: "Dashboard", El: Dashboard, mgmt: true },
  { id: "orders", label: "Orders", El: Orders },
  { id: "inventory", label: "Inventory", El: Inventory },
  { id: "menu", label: "Menu", El: Menu, mgmt: true },
  { id: "requisitions", label: "Requisitions", El: Requisitions },
  { id: "employees", label: "Employees", El: Employees, mgmt: true },
  { id: "activity", label: "Activity", El: Activity, mgmt: true },
  { id: "settings", label: "Settings", El: Settings, mgmt: true },
];

export default function App() {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(null);
  const [setup, setSetup] = useState(false);
  const [shop, setShop] = useState("");
  const [page, setPage] = useState("orders");

  async function refresh() {
    const [st, u] = await Promise.all([api.auth.status(), api.auth.session()]);
    setSetup(st.setup);
    setUser(u);
    if (u) {
      setShop((await api.shop.info()).name);
      setPage(u.role === "management" ? "dashboard" : "orders");
    }
    setReady(true);
  }
  useEffect(() => { refresh(); }, []);

  async function signOut() {
    await api.auth.signOut();
    setUser(null);
    setSetup((await api.auth.status()).setup);
  }

  if (!ready) return null;

  const body = !user ? (
    <Login setup={setup} onDone={refresh} />
  ) : (
    (() => {
      const allowed = SCREENS.filter((s) => !s.mgmt || user.role === "management");
      const current = allowed.find((s) => s.id === page) || allowed[0];
      return (
        <UserContext.Provider value={user}>
          <Shell user={user} shop={shop} screens={allowed} page={current.id} setPage={setPage} onSignOut={signOut}>
            <current.El />
          </Shell>
        </UserContext.Provider>
      );
    })()
  );

  return (
    <>
      {body}
      <Toasts />
    </>
  );
}
