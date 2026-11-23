import React from 'react';

const QuickStats = () => {
  const stats = [
    { label: 'Total Plots Monitored', value: '12,456', valueColor: '#323639' },
    { label: 'Health Score', value: '84/100', valueColor: '#21C45D' },
    { label: 'Carbon Reduction', value: '-15.4%', valueColor: '#21C45D' },
    { label: 'Success Payment', value: '138', valueColor: '#323639' },
    { label: 'Beneficiary Farmers', value: '20', valueColor: '#323639' }
  ];

  return (
    <div className="quick-stats">
      <h3 className="quick-stats-title">Quick Stats</h3>
      <div className="stats-listag">
        {stats.map((stat, index) => (
          <div key={index} className="stat-rowag">
            <span className="stat-labelag">{stat.label}</span>
            <span className="stat-valueag" style={{ color: stat.valueColor }}>
              {stat.value}
            </span>
          </div>
        ))}
      </div>
      <button className="view-analytics-btn">
        View Detailed Analytics
      </button>
    </div>
  );
};

export default QuickStats;
