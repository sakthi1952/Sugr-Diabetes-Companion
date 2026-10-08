import React from "react";
import Icon from "../components/Icon";
import ListPage from "../components/ListPage";

export default function Meals({ items, onAdd }) {
  return (
    <ListPage title="Meals & carbs" subtitle="Track meals and carbohydrate intake." button="Add meal" onAdd={onAdd}>
      <div className="table-list">
        {items.map(item => (
          <div className="table-row" key={item.id}>
            <div className="row-icon orange"><Icon name="meal" /></div>
            <div className="row-main">
              <b>{item.name}</b>
              <span>{item.carbs} g carbohydrates</span>
            </div>
            <time>{item.date} · {item.time}</time>
            <Icon name="chevron" size={17} />
          </div>
        ))}
      </div>
    </ListPage>
  );
}
