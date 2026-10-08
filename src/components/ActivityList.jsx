import React from "react";
import Icon from "./Icon";

export default function ActivityList({ items }) {
  return (
    <div className="activity-list">
      {items.map((item, index) => (
        <div className="activity" key={(item.id || index) + item.kind}>
          <div className={"activity-icon " + item.kind.toLowerCase()}>
            <Icon
              name={item.kind === "Glucose" ? "drop" : item.kind === "Insulin" ? "syringe" : "meal"}
              size={17}
            />
          </div>
          <div>
            <b>{item.text}</b>
            <span>{item.date} · {item.time}</span>
          </div>
          <Icon name="chevron" size={16} />
        </div>
      ))}
    </div>
  );
}
