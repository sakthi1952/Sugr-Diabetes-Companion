import React from "react";
import Icon from "./Icon";
import { iconName } from "../utils/helpers";

const nav = [
  ["dashboard", "Overview"], ["glucose", "Glucose"], ["insulin", "Insulin"],
  ["meals", "Meals"], ["history", "History"], ["reminders", "Reminders"], ["ai", "Sugr AI"]
];

export default function Sidebar({ page, setPage, user, onLogout }) {
  return <aside className="sidebar">
    <div className="brand"><div className="brand-mark">S</div><div>Sugr<span>+</span></div></div>
    <div className="nav-label">MAIN MENU</div>
    <nav>{nav.map(([id, label]) => <button key={id} className={page === id ? "nav-item active" : "nav-item"} onClick={() => setPage(id)}><Icon name={iconName(id)} size={19} />{label}</button>)}</nav>
    <div className="sidebar-bottom">
      <button className={page === "settings" ? "nav-item active" : "nav-item"} onClick={() => setPage("settings")}><Icon name="settings" size={19} />Settings</button>
      <div className="mini-profile"><div className="avatar">{user.name.slice(0,2).toUpperCase()}</div><div><b>{user.name}</b><span>{user.email}</span></div></div>
    </div>
  </aside>;
}
