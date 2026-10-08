import React from "react";
import Icon from "./Icon";

export default function ListPage({ title, subtitle, button, onAdd, children }) {
  return (
    <div className="list-page">
      <div className="page-toolbar">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>

        {button && (
          <button className="primary-btn" onClick={onAdd}>
            <Icon name="plus" size={17} />
            {button}
          </button>
        )}
      </div>

      <section className="panel">{children}</section>
    </div>
  );
}
