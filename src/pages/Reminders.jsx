import React, { useState } from "react";
import Icon from "../components/Icon";
import ListPage from "../components/ListPage";

export default function Reminders() {
  const [items, setItems] = useState([
    { id: 1, title: "Morning glucose check", time: "08:00 AM", enabled: true },
    { id: 2, title: "Long-acting insulin", time: "10:00 PM", enabled: true },
    { id: 3, title: "Evening glucose check", time: "08:30 PM", enabled: false }
  ]);

  function toggle(id) {
    setItems(current => current.map(x => x.id === id ? { ...x, enabled: !x.enabled } : x));
  }

  function add() {
    setItems(current => [
      ...current,
      { id: Date.now(), title: "New reminder", time: "09:00 PM", enabled: true }
    ]);
  }

  return (
    <ListPage title="Reminders" subtitle="Stay consistent with your daily routine." button="Add reminder" onAdd={add}>
      <div className="reminders">
        {items.map(item => (
          <div className="reminder-card" key={item.id}>
            <div className="reminder-icon"><Icon name="bell" /></div>
            <div className="reminder-info">
              <b>{item.title}</b>
              <span>{item.time}</span>
            </div>
            <button className={"switch " + (item.enabled ? "on" : "")} onClick={() => toggle(item.id)}>
              <i />
            </button>
          </div>
        ))}
      </div>
    </ListPage>
  );
}
