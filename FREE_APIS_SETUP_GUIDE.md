# 🚀 Free APIs for Automatic Content Generation

## Overview

This guide shows you how to set up **completely free APIs** that will automatically generate fresh, relevant content for your startup tracker every hour. These APIs will provide real-time data that AI can then convert into professional articles.

## 📊 **Free APIs by Category**

### 🗞️ **1. NEWS & ARTICLES APIs**

#### **NewsAPI** - ⭐ Best for startup news
- **Free Tier**: 1,000 requests/day
- **Coverage**: 80,000+ news sources worldwide
- **Setup**: 
  ```bash
  # Get free API key from: https://newsapi.org/register
  VITE_NEWSAPI_KEY=your_newsapi_key_here
  ```
- **What it provides**: Latest startup funding news, acquisitions, product launches

#### **Reddit API** - 🆓 Completely Free
- **Free Tier**: Unlimited (with rate limits)
- **Coverage**: r/startups, r/entrepreneur, r/venturecapital
- **Setup**: No API key needed!
- **What it provides**: Community discussions, startup stories, trending topics

#### **Hacker News API** - 🆓 Completely Free
- **Free Tier**: Unlimited
- **Coverage**: Tech startup stories, trending discussions
- **Setup**: No API key needed!
- **What it provides**: Top tech stories, startup launches, community insights

### 💰 **2. FUNDING & COMPANY DATA APIs**

#### **GitHub API** - 🆓 5,000 requests/hour (authenticated)
- **Free Tier**: 5,000/hour with token, 60/hour without
- **Coverage**: Trending repositories, new projects
- **Setup**:
  ```bash
  # Get token from: https://github.com/settings/tokens
  VITE_GITHUB_TOKEN=your_github_token_here
  ```
- **What it provides**: Trending startups, open source projects, developer activity

#### **Product Hunt API** - 🆓 Free tier available
- **Free Tier**: 1,000 requests/day
- **Coverage**: Daily product launches, startup showcases
- **Setup**:
  ```bash
  # Get API key from: https://api.producthunt.com/v2/oauth/applications
  VITE_PRODUCTHUNT_TOKEN=your_producthunt_token_here
  ```
- **What it provides**: New product launches, startup showcases, voting data

#### **Alpha Vantage** - 🆓 500 requests/day
- **Free Tier**: 500 requests/day
- **Coverage**: Stock market data, financial indicators
- **Setup**:
  ```bash
  # Get free API key from: https://www.alphavantage.co/support/#api-key
  VITE_ALPHAVANTAGE_KEY=your_alphavantage_key_here
  ```
- **What it provides**: Market trends, IPO data, financial insights

### 🎉 **3. EVENTS APIs**

#### **Eventbrite API** - 🆓 Free tier available
- **Free Tier**: 1,000 requests/hour
- **Coverage**: Tech conferences, startup events, demo days
- **Setup**:
  ```bash
  # Get token from: https://www.eventbrite.com/platform/api-keys
  VITE_EVENTBRITE_TOKEN=your_eventbrite_token_here
  ```
- **What it provides**: Upcoming tech events, conferences, networking events

### 🤖 **4. AI ENHANCEMENT APIs**

#### **Hugging Face** - ⭐ Best free AI API
- **Free Tier**: 30,000 characters/month
- **Models**: BART, GPT-2, T5, and more
- **Setup**:
  ```bash
  # Get free token from: https://huggingface.co/settings/tokens
  VITE_HUGGINGFACE_TOKEN=your_huggingface_token_here
  ```
- **What it provides**: Article summarization, content enhancement, text generation

#### **Cohere** - 🆓 Free tier
- **Free Tier**: 100 API calls/month
- **Coverage**: Text generation, summarization
- **Setup**:
  ```bash
  # Get free API key from: https://dashboard.cohere.ai/api-keys
  VITE_COHERE_KEY=your_cohere_key_here
  ```

#### **OpenAI Alternative - Together AI** - 🆓 Free credits
- **Free Tier**: $25 free credits monthly
- **Models**: Llama, Mistral, Code Llama
- **Setup**:
  ```bash
  # Get API key from: https://api.together.xyz/settings/api-keys
  VITE_TOGETHER_KEY=your_together_key_here
  ```

## 🛠️ **Quick Setup Instructions**

### 1. **Create Environment File**
Create `.env` file in your project root:

```bash
# News APIs
VITE_NEWSAPI_KEY=your_newsapi_key_here

# Social & Community APIs  
# Reddit and Hacker News don't need keys!

# Development & Product APIs
VITE_GITHUB_TOKEN=your_github_token_here
VITE_PRODUCTHUNT_TOKEN=your_producthunt_token_here

# Financial APIs
VITE_ALPHAVANTAGE_KEY=your_alphavantage_key_here

# Events APIs
VITE_EVENTBRITE_TOKEN=your_eventbrite_token_here

# AI Enhancement APIs
VITE_HUGGINGFACE_TOKEN=your_huggingface_token_here
VITE_COHERE_KEY=your_cohere_key_here
VITE_TOGETHER_KEY=your_together_key_here
```

