# FactCheck - Real-Time News Fact-Checking Chrome Extension

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](package.json)
[![Chrome Extension](https://img.shields.io/badge/chrome-extension-v3-orange)](manifest.json)

FactCheck is a comprehensive Chrome extension that provides real-time fact-checking of news articles as users browse the web. It combines advanced AI analysis with user-friendly features to help combat misinformation and promote media literacy.

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Development](#development)
- [Deployment](#deployment)
- [Testing](#testing)
- [Contributing](#contributing)
- [License](#license)
- [Future Aspects](#future-aspects)

## Features

### Core Functionality
- **Automatic News Detection**: Identifies news websites and articles automatically
- **Real-time Fact-Checking**: Analyzes article content using Google Gemini AI
- **Reliability Scoring**: Provides percentage breakdown (True/False/Unknown)
- **Source Credibility Assessment**: Evaluates news source trustworthiness
- **Bias Detection**: Identifies potential bias in reporting

### Advanced Features
- **Article Summarization**: AI-powered concise summaries
- **Multi-language Translation**: Translate articles to different languages
- **Offline Article Saving**: Store articles for later reading
- **Social Media Sharing**: Share fact-check results on Twitter and Facebook
- **Export Options**: Export reports as JSON or plain text
- **Service Status Monitoring**: Check backend service availability
- **Dark/Light Theme Toggle**: User preference for interface theme

### Technical Features
- **Fallback Mechanisms**: Continues working when backend is unavailable
- **Retry Logic**: Handles network failures gracefully
- **Content Extraction**: Uses Mozilla Readability.js for clean article parsing
- **Cross-platform Compatibility**: Works on all major operating systems
- **Performance Optimized**: Efficient processing with minimal resource usage

## Architecture

### Project Structure

```
factcheck/
├── manifest.json              # Chrome extension manifest (v3)
├── background.js              # Service worker for API calls and logic
├── content.js                 # Content script for article extraction
├── content.css                # Styles for injected content
├── popup.html                 # Extension popup interface
├── popup.js                   # Popup functionality and event handlers
├── popup.css                  # Popup styling with glassmorphism design
├── read-website.js            # CLI tool for testing article extraction
├── package.json               # Node.js dependencies and scripts
├── Dockerfile                 # Container configuration for backend
├── .dockerignore             # Docker ignore patterns
├── .env                      # Environment variables (API keys)
├── images/                   # Extension icons and assets
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
├── landing/                  # Marketing website
│   ├── index.html
│   ├── script.js
│   └── styles.css
├── lib/                      # Third-party libraries
│   └── Readability.js        # Mozilla's article extraction library
└── src/                      # Backend service
    └── index.js              # Express.js API server
```

### System Architecture

The application consists of three main components:

1. **Chrome Extension**: Client-side browser extension
2. **Backend API**: Node.js/Express server for AI processing
3. **Landing Page**: Marketing website for user acquisition

#### Data Flow
```
User visits news site → Extension detects → Content script extracts → Background script processes → API call to backend → Gemini AI analysis → Results displayed in popup
```

## Prerequisites

- **Node.js**: Version 18.0.0 or higher
- **npm**: Latest version
- **Google Chrome**: Version 88+ (for Manifest V3 support)
- **Google Cloud Account**: For Gemini API access
- **Docker**: Optional, for containerized deployment

## Installation

### Chrome Extension Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/factcheck.git
   cd factcheck
   ```

2. **Install dependencies** (for backend):
   ```bash
   npm install
   ```

3. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

4. **Load extension in Chrome**:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the project directory
   - The extension should now appear in your extensions list

### Backend API Setup

1. **Start the backend service**:
   ```bash
   npm start
   # Or for development with auto-reload:
   npm run dev
   ```

2. **Verify service is running**:
   ```bash
   curl http://localhost:8080/
   # Should return: "News Fact-Checker API is running"
   ```

### Docker Deployment (Optional)

```bash
# Build the Docker image
docker build -t factcheck-api .

# Run the container
docker run -p 8080:8080 --env-file .env factcheck-api
```

## Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Google Gemini API Configuration
GEMINI_API_KEY=your_gemini_api_key_here

# Server Configuration
PORT=8080
NODE_ENV=development

# Optional: Backend URL for extension
BACKEND_URL=https://your-deployed-backend.com
```

### Extension Permissions

The extension requires the following Chrome permissions (defined in `manifest.json`):

- `activeTab`: Access current tab for content analysis
- `storage`: Save user preferences and cached data
- `scripting`: Inject content scripts for article extraction
- `https://generativelanguage.googleapis.com/*`: Access Gemini API

### Host Permissions

- `<all_urls>`: Analyze content on any website
- `https://generativelanguage.googleapis.com/*`: Gemini API access

## Usage

### Basic Usage

1. **Install the extension** as described above
2. **Visit a news website** (automatically detected)
3. **Click the extension icon** in the toolbar
4. **View fact-check results** in the popup

### Advanced Features

#### Article Summarization
- Click "Summarize" to get an AI-generated summary
- Useful for long articles or quick overview

#### Translation
- Select target language from dropdown
- Click "Translate" for multi-language support
- Supports 10+ languages including Spanish, French, German, etc.

#### Offline Saving
- Click "Save for Offline" to store articles locally
- Access saved articles even without internet

#### Social Sharing
- Share fact-check results on Twitter or Facebook
- Includes article title, analysis summary, and source credibility

#### Export Options
- **JSON Export**: Complete analysis data for developers
- **Text Export**: Human-readable report format

#### Service Monitoring
- Click "Check Service" to verify backend availability
- Shows real-time status of the fact-checking service

### Visual Indicators

- **Red badge**: News site detected
- **Green results**: High reliability score
- **Yellow/Orange**: Medium credibility
- **Red warnings**: Low credibility or potential misinformation

## API Documentation

### Backend API Endpoints

#### GET /
Health check endpoint.

**Response:**
```json
"News Fact-Checker API is running"
```

#### POST /analyze
Main fact-checking endpoint.

**Request Body:**
```json
{
  "url": "https://example.com/article",
  "text": "Article content here...",
  "html": "<html>...</html>"
}
```

**Response:**
```json
{
  "factCheck": {
    "summary": "Brief article summary",
    "claims": ["Key claim 1", "Key claim 2"],
    "tone": "neutral",
    "misleadingInfo": [],
    "reliabilityScore": 85
  },
  "comparisons": {
    "comparison": [
      {
        "title": "Related Article 1",
        "source": "BBC News",
        "summary": "Summary of related article..."
      }
    ],
    "analysis": "Overall comparison analysis..."
  }
}
```

### Extension Message Protocol

The extension uses Chrome's messaging API for internal communication:

#### Content Script → Background Script
```javascript
{
  type: "ARTICLE_CONTENT",
  article: {
    title: "Article Title",
    textContent: "Full article text...",
    content: "HTML content..."
  }
}
```

#### Background Script → Popup
```javascript
{
  type: "ANALYSIS_RESULT",
  data: { /* analysis results */ },
  articleTitle: "Article Title",
  credibility: "High"
}
```

## Development

### Development Setup

1. **Install development dependencies**:
   ```bash
   npm install
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```

3. **Load extension in development mode**:
   - Follow installation steps above
   - Make changes to code
   - Reload extension in `chrome://extensions/`

### Code Structure

#### Background Script (`background.js`)
- Handles all API communications
- Manages extension state and storage
- Processes article analysis requests
- Implements retry logic and fallbacks

#### Content Script (`content.js`)
- Injects into web pages
- Uses Readability.js for content extraction
- Sends clean article data to background script

