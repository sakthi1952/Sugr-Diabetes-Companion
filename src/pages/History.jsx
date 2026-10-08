import React from "react";
import ListPage from "../components/ListPage";
import ActivityList from "../components/ActivityList";

export default function History({ items }) {
  return (
    <ListPage title="Activity history" subtitle="A unified view of your recent entries.">
      <ActivityList items={items} />
    </ListPage>
  );
}
