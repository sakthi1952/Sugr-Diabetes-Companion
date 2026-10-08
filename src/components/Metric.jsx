import React from "react";
import Icon from "./Icon";

export default function Metric({ title, value, unit, badge, cls = "", icon }) {
  return (
    <div className="metric">
      <div className="metric-top">
        <div className="metric-icon"><Icon name={icon} /></div>
        <span className={"status " + cls}>{badge}</span>
      </div>
      <span className="metric-title">{title}</span>
      <div className="metric-value">
        {value}<small>{unit}</small>
      </div>
    </div>
  );
}
