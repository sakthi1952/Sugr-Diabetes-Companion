import React, { useState } from "react";
import { loginUser, registerUser } from "../auth/auth";

export default function Auth({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  function update(e) { setForm(f => ({ ...f, [e.target.name]: e.target.value })); setError(""); }
  async function submit(e) {
    e.preventDefault(); setError("");
    if (mode === "register" && form.password !== form.confirm) return setError("Passwords do not match.");
    if (form.password.length < 8) return setError("Password must be at least 8 characters.");
    setBusy(true);
    try { const user = mode === "login" ? await loginUser(form) : await registerUser(form); onAuth(user); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  return <div className="auth-shell"><div className="auth-card">
    <div className="auth-brand"><div className="brand-mark">S</div><span>Sugr<span>+</span></span></div>
    <div className="auth-copy"><div className="eyebrow">PERSONAL DIABETES COMPANION</div><h1>{mode === "login" ? "Welcome back" : "Create your Sugr account"}</h1><p>{mode === "login" ? "Sign in to securely access your synced Sugr dashboard." : "Your account keeps your health data synced across your devices."}</p></div>
    <form className="auth-form" onSubmit={submit}>
      {mode === "register" && <label className="field"><span>Full name</span><input name="name" value={form.name} onChange={update} required placeholder="Your name" /></label>}
      <label className="field"><span>Email</span><input name="email" type="email" value={form.email} onChange={update} required placeholder="you@example.com" /></label>
      <label className="field"><span>Password</span><input name="password" type="password" value={form.password} onChange={update} required placeholder="At least 8 characters" /></label>
      {mode === "register" && <label className="field"><span>Confirm password</span><input name="confirm" type="password" value={form.confirm} onChange={update} required placeholder="Repeat password" /></label>}
      {error && <div className="auth-error">{error}</div>}
      <button className="primary-btn wide" disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Login securely" : "Create secure account"}</button>
    </form>
    <div className="auth-switch">{mode === "login" ? <>New to Sugr? <button onClick={() => {setMode("register");setError("")}}>Create an account</button></> : <>Already have an account? <button onClick={() => {setMode("login");setError("")}}>Login</button></>}</div>
    <div className="auth-note">Accounts and health records are stored on your configured Sugr server database. Use HTTPS and a strong JWT secret in production.</div>
  </div></div>;
}
