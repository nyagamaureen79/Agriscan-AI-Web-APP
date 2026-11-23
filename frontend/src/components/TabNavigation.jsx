import React from 'react';

const TabNavigation = ({ activeTab, setActiveTab }) => {
  const tabs = [
    'Disease Detection',
    'Emission Analytics',
    'Carbon Sequestration',
    'User Engagement',
    'Usage Analytics',
  ];

  return (
    <div className="tab-navigationag">
      {tabs.map((tab) => (
        <button
          key={tab}
          className={`tab-buttonag ${activeTab === tab ? 'active' : ''}`}
          onClick={() => setActiveTab(tab)}
        >
          {tab}
        </button>
      ))}
    </div>
  );
};

export default TabNavigation;
