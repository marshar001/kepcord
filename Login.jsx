import { useId, useState } from "react";
import { api } from "../data/api.js";
import { toast } from "../lib/toast.jsx";

const icon = { width: 24, height: 24, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };
const Mail = () => (<svg {...icon}><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m4 8 8 5 8-5" /></svg>);
const Lock = () => (<svg {...icon}><rect x="5" y="11" width="14" height="9" rx="3" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>);
const User = () => (<svg {...icon}><circle cx="12" cy="8" r="4" /><path d="M4.5 20a7.5 7.5 0 0 1 15 0" /></svg>);
const Shop = () => (<svg {...icon}><path d="M4 9 5.5 4h13L20 9" /><path d="M4 9a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0A2.7 2.7 0 0 0 20 9" /><path d="M5 12v8h14v-8" /></svg>);
const Eye = () => (<svg {...icon}><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>);
const EyeOff = () => (<svg {...icon}><path d="M3 3l18 18" /><path d="M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4M6.5 6.6A16.6 16.6 0 0 0 2 12s3.6 7 10 7a9.8 9.8 0 0 0 4.4-1" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></svg>);
const Arrow = () => (<svg {...icon}><path d="M5 12h14M13 6l6 6-6 6" /></svg>);

// Buttons live OUTSIDE the <label>, otherwise screen readers read them with the label's text.
function Field({ label, hint, aside, icon: Icon, type = "text", value, onChange, placeholder, autoComplete }) {
  const [shown, setShown] = useState(false);
  const id = useId();
  const isPw = type === "password";
  return (
    <div className="field">
      <div className="lab">
        <label htmlFor={id}>{label} {hint && <span className="hint">{hint}</span>}</label>
        {aside}
      </div>
      <div className="fl">
        <Icon />
        <input
          id={id}
          type={isPw && shown ? "text" : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required
        />
        {isPw && (
          <button type="button" className="eye" onClick={() => setShown(!shown)} aria-label={shown ? "Hide password" : "Show password"}>
            {shown ? <EyeOff /> : <Eye />}
          </button>
        )}
      </div>
    </div>
  );
}

// "setup" is true once a business exists on this device. Then only sign-in is offered:
// staff are added by management, they don't register themselves.
export default function Login({ setup, onDone }) {
  const [mode, setMode] = useState(setup ? "login" : "register");
  const [f, setF] = useState({ shop: "", name: "", email: "", password: "", remember: true });
  const [busy, setBusy] = useState(false);
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));
  const register = mode === "register" && !setup;

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      if (register) await api.auth.setup(f);
      else await api.auth.signIn(f);
      await onDone();
    } catch (err) {
      toast(err.message, true);
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <div className="mark">
        <div className="logo">K</div>
        <div className="word">KEPCORD</div>
      </div>
      <h1>{register ? "Set up your business" : "Welcome back"}</h1>
      <p className="sub">
        {register ? "Create the management account for your restaurant." : "Please enter your details to login."}
      </p>

      <form className="card" onSubmit={submit}>
        {register && (
          <>
            <Field label="Business name" icon={Shop} value={f.shop} onChange={set("shop")} placeholder="Your restaurant's name" autoComplete="organization" />
            <Field label="Full name" icon={User} value={f.name} onChange={set("name")} placeholder="Your full name" autoComplete="name" />
          </>
        )}
        <Field label="Email" icon={Mail} type="email" value={f.email} onChange={set("email")} placeholder="you@example.com" autoComplete="email" />
        <Field
          label="Password"
          hint={register ? "(8+ characters)" : undefined}
          aside={!register && (
            <button type="button" className="lnk" onClick={() => toast("Ask management to reset your password for you.")}>
              Forgot password?
            </button>
          )}
          icon={Lock}
          type="password"
          value={f.password}
          onChange={set("password")}
          placeholder="Your password"
          autoComplete={register ? "new-password" : "current-password"}
        />
        <label className="chk">
          <input type="checkbox" checked={f.remember} onChange={(e) => set("remember")(e.target.checked)} />
          Remember me
        </label>
        <button className="pri go" disabled={busy}>
          {busy ? "Please wait…" : register ? "Create account" : "Login"} <Arrow />
        </button>

        {!setup ? (
          <p className="swap">
            {register ? "Already have an account?" : "Don’t have an account?"}{" "}
            <button type="button" onClick={() => setMode(register ? "login" : "register")}>
              {register ? "Login" : "Register"}
            </button>
          </p>
        ) : (
          <p className="swap">New staff member? Ask management to add you.</p>
        )}
      </form>
    </div>
  );
}