### 2. **Install Required Packages**
```bash
npm install
# All required packages are already in your package.json
```

### 3. **Start the Content Scheduler**
The content scheduler automatically starts when your app loads and:
- ✅ Fetches fresh content every hour
- ✅ Updates news every 30 minutes  
- ✅ Refreshes trending topics every 15 minutes
- ✅ Updates events every 4 hours
- ✅ Enhances content with AI

## 📈 **Content Generation Schedule**

| Content Type | Frequency | API Sources | AI Enhancement |
|-------------|-----------|-------------|----------------|
| **News Articles** | Every 30 min | NewsAPI, Reddit, Hacker News | ✅ Hugging Face |
| **Trending Topics** | Every 15 min | GitHub, Product Hunt | ✅ Local processing |
| **Events** | Every 4 hours | Eventbrite | ✅ Content templates |
| **Market Data** | Every 2 hours | Alpha Vantage | ✅ Analysis generation |
| **Full Refresh** | Every hour | All APIs | ✅ Complete AI enhancement |

## 🎯 **API Key Acquisition Guide**

### **NewsAPI** (5 minutes)
1. Go to [newsapi.org/register](https://newsapi.org/register)
2. Sign up with email
3. Verify email
4. Copy API key from dashboard
5. Add to `.env` as `VITE_NEWSAPI_KEY`

### **GitHub Token** (2 minutes)
1. Go to [github.com/settings/tokens](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Select "public_repo" scope
4. Copy token
5. Add to `.env` as `VITE_GITHUB_TOKEN`

### **Hugging Face Token** (3 minutes)
1. Go to [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
2. Create account if needed
3. Click "New token"
4. Choose "Read" role
5. Copy token
6. Add to `.env` as `VITE_HUGGINGFACE_TOKEN`

### **Product Hunt API** (5 minutes)
1. Go to [api.producthunt.com/v2/oauth/applications](https://api.producthunt.com/v2/oauth/applications)
2. Create new application
3. Get client credentials
4. Add to `.env` as `VITE_PRODUCTHUNT_TOKEN`

## 🔄 **How It Works**

### **1. Automatic Content Fetching**
```typescript
// Content scheduler runs every hour
contentScheduler.start(); // Automatically starts on app load

// Manual refresh if needed
await contentScheduler.manualRefresh('news');
```

### **2. AI Content Enhancement**
```typescript
// Raw API data gets enhanced with AI
const rawContent = await newsAPI.getStartupNews();
const enhancedContent = await aiEnhancer.enhanceContent(rawContent, 'article');
```

### **3. Real-Time Updates**
```typescript
// Your components automatically get fresh content
const { data: content } = usePageContent('home');
// Content refreshes automatically every hour!
```

## 🎨 **Content Examples**

### **Generated News Articles**
- "TechFlow raises $25M in Series A funding led by Sequoia Capital"
- "DataVault launches revolutionary AI-powered analytics platform"
- "CloudNinja acquires DevStream to strengthen SaaS offering"

### **Trending Topics**
- AI Startups, Climate Tech, Fintech Innovation
- Series A funding, IPO announcements
- Product launches, Acquisitions

### **Events**
- TechCrunch Disrupt San Francisco 2024
- Y Combinator Demo Day
- Startup Grind Global Conference

## 🚨 **Rate Limits & Best Practices**

### **Built-in Rate Limiting**
```typescript
// Automatic rate limiting prevents API quota exhaustion
if (!rateLimiter.canMakeRequest('newsapi', 100, 24 * 60 * 60 * 1000)) {
  // Skip request if limit reached
}
```

### **Fallback Systems**
- If one API fails, others continue working
- Local content generation as backup
- Graceful error handling with user notifications

### **Caching Strategy**
- 5-minute cache for performance
- 2-hour cache for enhanced content
- localStorage backup for offline mode

## 🎯 **Expected Results**

With all APIs configured, your startup tracker will automatically populate with:

- **📰 50+ fresh news articles** every hour
- **🚀 30+ trending repositories/products** every hour  
- **🎉 20+ upcoming events** every 4 hours
- **📊 Market insights** every 2 hours
- **🤖 AI-enhanced summaries** for top content

## 🆓 **100% Free Tier Limits**

| API | Daily Limit | Monthly Limit | Cost After Free |
|-----|-------------|---------------|-----------------|
| NewsAPI | 1,000 requests | 30,000 | $449/month |
| Reddit | Unlimited* | Unlimited* | Always free |
| Hacker News | Unlimited | Unlimited | Always free |
| GitHub | 5,000/hour | ~3.6M | Always free |
| Hugging Face | 30K chars | 900K chars | $9/month |
| Alpha Vantage | 500/day | 15,000 | $49.99/month |

*With reasonable rate limits

## 🎊 **Final Result**

Your startup tracker becomes a **living, breathing platform** that:
- ✅ Never runs out of content
- ✅ Always shows the latest startup news
- ✅ Automatically discovers trending companies
- ✅ Provides AI-enhanced insights
- ✅ Updates without any manual intervention

**Set it up once, and your website will automatically populate with fresh, relevant startup content forever!** 🚀