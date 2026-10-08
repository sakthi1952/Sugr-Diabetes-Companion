import React from "react";
import Icon from "../components/Icon";
import ListPage from "../components/ListPage";

export default function Insulin({ items, onAdd }) {
  return (
    <ListPage title="Insulin log" subtitle="Keep a clear record of your doses." button="Add dose" onAdd={onAdd}>
      <div className="table-list">
        {items.map(item => (
          <div className="table-row" key={item.id}>
            <div className="row-icon purple"><Icon name="syringe" /></div>
            <div className="row-main">
              <b>{item.dose} units</b>
              <span>{item.type}</span>
            </div>
            <time>{item.date} · {item.time}</time>
            <Icon name="chevron" size={17} />
          </div>
        ))}
      </div>
    </ListPage>
  );
}
