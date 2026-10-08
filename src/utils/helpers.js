export function formatTime() { return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }
export function glucoseStatus(value) { if (value < 70) return { label: "Low", cls: "low" }; if (value > 180) return { label: "High", cls: "high" }; return { label: "In range", cls: "normal" }; }
export function iconName(id) { const map = { dashboard:"grid", glucose:"drop", insulin:"syringe", meals:"meal", history:"history", reminders:"bell", ai:"sparkles", settings:"settings" }; return map[id] || "grid"; }
