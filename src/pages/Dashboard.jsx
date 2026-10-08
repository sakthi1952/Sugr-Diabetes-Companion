import React, { useState } from "react";
import Icon from "../components/Icon";
import Metric from "../components/Metric";
import ActivityList from "../components/ActivityList";
import { glucoseStatus } from "../utils/helpers";

function TrendChart({ values }) {
  const points = values.length ? values : [118, 142, 104, 129, 111];
  const coords = points.map((value, index) => {
    const x = 20 + index * (360 / Math.max(1, points.length - 1));
    const y = 180 - ((value - 50) / 170) * 145;
    return [x, Math.max(25, Math.min(180, y))];
  });
  const d = coords.map((p, i) => `${i ? "L" : "M"} ${p[0]} ${p[1]}`).join(" ");

  return (
    <svg className="chart" viewBox="0 0 400 210" preserveAspectRatio="none">
      {[35, 85, 135, 185].map(y => (
        <line key={y} x1="20" x2="380" y1={y} y2={y} className="grid-line" />
      ))}
      <path d={d} className="chart-line" />
      {coords.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="4.5" className="chart-dot" />
      ))}
      <text x="22" y="205">Recent</text>
      <text x="350" y="205">Today</text>
    </svg>
  );
}

function Quick({ icon, label, onClick }) {
  return (
    <button className="quick" onClick={onClick}>
      <span><Icon name={icon} /></span>
      <b>{label}</b>
      <small>Add entry</small>
    </button>
  );
}

export default function Dashboard({ data, activities, openModal, goToAI }) {
  const [range, setRange] = useState("7D");
  const latest = data.glucose[0];
  const average = Math.round(
    data.glucose.slice(0, 5).reduce((sum, x) => sum + x.value, 0) /
    Math.max(1, Math.min(5, data.glucose.length))
  );
  const insulinToday = data.insulin.slice(0, 2).reduce((sum, x) => sum + x.dose, 0);
  const carbsToday = data.meals.slice(0, 2).reduce((sum, x) => sum + x.carbs, 0);
  const state = latest ? glucoseStatus(latest.value) : { label: "No reading", cls: "" };

  return (
    <div className="dashboard">
      <div className="metric-grid">
        <Metric title="Latest glucose" value={latest?.value ?? "—"} unit={latest ? "mg/dL" : ""} badge={state.label} cls={state.cls} icon="drop" />
        <Metric title="Average glucose" value={average || "—"} unit={average ? "mg/dL" : ""} badge="Last 5 readings" icon="history" />
        <Metric title="Insulin today" value={insulinToday} unit="units" badge="Logged" icon="syringe" />
        <Metric title="Carbs today" value={carbsToday} unit="grams" badge="Logged" icon="meal" />
      </div>

      <div className="content-grid">
        <section className="panel trend-panel">
          <div className="panel-head">
            <div>
              <h2>Glucose trend</h2>
              <p>Your recent readings</p>
            </div>
            <div className="segmented">
              {["7D", "14D", "30D"].map(x => (
                <button key={x} className={range === x ? "selected" : ""} onClick={() => setRange(x)}>
                  {x}
                </button>
              ))}
            </div>
          </div>
          <TrendChart values={data.glucose.slice(0, 7).map(x => x.value)} />
          <div className="legend">
            <span><i className="legend-dot" /> Glucose</span>
            <span>For tracking context only</span>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Quick actions</h2>
              <p>Log something in seconds</p>
            </div>
          </div>

          <div className="quick-grid">
            <Quick icon="drop" label="Glucose" onClick={() => openModal("glucose")} />
            <Quick icon="syringe" label="Insulin" onClick={() => openModal("insulin")} />
            <Quick icon="meal" label="Meal" onClick={() => openModal("meal")} />
          </div>

          <div className="insight clickable-insight" onClick={goToAI}>
            <div className="insight-icon">✦</div>
            <div>
              <b>✨ Explain my day with Sugr AI</b>
              <p>Let Sugr compare your logged glucose, meals and insulin for personal patterns.</p>
            </div>
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Recent activity</h2>
            <p>Your latest entries</p>
          </div>
        </div>
        <ActivityList items={activities.slice(0, 6)} />
      </section>
    </div>
  );
}
