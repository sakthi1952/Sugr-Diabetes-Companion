import React from "react";

export default function Settings({ user, syncStatus, onLogout, onClearData }) {
  const statusText = syncStatus === "synced" ? "Your latest changes are synced to the cloud." : syncStatus === "offline" ? "Cloud sync is unavailable. Your latest changes remain saved locally and will sync when the server is reachable." : syncStatus === "syncing" ? "Syncing your latest changes…" : "Changes are saved automatically.";
  return <section>
    <div className="page-toolbar"><div><h2>Settings</h2><p>Manage your Sugr account, cloud sync and local cache.</p></div></div>
    <div className="settings-grid">
      <div className="panel setting-card"><div className="avatar large">{user.name.slice(0,2).toUpperCase()}</div><div><h3>{user.name}</h3><p>{user.email}</p><span className="setting-badge">🔐 Cloud account</span></div></div>
      <div className="panel setting-card"><div><h3>Cloud synchronization</h3><p>{statusText}</p></div><span className={`sync-badge ${syncStatus}`}>{syncStatus === "synced" ? "✓ Synced" : syncStatus === "offline" ? "Offline" : syncStatus === "syncing" ? "Syncing" : "Ready"}</span></div>
      <div className="panel setting-card"><div><h3>Account</h3><p>Sign out of this browser session. Your cloud data stays in your account.</p></div><button className="secondary-btn" onClick={onLogout}>Log out</button></div>
      <div className="panel setting-card danger-card"><div><h3>Delete health data</h3><p>This clears glucose, insulin and meal records from your account and local cache.</p></div><button className="danger-btn" onClick={onClearData}>Clear my data</button></div>
    </div>
  </section>;
}
