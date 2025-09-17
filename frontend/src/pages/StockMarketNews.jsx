import { useEffect, useState } from 'react';
import { NewsCard } from '../components/NewsCard';

export function StockMarketNews() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchNews() {
      try {
        const res = await fetch('http://localhost:5000/api/news');
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        // Check if response is JSON
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const text = await res.text();
          throw new Error(`Expected JSON but got: ${text.substring(0, 100)}`);
        }
        
        const data = await res.json();
        setNews(data.feed || []);
      } catch (err) {
        console.error('Failed to fetch news:', err);
        setError('Could not load stock news. Please try again later.');
      } finally {
        setLoading(false);
      }
    }
    fetchNews();
  }, []);

  // ... rest of the component remains the same

  if (loading) {
    return <p className="p-8 text-gray-500">Loading stock news...</p>;
  }

  if (error) {
    return <p className="p-8 text-red-500">{error}</p>;
  }

  const topNews = news[0];
  const sidebarNews = news.slice(1, 4);
  const gridNews = news.slice(4);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-bold mb-8">Stock Market News</h1>

      {/* Top Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        {/* Top Story */}
        <div className="lg:col-span-2">
          {topNews && (
            <a href={topNews.url} target="_blank" rel="noopener noreferrer">
              <div className="bg-white shadow-md rounded-xl overflow-hidden">
                <img src={topNews.banner_image} alt={topNews.title} className="w-full h-64 object-cover" />
                <div className="p-6">
                  <h2 className="text-2xl font-semibold mb-2">{topNews.title}</h2>
                  <p className="text-gray-700 mb-4">{topNews.summary}</p>
                  <p className="text-sm text-gray-500">
                    {topNews.source} • {new Date(topNews.time_published).toLocaleString()}
                  </p>
                </div>
              </div>
            </a>
          )}
        </div>

        {/* Sidebar News */}
        <div className="flex flex-col gap-6">
          {sidebarNews.map((item, idx) => (
            <a key={idx} href={item.url} target="_blank" rel="noopener noreferrer">
              <div className="bg-white rounded-lg shadow-sm overflow-hidden flex gap-4">
                <img src={item.banner_image} alt={item.title} className="w-24 h-24 object-cover" />
                <div className="p-2">
                  <h3 className="font-semibold text-md mb-1">{item.title}</h3>
                  <p className="text-sm text-gray-600 line-clamp-2">{item.summary}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {item.source} • {new Date(item.time_published).toLocaleString()}
                  </p>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Grid News */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {gridNews.map((item, idx) => (
          <a key={idx} href={item.url} target="_blank" rel="noopener noreferrer">
            <div className="bg-white shadow-sm rounded-lg overflow-hidden">
              <img src={item.banner_image} alt={item.title} className="w-full h-40 object-cover" />
              <div className="p-4">
                <h3 className="font-medium text-lg mb-1">{item.title}</h3>
                <p className="text-sm text-gray-600 line-clamp-2">{item.summary}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {item.source} • {new Date(item.time_published).toLocaleString()}
                </p>
              </div>
            </div>
          </a>
        ))}
      </div>
    </main>
  );
}
