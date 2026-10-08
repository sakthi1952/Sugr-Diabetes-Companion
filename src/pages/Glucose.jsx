import React from "react";
import Icon from "../components/Icon";
import ListPage from "../components/ListPage";
import { glucoseStatus } from "../utils/helpers";

export default function Glucose({ items, onAdd }) {
  return (
    <ListPage title="Glucose readings" subtitle="Track your blood glucose throughout the day." button="Add glucose" onAdd={onAdd}>
      <div className="table-list">
        {items.map(item => {
          const state = glucoseStatus(item.value);
          return (
            <div className="table-row" key={item.id}>
              <div className="row-icon"><Icon name="drop" /></div>
              <div className="row-main">
                <b>{item.value} mg/dL</b>
                <span>{item.context}</span>
              </div>
              <span className={"status " + state.cls}>{state.label}</span>
              <time>{item.date} · {item.time}</time>
              <Icon name="chevron" size={17} />
            </div>
          );
        })}
      </div>
    </ListPage>
  );
}
