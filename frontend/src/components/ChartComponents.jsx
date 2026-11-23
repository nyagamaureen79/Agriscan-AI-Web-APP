import React, { useState, useRef } from 'react';

/* ─────────────────────────────────────────────────────
   NICE Y-AXIS HELPER
   Returns 5 always-distinct tick values + the ceiling
   that bars/lines should be scaled against.
───────────────────────────────────────────────────── */
export const computeYAxis = (maxVal) => {
  if (!maxVal || maxVal <= 0) return { max: 10, ticks: [10, 8, 6, 4, 2] };

  // Choose a step that gives clean integers and never repeats
  const rawStep = maxVal / 4;
  let step;
  if (rawStep <= 1)        step = 1;
  else if (rawStep <= 2)   step = 2;
  else if (rawStep <= 5)   step = 5;
  else if (rawStep <= 10)  step = 10;
  else if (rawStep <= 25)  step = 25;
  else if (rawStep <= 50)  step = 50;
  else if (rawStep <= 100) step = 100;
  else if (rawStep <= 250) step = 250;
  else if (rawStep <= 500) step = 500;
  else                     step = Math.ceil(rawStep / 1000) * 1000;

  const niceMax = step * 4;
  // Top → bottom: [niceMax, 3*step, 2*step, step, 0]
  return { max: niceMax, ticks: [4, 3, 2, 1, 0].map(i => i * step) };
};

