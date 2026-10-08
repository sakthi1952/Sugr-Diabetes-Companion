import React from "react";

const paths = {
  grid: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
  drop: "M12 3s6 6.2 6 10a6 6 0 0 1-12 0c0-3.8 6-10 6-10Z",
  syringe: "M7 21l3-3m-1-13 7 7m-9-5 7 7M5 8l3-3m6 1 3-3 2 2-3 3M4 11l9 9 3-3-9-9-3 3Z",
  meal: "M4 3v18m0-11h4M17 3v18m0-18c0 3 2 4 2 7s-2 4-2 4M13 3v6c0 1.7-1.3 3-3 3",
  history: "M3 12a9 9 0 1 0 3-6.7M3 4v6h6M12 7v5l3 2",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4",
  plus: "M12 5v14M5 12h14",
  arrow: "M5 12h14m-6-6 6 6-6 6",
  chevron: "m9 18 6-6-6-6",
  settings: "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm7.4-3.5a7.7 7.7 0 0 0-.1-1l2-1.5-2-3.4-2.3.9a7.7 7.7 0 0 0-1.7-1L15 3h-4l-.4 2.5a7.7 7.7 0 0 0-1.7 1l-2.3-.9-2 3.4 2 1.5a7.7 7.7 0 0 0-.1 1 7.7 7.7 0 0 0 .1 1l-2 1.5 2 3.4 2.3-.9a7.7 7.7 0 0 0 1.7 1L11 21h4l.4-2.5a7.7 7.7 0 0 0 1.7-1l2.3.9 2-3.4-2-1.5a7.7 7.7 0 0 0 .1-1Z"
};

export default function Icon({ name, size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={paths[name] || paths.grid} />
    </svg>
  );
}
