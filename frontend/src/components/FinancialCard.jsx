import React from "react";

const FinancialCard = ({
  icon,
  label,
  value,
  additionalContent,
  borderColor = "",
  bgColor = "bg-white",
}) => (
  <div
    className={`${bgColor} rounded-2xl p-5 shadow-sm border border-slate-200 transition-all hover:-translate-y-0.5 hover:shadow-md ${borderColor}`}
  >
    <div className="text-sm font-medium text-slate-600 flex items-center gap-2">
      {icon}
      {label}
    </div>
    <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
    {additionalContent}
  </div>
);

export default FinancialCard;
