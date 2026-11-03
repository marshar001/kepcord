export default function Shell({ user, shop, screens, page, setPage, onSignOut, children }) {
  return (
    <div className="shell">
      <aside>
        <div className="brand">Kepcord</div>
        <div className="who">
          {shop} · {user.name} ({user.role === "management" ? "Management" : "Employee"})
        </div>
        <button className="out" onClick={onSignOut}>Sign out</button>
        <nav aria-label="Main">
          {screens.map((s) => (
            <button
              key={s.id}
              className={s.id === page ? "on" : ""}
              aria-current={s.id === page ? "page" : undefined}
              onClick={() => { setPage(s.id); window.scrollTo(0, 0); }}
            >
              {s.label}
            </button>
          ))}
        </nav>
      </aside>
      <main className="pg">{children}</main>
    </div>
  );
}
