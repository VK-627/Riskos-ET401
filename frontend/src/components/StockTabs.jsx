export function StockTabs({ activeTab, setActiveTab }) {
  const tabs = [
    { id: 'most-active', label: 'Most Active' },
    { id: 'trending-now', label: 'Trending Now' },
    { id: 'top-gainers', label: 'Top Gainers' },
    { id: 'top-losers', label: 'Top Losers' },
  ];

  return (
    <div className="flex space-x-4 border-b">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`pb-2 font-medium ${
            activeTab === tab.id
              ? 'text-teal-600 border-b-2 border-teal-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
