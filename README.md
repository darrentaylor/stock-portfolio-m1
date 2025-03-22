# Stock Analysis Dashboard

A comprehensive stock analysis platform that provides real-time technical analysis, fundamental data, and AI-powered insights.

## Features

- Real-time stock price monitoring and charting
- Technical indicators (RSI, MACD, Bollinger Bands, ADX, ATR)
- Market sentiment analysis from news and social media
- Dividend analysis and metrics
- AI-powered trading recommendations
- Market indices tracking
- Comprehensive news aggregation

## Technical Stack

- **Frontend**: React 18 with TypeScript
- **Styling**: Tailwind CSS with Typography plugin
- **Charting**: Lightweight Charts
- **Icons**: Lucide React
- **Data Sources**: 
  - Alpha Vantage API (Stock data)
  - Polygon.io (Market data and news)
  - Google Generative AI (Analysis)

## Project Structure

```
src/
├── components/           # React components
│   ├── Chart.tsx        # Technical analysis charts
│   ├── NewsSection.tsx  # Stock-specific news
│   ├── MarketNews.tsx   # General market news
│   └── ...
├── services/            # Business logic and API calls
│   ├── stockService.ts  # Stock data fetching
│   ├── aiService.ts     # AI analysis generation
│   ├── indicators/      # Technical indicators
│   └── validation/      # Prediction validation
└── types.ts            # TypeScript type definitions
```

## Environment Variables

Required environment variables:
```
VITE_ALPHA_VANTAGE_KEY=your_key
VITE_GEMINI_API_KEY=your_key
VITE_POLYGON_API_KEY=your_key
```

## Development

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

## Key Components

### Chart Component
- Interactive price chart with multiple timeframes
- Technical indicators overlay
- Volume analysis
- Custom tooltips

### Analysis Renderer
- Markdown rendering with syntax highlighting
- Responsive tables
- Custom styling for recommendations
- Technical indicator formatting

### Market Data Components
- Real-time market indices tracking
- News aggregation and sentiment analysis
- Dividend analysis and metrics

## API Integration

### Alpha Vantage
- Stock price data
- Technical indicators
- Company fundamentals

### Polygon.io
- Real-time market data
- News articles
- Company information

### Google Generative AI
- Natural language analysis
- Trading recommendations
- Pattern recognition

## Validation Framework

The application includes a comprehensive validation framework for AI predictions:

- Historical backtesting
- Confidence intervals
- Performance metrics
- Error analysis

## Next Steps

The application is ready for the following enhancements:

1. Portfolio Management
   - Position tracking
   - Performance analytics
   - Risk management

2. Advanced Analytics
   - Options analysis
   - Correlation studies
   - Sector analysis

3. User Experience
   - Customizable dashboards
   - Alert system
   - Mobile optimization

4. Data Integration
   - Additional data sources
   - Real-time websockets
   - Historical data expansion