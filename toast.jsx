import { useEffect, useState } from "react";

let push = () => {};

// Call from anywhere: toast("Saved") or toast("Something went wrong", true)
export function toast(text, bad = false) {
  push({ id: Math.random(), text, bad });
}

export function Toasts() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    push = (t) => {
      setItems((x) => [...x.slice(-1), t]);
      setTimeout(() => setItems((x) => x.filter((y) => y.id !== t.id)), t.bad ? 5000 : 2600);
    };
    return () => { push = () => {}; };
  }, []);
  return items.map((t) => (
    <div key={t.id} className={"toast" + (t.bad ? " bad" : "")} role="status" aria-live="polite">
      {t.text}
    </div>
  ));
}
