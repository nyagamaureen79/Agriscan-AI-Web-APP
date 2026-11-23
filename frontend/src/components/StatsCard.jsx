import React from "react";

const StatsCard = ({ title, value, icon, trendValue }) => {
  // Determine trend type dynamically: "increase" for positive, "decrease" for negative
  let trendType = null;
  let displayTrend = null;

  if (trendValue && trendValue !== "-") {
    trendType = trendValue.startsWith("-") ? "decrease" : "increase";
    // Add "from last month" text
    displayTrend = `${trendValue} from last month`;
  }

  // Trend icon based on type
  const trendIcon =
    trendType === "increase" ? (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path
          d="M16 6L18.29 8.29L13.41 13.17L9.41 9.17L2 16.59L3.41 18L9.41 12L13.41 16L19.71 9.71L22 12V6H16Z"
          fill="#23C55F"
        />
      </svg>
    ) : trendType === "decrease" ? (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path
          d="M16 18L18.29 15.71L13.41 10.83L9.41 14.83L2 7.41L3.41 6L9.41 12L13.41 8L19.71 14.29L22 12V18H16Z"
          fill="#DC2626"
        />
      </svg>
    ) : null;

  const trendColor = trendType === "increase" ? "#23C55F" : "#DC2626";

  return (
    <div className="stats-card">
      <div className="stats-header">
        <div className="stats-icon">{icon}</div>
        <span className="stats-title">{title}</span>
      </div>

      <div className="stats-value">{value}</div>

      {displayTrend && (
        <div className="stats-trend">
          {trendIcon}
          <span className="trend-text" style={{ color: trendColor }}>
            {displayTrend}
          </span>
        </div>
      )}
    </div>
  );
};

export default StatsCard;
