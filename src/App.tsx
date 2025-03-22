import React, { useState, useEffect } from 'react';
import { Search, Loader2, LayoutDashboard, LineChart } from 'lucide-react';
import { Chart } from './components/Chart';
import { NewsSection } from './components/NewsSection';
import { MarketNewsSection } from './components/MarketNewsSection';
import { MarketIndices } from './components/MarketIndices';
import { DividendAnalysis } from './components/DividendAnalysis';
import { AnalysisRenderer } from './components/AnalysisRenderer';
import { PortfolioView } from './components/PortfolioView';
import { fetchStockData, fetchNews, fetchMarketNews, fetchMarketIndices, calculateIndicators } from './services/stockService';
import { fetchDividendData } from './services/dividendService';
import { generateAnalysis } from './services/aiService';
import { StockData, NewsItem, TechnicalIndicators, MarketNews, MarketIndex, DividendData } from './types';

type View = 'stocks' | 'portfolio';

function App() {
  const [view, setView] = useState<View>('stocks');
  const [symbol, setSymbol] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [stockData, setStockData] = useState<StockData[]>([]);
  const [indicators, setIndicators] = useState<TechnicalIndicators | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [marketNews, setMarketNews] = useState<MarketNews[]>([]);
  const [analysis, setAnalysis] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [indices, setIndices] = useState<MarketIndex[]>([]);
  const [indicesLoading, setIndicesLoading] = useState<boolean>(false);
  const [indicesError, setIndicesError] = useState<string>('');
  const [dividendData, setDividendData] = useState<DividendData | null>(null);
  const [dividendLoading, setDividendLoading] = useState<boolean>(false);
  const [analysisLoading, setAnalysisLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetchInitialData = async () => {
      await Promise.all([
        refreshMarketIndices(),
        getMarketNews()
      ]);
    };
    fetchInitialData();
  }, []);

  const getMarketNews = async () => {
    try {
      const news = await fetchMarketNews();
      setMarketNews(news);
    } catch (error) {
      console.error('Error fetching market news:', error);
    }
  };

  const refreshMarketIndices = async () => {
    setIndicesLoading(true);
    setIndicesError('');
    try {
      const data = await fetchMarketIndices();
      setIndices(data);
    } catch (error) {
      setIndicesError(error instanceof Error ? error.message : 'Unable to fetch market indices');
      console.error('Error fetching market indices:', error);
    } finally {
      setIndicesLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol) return;

    setLoading(true);
    setError('');
    setDividendLoading(true);
    setDividendData(null);
    setAnalysis('');
    setAnalysisLoading(false);
    
    try {
      sessionStorage.setItem('currentSymbol', symbol);
      
      const [stockData, newsData] = await Promise.all([
        fetchStockData(symbol),
        fetchNews(symbol)
      ]);

      const technicalIndicators = await calculateIndicators(stockData);
      
      setStockData(stockData);
      setIndicators(technicalIndicators);
      setNews(newsData);

      try {
        const dividendInfo = await fetchDividendData(symbol);
        setDividendData(dividendInfo);
      } catch (dividendError) {
        console.error('Error fetching dividend data:', dividendError);
      } finally {
        setDividendLoading(false);
      }

      setAnalysisLoading(true);
      try {
        const aiAnalysis = await generateAnalysis(
          symbol,
          stockData,
          technicalIndicators,
          newsData,
          marketNews,
          indices,
          dividendData
        );
        setAnalysis(aiAnalysis);
      } catch (analysisError) {
        console.error('Error generating analysis:', analysisError);
        setError(analysisError instanceof Error ? analysisError.message : 'An error occurred while generating analysis');
      } finally {
        setAnalysisLoading(false);
      }
      
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred while fetching data');
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-gray-900">
            {view === 'stocks' ? 'Stock Analysis Dashboard' : 'M1 Portfolio Management'}
          </h1>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setView('stocks')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                view === 'stocks'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <LineChart className="h-5 w-5" />
              <span>Stock Analysis</span>
            </button>
            <button
              onClick={() => setView('portfolio')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                view === 'portfolio'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <LayoutDashboard className="h-5 w-5" />
              <span>M1 Portfolio</span>
            </button>
          </div>
        </div>

        <MarketIndices
          indices={indices}
          onRefresh={refreshMarketIndices}
          loading={indicesLoading}
          error={indicesError}
        />

        {view === 'stocks' ? (
          <>
            <form onSubmit={handleSearch} className="mb-8">
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                    placeholder="Enter stock symbol (e.g., AAPL)"
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <Search className="absolute right-3 top-2.5 text-gray-400" />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin h-5 w-5" />
                      <span>Analyzing...</span>
                    </>
                  ) : (
                    'Analyze'
                  )}
                </button>
              </div>
            </form>

            {error && (
              <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {error}
              </div>
            )}

            <div className="space-y-8">
              <MarketNewsSection news={marketNews} />

              {stockData.length > 0 && indicators && (
                <>
                  <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-2xl font-bold mb-4">Price Chart & Indicators</h2>
                    <Chart data={stockData} indicators={indicators} />
                  </div>

                  {analysisLoading ? (
                    <div className="bg-white p-6 rounded-lg shadow-md">
                      <h2 className="text-2xl font-bold mb-4">AI Analysis</h2>
                      <div className="flex items-center justify-center h-32">
                        <div className="flex flex-col items-center gap-3">
                          <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
                          <p className="text-gray-600">Generating comprehensive analysis...</p>
                        </div>
                      </div>
                    </div>
                  ) : analysis && (
                    <div className="bg-white p-6 rounded-lg shadow-md">
                      <AnalysisRenderer content={analysis} />
                    </div>
                  )}

                  <DividendAnalysis data={dividendData} loading={dividendLoading} />

                  <NewsSection news={news} />
                </>
              )}
            </div>
          </>
        ) : (
          <PortfolioView />
        )}
      </div>
    </div>
  );
}

export default App;