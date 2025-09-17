const axios = require('axios');
const cheerio = require('cheerio');

// Mock fallback data
const mockIndianStockNews = {
  feed: [
    {
      title: "Sensex Breaks 75,000 Mark for First Time in History",
      summary: "The BSE Sensex crossed the historic 75,000 level today...",
      banner_image: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80",
      url: "https://example.com/sensex-75000",
      time_published: "20250418T093000",
      source: "Economic Times"
    },
    // Add other articles here...
  ]
};

// 1. Try NewsAPI
const fetchFromNewsAPI = async () => {
  try {
    const response = await axios.get('https://newsapi.org/v2/everything', {
      params: {
        q: '(Indian AND stock AND market) OR Sensex OR Nifty OR BSE OR NSE',
        language: 'en',
        sortBy: 'publishedAt',
        pageSize: 10,
        apiKey: process.env.NEWS_API_KEY
      },
      timeout: 8000
    });

    return response.data.articles.map(article => ({
      title: article.title,
      summary: article.description || 'No description available',
      banner_image: article.urlToImage || 'https://via.placeholder.com/600x400?text=Market+News',
      url: article.url,
      time_published: article.publishedAt,
      source: article.source?.name || 'Unknown Source'
    }));
  } catch (error) {
    console.error('NewsAPI Error:', error.message);
    return null;
  }
};

// 2. Fallback to Yahoo Finance
const fetchFromYahooFinance = async () => {
  try {
    const response = await axios.get('https://finance.yahoo.com/topic/stock-market-news', {
      headers: {
        'User-Agent': 'Mozilla/5.0'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    const articles = [];

    $('article.js-stream-content').slice(0, 8).each((i, el) => {
      const $el = $(el);
      articles.push({
        title: $el.find('h3').text().trim(),
        summary: $el.find('p').text().trim() || 'Click to read full story',
        banner_image: $el.find('img').attr('src') || 'https://via.placeholder.com/600x400?text=Yahoo+Finance',
        url: `https://finance.yahoo.com${$el.find('a').attr('href')}`,
        time_published: new Date().toISOString(),
        source: 'Yahoo Finance'
      });
    });

    return articles;
  } catch (error) {
    console.error('Yahoo Finance Scraping Error:', error.message);
    return null;
  }
};

// Main function for /api/stock-news
const getStockNews = async (req, res) => {
  console.log('Fetching latest market news...');
  let articles = null;

  if (process.env.NEWS_API_KEY) {
    articles = await fetchFromNewsAPI();
  }

  if ((!articles || articles.length === 0) && !req.query.skipFallback) {
    articles = await fetchFromYahooFinance();
  }

  if (!articles || articles.length === 0) {
    console.log('Using mock data as final fallback');
    articles = mockIndianStockNews.feed;
  }

  res.json({
    feed: articles.slice(0, 6),
    source: articles === mockIndianStockNews.feed ? 'mock' :
      articles.some(a => a.source === 'Yahoo Finance') ? 'yahoo' : 'newsapi'
  });
};

module.exports = { getStockNews };