/* ─────────────────────────────────────────────────────
   SMOOTH BEZIER PATH HELPERS
───────────────────────────────────────────────────── */
const buildSmoothLine = (pts) => {
  if (pts.length < 2) return `M${pts[0].x} ${pts[0].y}`;
  let d = `M${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const cx = (pts[i].x + pts[i + 1].x) / 2;
    d += ` C${cx},${pts[i].y} ${cx},${pts[i + 1].y} ${pts[i + 1].x},${pts[i + 1].y}`;
  }
  return d;
};

const buildSmoothArea = (pts, height) => {
  const line = buildSmoothLine(pts);
  return `${line} L${pts[pts.length - 1].x},${height} L${pts[0].x},${height} Z`;
};

/* ─────────────────────────────────────────────────────
   SKELETON / EMPTY STATES (unchanged)
───────────────────────────────────────────────────── */
const EmptyChartState = ({ message = "No data available yet" }) => (
  <div className="chart-empty-state">
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
      <circle cx="28" cy="28" r="28" fill="#F0F7F0" />
      <path d="M18 38V28M24 38V22M30 38V26M36 38V18"
        stroke="#4CAF50" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.4" />
    </svg>
    <p className="chart-empty-label">{message}</p>
  </div>
);

const ChartSkeleton = () => (
  <div className="chart-skeleton">
    <div className="skeleton-bars-row">
      <div className="skeleton-bar" style={{ height: '60%' }} />
      <div className="skeleton-bar" style={{ height: '80%' }} />
      <div className="skeleton-bar" style={{ height: '45%' }} />
      <div className="skeleton-bar" style={{ height: '70%' }} />
      <div className="skeleton-bar" style={{ height: '55%' }} />
      <div className="skeleton-bar" style={{ height: '90%' }} />
    </div>
    <div className="skeleton-labels-row">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="skeleton-x-label" />
      ))}
    </div>
  </div>
);

const PieChartSkeleton = () => (
  <div className="pie-chart-skeleton-wrapper">
    <div className="pie-skeleton" />
    <div className="pie-legend-skeleton">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="skeleton-legend-row">
          <div className="skeleton-legend-dot" />
          <div className="skeleton-legend-label" style={{ width: `${50 + i * 12}%` }} />
        </div>
      ))}
    </div>
  </div>
);

const LineChartSkeleton = () => (
  <div className="line-chart-skeleton-wrapper">
    <div className="line-skeleton-y-axis">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="skeleton-y-label" />
      ))}
    </div>
    <div className="line-skeleton-area">
      <div className="line-skeleton-wave">
        <svg viewBox="0 0 300 80" width="100%" preserveAspectRatio="none">
          <defs>
            <linearGradient id="lineSkeletonGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#e8e8e8" />
              <stop offset="50%" stopColor="#d0d0d0" />
              <stop offset="100%" stopColor="#e8e8e8" />
            </linearGradient>
          </defs>
          <path
            d="M0 55 Q40 35 80 45 Q120 55 160 28 Q200 8 240 32 Q270 48 300 25"
            stroke="url(#lineSkeletonGrad)"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <div className="skeleton-x-labels-row">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="skeleton-x-label" />
        ))}
      </div>
    </div>
  </div>
);

/* ─────────────────────────────────────────────────────
   BAR COLORS — one distinct colour per rank
───────────────────────────────────────────────────── */
const BAR_COLORS = [
  'linear-gradient(180deg, #4CAF50 0%, #245421 100%)',
  'linear-gradient(180deg, #22C55E 0%, #15803D 100%)',
  'linear-gradient(180deg, #16A34A 0%, #14532D 100%)',
  'linear-gradient(180deg, #4ADE80 0%, #16A34A 100%)',
  'linear-gradient(180deg, #86EFAC 0%, #22C55E 100%)',
  'linear-gradient(180deg, #6EE7B7 0%, #059669 100%)',
  'linear-gradient(180deg, #34D399 0%, #065F46 100%)',
];

/* ═══════════════════════════════════════════════════
   BAR CHART
═══════════════════════════════════════════════════ */
export const BarChart = ({ title, data, loading = false }) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const containerRef = useRef(null);
  const [tooltipStyle, setTooltipStyle] = useState({});

  const hasData = Array.isArray(data) && data.length > 0;
  const rawMax = hasData ? Math.max(...data.map(d => d.value), 1) : 0;
  const { max: niceMax, ticks: yTicks } = computeYAxis(rawMax);

  const handleBarMouseEnter = (e, index) => {
    const container = containerRef.current;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const barRect = e.currentTarget.getBoundingClientRect();
    setTooltipStyle({
      left: barRect.left - containerRect.left + barRect.width / 2,
      top: barRect.top - containerRect.top,
    });
    setHoveredIndex(index);
  };

  const handleBarMouseLeave = () => setHoveredIndex(null);

  return (
    <div className="most-scanned-crops-container" ref={containerRef}>
      <h3 className="chart-title">{title}</h3>

      {loading ? (
        <ChartSkeleton />
      ) : !hasData ? (
        <EmptyChartState message="No crop scan data recorded yet" />
      ) : (
        <div className="most-scanned-crops-chart">
          {hoveredIndex !== null && (
            <div
              className="chart-tooltip bar-chart-tooltip"
              style={{ left: tooltipStyle.left, top: tooltipStyle.top }}
            >
              <span className="chart-tooltip-label">{data[hoveredIndex].label}</span>
              <span className="chart-tooltip-value">{data[hoveredIndex].value.toLocaleString()} scans</span>
              <span className="chart-tooltip-arrow" />
            </div>
          )}

          {/* Y-axis: always 5 distinct ticks */}
          <div className="y-axis-labels">
            {yTicks.map((v, i) => (
              <span key={i} className="y-label">
                {v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
              </span>
            ))}
          </div>

          <div className="chart-area">
            <div className="grid-lines-container">
              <div className="grid-line" />
              <div className="grid-line" />
              <div className="grid-line" />
              <div className="grid-line" />
              <div className="grid-line" />
            </div>

            <div className="bars-container">
              {data.map((item, index) => {
                const heightPct = niceMax > 0 ? (item.value / niceMax) * 100 : 0;
                const isHovered = hoveredIndex === index;
                return (
                  <div
                    key={index}
                    className={`bar-group${isHovered ? ' bar-group--hovered' : ''}`}
                    onMouseEnter={(e) => handleBarMouseEnter(e, index)}
                    onMouseLeave={handleBarMouseLeave}
                  >
                    {/* Value badge floats above bar */}
                    <span
                      className="bar-value-badge"
                      style={{ opacity: isHovered ? 1 : 0 }}
                    >
                      {item.value.toLocaleString()}
                    </span>
                    <div
                      className={`crop-bar${isHovered ? ' crop-bar--hovered' : ''}`}
                      style={{
                        height: `${Math.max(heightPct, 2)}%`,
                        background: BAR_COLORS[index % BAR_COLORS.length],
                      }}
                    />
                    <span className="bar-label">{item.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════
   PIE CHART (unchanged)
═══════════════════════════════════════════════════ */
export const PieChart = ({ title, data = [], loading = false }) => {
  const colors = [
    "#4CAF50", "#8159E1", "#2196F3",
    "#6B7280", "#FF9800", "#E91E63"
  ];

  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [tooltipStyle, setTooltipStyle] = useState({});
  const wrapperRef = useRef(null);

  const hasData = Array.isArray(data) && data.length > 0;

  const handleSliceMouseMove = (e, index) => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const wrapperRect = wrapper.getBoundingClientRect();
    setTooltipStyle({
      left: e.clientX - wrapperRect.left,
      top: e.clientY - wrapperRect.top,
    });
    setHoveredIndex(index);
  };

  const handleSliceMouseLeave = () => setHoveredIndex(null);

  return (
    <div className="top-diseases-container">
      <h3 className="chart-title">{title}</h3>

      {loading ? (
        <div className="chart-empty-state">
          <PieChartSkeleton />
        </div>
      ) : (
        <div className="top-diseases-content">
          <div className="diseases-pie-chart-wrapper" ref={wrapperRef}>
            <svg className="diseases-pie-chart" viewBox="0 0 171 171" style={{ overflow: 'visible' }}>
              {!hasData ? (
                <circle cx="85.5" cy="85.5" r="85.5" fill="#E5E7EB" />
              ) : data.length === 1 ? (
                <>
                  <circle
                    cx="85.5" cy="85.5" r="85.5"
                    fill={colors[0]}
                    className="pie-slice pie-slice--hovered"
                    onMouseMove={(e) => handleSliceMouseMove(e, 0)}
                    onMouseLeave={handleSliceMouseLeave}
                  />
                  <text x="85.5" y="85.5" textAnchor="middle" dominantBaseline="middle"
                    fontSize="9.5" fill="white" fontWeight="700" fontFamily="Inter, sans-serif"
                    style={{ pointerEvents: 'none' }}>
                    100%
                  </text>
                </>
              ) : (
                <>
                  {data.map((segment, index) => (
                    <path
                      key={index}
                      d={segment.path}
                      fill={colors[index % colors.length]}
                      className={`pie-slice${hoveredIndex === index ? ' pie-slice--hovered' : ''}`}
                      onMouseMove={(e) => handleSliceMouseMove(e, index)}
                      onMouseLeave={handleSliceMouseLeave}
                    />
                  ))}
                  {data.map((segment, index) => {
                    if (parseFloat(segment.percentage) < 5) return null;
                    const midAngle = (segment.startAngle + segment.endAngle) / 2;
                    const midRad = (midAngle - 90) * (Math.PI / 180);
                    const r = 85.5;
                    const lx = r + r * 0.6 * Math.cos(midRad);
                    const ly = r + r * 0.6 * Math.sin(midRad);
                    return (
                      <text key={`label-${index}`} x={lx} y={ly}
                        textAnchor="middle" dominantBaseline="middle"
                        fontSize="9.5" fill="white" fontWeight="700" fontFamily="Inter, sans-serif"
                        style={{ pointerEvents: 'none' }}>
                        {segment.percentage}%
                      </text>
                    );
                  })}
                </>
              )}
            </svg>

            {hoveredIndex !== null && hasData && (
              <div
                className="chart-tooltip pie-chart-tooltip pie-tooltip-overlay"
                style={{ left: tooltipStyle.left, top: tooltipStyle.top }}
              >
                <div className="pie-tooltip-header-row">
                  <span className="pie-tooltip-color-dot"
                    style={{ backgroundColor: colors[hoveredIndex % colors.length] }} />
                  <span className="chart-tooltip-label">
                    {data[hoveredIndex].name || data[hoveredIndex].label}
                  </span>
                </div>
                <span className="chart-tooltip-value">{data[hoveredIndex].percentage}%</span>
              </div>
            )}
          </div>

          <div className="diseases-legend">
            {!hasData ? (
              <div className="diseases-legend-item">
                <div className="legend-color-bar" style={{ backgroundColor: '#E5E7EB' }} />
                <span className="legend-text" style={{ color: '#9CA3AF' }}>No disease data recorded yet</span>
              </div>
            ) : (
              data.map((segment, index) => (
                <div
                  key={index}
                  className={`diseases-legend-item${hoveredIndex === index ? ' diseases-legend-item--hovered' : ''}`}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  <div className="legend-color-bar"
                    style={{ backgroundColor: colors[index % colors.length] }} />
                  <span className="legend-text">{segment.name || segment.label}</span>
                  <span className="pie-slice-percentage">{segment.percentage}%</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════
   LINE CHART
═══════════════════════════════════════════════════ */
export const LineChart = ({ title, labels = [], values = [], loading = false }) => {
  const hasData = Array.isArray(values) && values.length > 0 && values.some(v => v > 0);
  const rawMax = hasData ? Math.max(...values) : 0;

  // Use niceMax for both the y-axis labels AND the SVG path — they must match
  const { max: niceMax, ticks: yAxisTicks } = computeYAxis(rawMax);

  const [tooltip, setTooltip] = useState(null);
  const chartAreaRef = useRef(null);

  const SVG_W = 1000;
  const SVG_H = 139;

  // Build points scaled to niceMax
  const buildPoints = (vals) =>
    vals.map((v, i) => ({
      x: vals.length > 1 ? (i / (vals.length - 1)) * SVG_W : SVG_W / 2,
      y: SVG_H - (Math.max(v, 0) / niceMax) * SVG_H,
    }));

  const linePath = hasData ? buildSmoothLine(buildPoints(values)) : '';
  const areaPath = hasData ? buildSmoothArea(buildPoints(values), SVG_H) : '';

  // Dot position as percentage for CSS overlay
  const getDotPosition = (index) => {
    if (!hasData || values.length === 0) return { xPct: 0, yPct: 0 };
    const xPct = values.length > 1 ? (index / (values.length - 1)) * 100 : 50;
    const yPct = (1 - Math.max(values[index], 0) / niceMax) * 100;
    return { xPct, yPct };
  };

  const handleChartMouseMove = (e) => {
    const area = chartAreaRef.current;
    if (!area || !hasData || values.length < 2) return;
    const rect = area.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, relX / rect.width));
    const index = Math.round(percent * (values.length - 1));
    const { xPct, yPct } = getDotPosition(index);
    setTooltip({ index, xPct, yPct, label: labels[index] || '', value: values[index] });
  };

  const handleChartMouseLeave = () => setTooltip(null);

  return (
    <div className="disease-trend-container">
      <h3 className="chart-title">{title}</h3>

      {loading ? (
        <LineChartSkeleton />
      ) : !hasData ? (
        <EmptyChartState message="No trend data recorded yet" />
      ) : (
        <div className="disease-trend-chart">
          {/* Y-axis: always 5 distinct ticks, aligned with SVG scale */}
          <div className="y-axis-labels">
            {yAxisTicks.map((val, i) => (
              <span key={i} className="y-label">
                {val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}
              </span>
            ))}
          </div>

          <div
            className="chart-area line-chart-interactive-area"
            ref={chartAreaRef}
            onMouseMove={handleChartMouseMove}
            onMouseLeave={handleChartMouseLeave}
          >
            <div className="grid-lines-container">
              <div className="grid-line" />
              <div className="grid-line" />
              <div className="grid-line" />
              <div className="grid-line" />
              <div className="grid-line" />
            </div>

            {tooltip && (
              <div className="line-chart-crosshair" style={{ left: `${tooltip.xPct}%` }} />
            )}
            {tooltip && (
              <div className="line-chart-dot"
                style={{ left: `${tooltip.xPct}%`, top: `${tooltip.yPct}%` }} />
            )}
            {tooltip && (
              <div
                className={`chart-tooltip line-chart-tooltip disease-trend-tooltip${tooltip.xPct > 75 ? ' line-chart-tooltip--left' : ''}`}
                style={{ left: `${tooltip.xPct}%`, top: `${tooltip.yPct}%` }}
              >
                <span className="disease-trend-tooltip-period">{tooltip.label}</span>
                <div className="disease-trend-tooltip-row">
                  <span className="disease-trend-tooltip-dot" />
                  <span className="disease-trend-tooltip-count">{tooltip.value} cases</span>
                </div>
              </div>
            )}

            <svg
              className="disease-trend-line-chart"
              viewBox={`0 0 ${SVG_W} ${SVG_H}`}
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="diseaseTrendAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FF1807" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#FF1807" stopOpacity="0.01" />
                </linearGradient>
              </defs>

              {/* Area fill */}
              <path
                d={areaPath}
                fill="url(#diseaseTrendAreaGrad)"
              />

              {/* Line */}
              <path
                d={linePath}
                stroke="#FF1807"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />

              {/* Data dots */}
              {buildPoints(values).map((pt, i) => (
                <circle
                  key={i}
                  cx={pt.x}
                  cy={pt.y}
                  r={tooltip?.index === i ? 5 : 3}
                  fill="#FF1807"
                  stroke="white"
                  strokeWidth="1.5"
                  opacity={tooltip?.index === i ? 1 : 0.55}
                />
              ))}
            </svg>
          </div>

          <div className="x-axis-labels">
            {labels.map((label, index) => (
              <span key={index} className="x-label">{label}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
