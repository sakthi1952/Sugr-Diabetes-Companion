import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import Modal from "./components/Modal";
import Dashboard from "./pages/Dashboard";
import Glucose from "./pages/Glucose";
import Insulin from "./pages/Insulin";
import Meals from "./pages/Meals";
import History from "./pages/History";
import Reminders from "./pages/Reminders";
import AI from "./pages/AI";
import Settings from "./pages/Settings";
import Auth from "./pages/Auth";
import { initialData } from "./data/initialData";
import { formatTime } from "./utils/helpers";
import { clearSession, dataKeyForUser, getSession, loadCloudData, syncCloudData } from "./auth/auth";

export default function App() {
  const [user, setUser] = useState(() => getSession());
  const [page, setPage] = useState("dashboard");
  const [data, setData] = useState(initialData);
  const [modal, setModal] = useState(null);
  const [syncStatus, setSyncStatus] = useState("idle");
  const [cloudLoaded, setCloudLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setCloudLoaded(false);
    setSyncStatus("syncing");
    const localKey = dataKeyForUser(user);
    let localData = initialData;
    try { localData = JSON.parse(localStorage.getItem(localKey)) || initialData; } catch {}
    setData(localData);
    loadCloudData().then(cloudData => {
      if (!active) return;
      setData(cloudData);
      localStorage.setItem(localKey, JSON.stringify(cloudData));
      setSyncStatus("synced");
      setCloudLoaded(true);
    }).catch(() => {
      if (!active) return;
      setSyncStatus("offline");
      setCloudLoaded(true);
    });
    return () => { active = false; };
  }, [user]);

  useEffect(() => {
    if (!user || !cloudLoaded) return;
    const localKey = dataKeyForUser(user);
    localStorage.setItem(localKey, JSON.stringify(data));
    setSyncStatus("pending");
    const timer = setTimeout(() => {
      setSyncStatus("syncing");
      syncCloudData(data).then(() => setSyncStatus("synced")).catch(() => setSyncStatus("offline"));
    }, 700);
    return () => clearTimeout(timer);
  }, [data, user, cloudLoaded]);

  function handleAuth(nextUser) { setUser(nextUser); setPage("dashboard"); }
  function logout() { clearSession(); setUser(null); setPage("dashboard"); setData(initialData); }
  function clearData() { if (window.confirm("Clear all glucose, insulin and meal records for this account? This will also remove the cloud copy.")) setData(initialData); }

  const activities = useMemo(() => [...data.glucose.map(x => ({ ...x, kind:"Glucose", text:`${x.value} mg/dL · ${x.context}` })), ...data.insulin.map(x => ({ ...x, kind:"Insulin", text:`${x.dose} U · ${x.type}` })), ...data.meals.map(x => ({ ...x, kind:"Meal", text:`${x.name} · ${x.carbs} g carbs` }))].slice(0, 20), [data]);

  function addGlucose(eventOrValue, contextValue) {
    if (typeof eventOrValue === "number") { const item = { id:Date.now(), value:eventOrValue, context:contextValue || "Other", time:formatTime(), date:"Today" }; setData(d => ({...d, glucose:[item,...d.glucose]})); return; }
    eventOrValue.preventDefault(); const f = new FormData(eventOrValue.currentTarget); const item = { id:Date.now(), value:Number(f.get("value")), context:f.get("context"), time:formatTime(), date:"Today" }; setData(d => ({...d, glucose:[item,...d.glucose]})); setModal(null);
  }
  function addInsulin(eventOrValue, typeValue) {
    if (typeof eventOrValue === "number") { const item = { id:Date.now(), dose:eventOrValue, type:typeValue || "Other", time:formatTime(), date:"Today" }; setData(d => ({...d, insulin:[item,...d.insulin]})); return; }
    eventOrValue.preventDefault(); const f = new FormData(eventOrValue.currentTarget); const item = { id:Date.now(), dose:Number(f.get("dose")), type:f.get("type"), time:formatTime(), date:"Today" }; setData(d => ({...d, insulin:[item,...d.insulin]})); setModal(null);
  }
  function addMeal(eventOrName, carbsValue) {
    if (typeof eventOrName === "string") { const item = { id:Date.now(), name:eventOrName, carbs:Number(carbsValue || 0), time:formatTime(), date:"Today" }; setData(d => ({...d, meals:[item,...d.meals]})); return; }
    eventOrName.preventDefault(); const f = new FormData(eventOrName.currentTarget); const item = { id:Date.now(), name:f.get("name"), carbs:Number(f.get("carbs")), time:formatTime(), date:"Today" }; setData(d => ({...d, meals:[item,...d.meals]})); setModal(null);
  }

  if (!user) return <Auth onAuth={handleAuth} />;

  return <div className="app-shell">
    <Sidebar page={page} setPage={setPage} user={user} onLogout={logout} />
    <main className="main">
      <Header page={page} user={user} />
      <div className="sync-pill">{syncStatus === "synced" ? "☁ Synced" : syncStatus === "syncing" ? "↻ Syncing…" : syncStatus === "pending" ? "• Saving…" : syncStatus === "offline" ? "⚠ Offline · saved locally" : ""}</div>
      {page === "dashboard" && <Dashboard data={data} activities={activities} openModal={setModal} goToAI={() => setPage("ai")} />}
      {page === "glucose" && <Glucose items={data.glucose} onAdd={() => setModal("glucose")} />}
      {page === "insulin" && <Insulin items={data.insulin} onAdd={() => setModal("insulin")} />}
      {page === "meals" && <Meals items={data.meals} onAdd={() => setModal("meal")} />}
      {page === "history" && <History items={activities} />}
      {page === "reminders" && <Reminders />}
      {page === "ai" && <AI data={data} onAddGlucose={addGlucose} onAddInsulin={addInsulin} onAddMeal={addMeal} />}
      {page === "settings" && <Settings user={user} syncStatus={syncStatus} onLogout={logout} onClearData={clearData} />}
      <footer>© 2026 Sugr · Secure cloud sync prototype · <span>Not a medical device</span></footer>
    </main>
    {modal === "glucose" && <Modal title="Add glucose reading" onClose={() => setModal(null)}><form onSubmit={addGlucose}><label className="field"><span>Glucose (mg/dL)</span><input name="value" type="number" min="20" max="600" required placeholder="e.g. 120" /></label><label className="field"><span>Context</span><select name="context"><option>Before meal</option><option>After meal</option><option>Fasting</option><option>Bedtime</option><option>Other</option></select></label><button className="primary-btn wide">Save reading</button></form></Modal>}
    {modal === "insulin" && <Modal title="Add insulin dose" onClose={() => setModal(null)}><form onSubmit={addInsulin}><label className="field"><span>Dose (units)</span><input name="dose" type="number" min="0" step="0.5" required placeholder="e.g. 6" /></label><label className="field"><span>Insulin type</span><select name="type"><option>Rapid-acting</option><option>Long-acting</option><option>Other</option></select></label><button className="primary-btn wide">Save dose</button></form></Modal>}
    {modal === "meal" && <Modal title="Add meal" onClose={() => setModal(null)}><form onSubmit={addMeal}><label className="field"><span>Meal name</span><input name="name" required placeholder="e.g. Breakfast" /></label><label className="field"><span>Carbohydrates (g)</span><input name="carbs" type="number" min="0" required placeholder="e.g. 45" /></label><button className="primary-btn wide">Save meal</button></form></Modal>}
  </div>;
}
