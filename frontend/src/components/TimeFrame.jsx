import React from "react";

const TimeFrameSelector = ({
  timeFrame,
  setTimeFrame,
  options,
  color = "teal",
  style = "default",
}) => {
  const colorClass = {
    teal: "bg-cyan-500",
    orange: "bg-rose-500",
    cyan: "bg-sky-500",
    sky: "bg-sky-500",
    rose: "bg-rose-500",
  }[color];

  const styleClass = {
    default:
      "flex gap-1 bg-white p-1 rounded-2xl border border-slate-200 shadow-sm",
    minimal: "flex gap-2",
  }[style];

  return (
    <div className={styleClass}>
      {options.map((frame) => (
        <button
          key={frame}
          onClick={() => setTimeFrame(frame)}
          className={`px-3 py-2 text-sm rounded-xl transition-all ${
            timeFrame === frame
              ? `${colorClass} text-white`
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          {frame.charAt(0).toUpperCase() + frame.slice(1)}
        </button>
      ))}
    </div>
  );
};

export default TimeFrameSelector;

//it shows the 3 boxes with the details
// like Total Income,Average Income, Transactions
