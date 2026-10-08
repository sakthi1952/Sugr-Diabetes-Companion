import React from "react";
import Icon from "./Icon";

const titles = {
  dashboard: ["Good morning", "Here’s your health snapshot for today."],
  glucose: ["Glucose", "Keep track of your blood glucose readings."],
  insulin: ["Insulin", "Keep a clear record of your doses."],
  meals: ["Meals & carbs", "Track meals and carbohydrate intake."],
  history: ["Activity history", "A unified view of your recent entries."],
  reminders: ["Reminders", "Stay consistent with your daily routine."],
  ai: ["Sugr AI", "Your assistant for data patterns and diabetes education."],
  settings: ["Settings", "Manage your account and local data."]
};

export default function Header({ page, user }) {
  const [title, subtitle] = titles[page] || titles.dashboard;
  const date = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  return <header className="header"><div><div className="eyebrow">{date.toUpperCase()}</div><h1>{title}{page === "dashboard" ? `, ${user.name.split(" ")[0]}` : ""}</h1><p>{subtitle}</p></div><div className="header-actions"><button className="icon-btn notification"><Icon name="bell" /><i /></button><div className="avatar large">{user.name.slice(0,2).toUpperCase()}</div></div></header>;
}
