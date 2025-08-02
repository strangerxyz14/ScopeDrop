# 🚀 Real-Time Startup Tracker Setup Instructions

## Overview

Your startup tracker now has a **real-time content system** that automatically fetches fresh content every hour from multiple free APIs. Follow these instructions to set up the APIs and start getting unlimited fresh content.

## 🎯 Quick Start (5 Minutes)

### 1. **Essential APIs** (Get these first for immediate results)

#### **NewsAPI** - 🆓 1,000 requests/day
1. Go to [newsapi.org/register](https://newsapi.org/register)
2. Sign up with your email
3. Verify your email
4. Copy your API key from the dashboard
5. Add to your `.env` file:
   ```bash
   VITE_NEWSAPI_KEY=your_actual_api_key_here
   ```

#### **GitHub API** - 🆓 5,000 requests/hour
1. Go to [github.com/settings/tokens](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Select "public_repo" scope
4. Copy the token
5. Add to your `.env` file:
   ```bash
   VITE_GITHUB_TOKEN=your_actual_token_here
   ```

### 2. **Start the Application**
```bash
npm run dev
```

**That's it!** With just these 2 APIs, you'll get:
- ✅ 1,000+ fresh news articles daily
- ✅ Trending GitHub repositories
- ✅ Real-time content sliding every 3 seconds
- ✅ Automatic refresh every hour

## 🎨 **Visual Features You'll See**

### **Enhanced Hero Section**
- 🌈 **Dynamic gradient backgrounds** that change with content type
- 🔄 **Auto-sliding content** every 3 seconds (right to left)
- ⚡ **Real-time status indicators** showing API configuration
- 🎯 **Interactive slide indicators** for manual navigation
- ✨ **Smooth animations** with framer-motion

### **Vibrant Color Theme**
- 💎 **Enhanced gradients**: Blue → Purple → Pink
- 🌟 **Glowing effects** on hover
- 🎨 **Dynamic backgrounds** that adapt to content
- 🔮 **Glassmorphism cards** with backdrop blur
- 🌈 **Text gradients** for maximum visual appeal

## 🔧 **Complete API Setup** (15 Minutes Total)

### **AI Enhancement APIs**

#### **Hugging Face** - 🆓 30,000 chars/month
1. Go to [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
2. Create account if needed
3. Click "New token" → Choose "Read" role
4. Copy token and add to `.env`:
   ```bash
   VITE_HUGGINGFACE_TOKEN=your_token_here
   ```

#### **Product Hunt** - 🆓 1,000 requests/day
1. Go to [api.producthunt.com/v2/oauth/applications](https://api.producthunt.com/v2/oauth/applications)
2. Create new application
3. Get client credentials
4. Add to `.env`:
   ```bash
   VITE_PRODUCTHUNT_TOKEN=your_token_here
   ```

### **Additional Data Sources**

#### **Alpha Vantage** - 🆓 500 requests/day
1. Go to [alphavantage.co/support/#api-key](https://www.alphavantage.co/support/#api-key)
2. Get free API key
3. Add to `.env`:
   ```bash
   VITE_ALPHAVANTAGE_KEY=your_key_here
   ```

#### **Eventbrite** - 🆓 1,000 requests/hour
1. Go to [eventbrite.com/platform/api-keys](https://www.eventbrite.com/platform/api-keys)
2. Create account and get API key
3. Add to `.env`:
   ```bash
   VITE_EVENTBRITE_TOKEN=your_token_here
   ```

## 📁 **Complete .env File Example**

```bash
# 🚀 Real-Time Content Generation APIs
# Replace 'your_*_here' with actual API keys

# ===== NEWS & ARTICLES APIs =====
VITE_NEWSAPI_KEY=your_newsapi_key_here
# Reddit & Hacker News are free (no keys needed)

# ===== FUNDING & COMPANY DATA APIs =====
VITE_GITHUB_TOKEN=your_github_token_here
VITE_PRODUCTHUNT_TOKEN=your_producthunt_token_here
VITE_ALPHAVANTAGE_KEY=your_alphavantage_key_here

# ===== EVENTS APIs =====
VITE_EVENTBRITE_TOKEN=your_eventbrite_token_here

# ===== AI ENHANCEMENT APIs =====
VITE_HUGGINGFACE_TOKEN=your_huggingface_token_here
VITE_COHERE_KEY=your_cohere_key_here
VITE_TOGETHER_KEY=your_together_key_here

# ===== APP CONFIGURATION =====
VITE_APP_NAME="Startup Tracker"
VITE_APP_DESCRIPTION="Real-time startup news, funding rounds, and market insights"
VITE_APP_URL="http://localhost:5173"
```

## 🎛️ **Content Scheduler Configuration**

The system automatically runs these jobs:

| Job | Frequency | What It Does |
|-----|-----------|--------------|
| **News Refresh** | Every 30 min | Fetches latest startup news |
| **Trending Refresh** | Every 15 min | Updates trending repos/products |
| **Events Refresh** | Every 4 hours | Gets upcoming tech events |
| **Market Data** | Every 2 hours | Updates financial trends |
| **Full Refresh** | Every hour | Complete content update + AI enhancement |

## 🔍 **API Configuration Status**

Visit your homepage to see the **API Configuration Status** component that shows:
- ✅ Which APIs are configured and working
- 📊 Configuration progress percentage
- 🔄 Manual refresh buttons
- 📈 Content scheduler status
- 🎯 Quick setup guide for missing APIs

## 🎉 **Expected Results**

With all APIs configured, your startup tracker will show:

### **Hero Section**
- 🔄 **Auto-sliding content** every 3 seconds
- 📰 Latest startup news articles
- 🚀 Trending GitHub repositories
- 🎉 Upcoming tech events
- 📊 Real-time statistics

### **Content Variety**
- **50+ fresh articles** every hour
- **30+ trending projects** from GitHub/Product Hunt
- **20+ upcoming events** from Eventbrite
- **Market insights** from Alpha Vantage
- **AI-enhanced summaries** from Hugging Face

### **Visual Experience**
- 🌈 **Dynamic gradients** that change with content
- ✨ **Smooth animations** and transitions
- 🎨 **Vibrant color scheme** for maximum appeal
- 🔮 **Glassmorphism effects** and glowing elements
- 📱 **Fully responsive** design

## 🚨 **Troubleshooting**

### **No Content Showing?**
1. Check your `.env` file has the correct API keys
2. Restart your development server: `npm run dev`
3. Check browser console for API errors
4. Verify API keys are valid and not expired

### **Content Not Refreshing?**
1. Check the Content Scheduler Status component
2. Manually refresh using the refresh button
3. Check browser's Network tab for API requests
4. Verify you haven't exceeded API rate limits

### **APIs Not Working?**
1. Make sure API keys don't have quotes around them
2. Check API key permissions and scopes
3. Verify the API endpoints are accessible
4. Some APIs require account verification

## 🎯 **Free Tier Limits**

| API | Daily Limit | What You Get |
|-----|-------------|--------------|
| NewsAPI | 1,000 requests | ~1,000 articles |
| GitHub | 120,000 requests | Unlimited repos |
| Hacker News | Unlimited | Unlimited stories |
| Reddit | Unlimited | Unlimited posts |
| Hugging Face | 30K characters | ~150 AI summaries |
| Product Hunt | 1,000 requests | ~1,000 products |

**Total Daily Content**: 2,000+ fresh items completely free!

## 🚀 **Next Steps**

1. **Set up minimum APIs** (NewsAPI + GitHub) - 5 minutes
2. **Start the app** and see real-time content
3. **Add more APIs** for maximum content variety
4. **Customize the content** in `src/services/contentGenerator.ts`
5. **Deploy your app** to share with the world

## 🎊 **Success!**

Once configured, your startup tracker becomes a **living, breathing platform** that:
- ✅ Never runs out of content
- ✅ Always shows the latest news
- ✅ Automatically discovers trending companies
- ✅ Provides AI-enhanced insights
- ✅ Updates without manual intervention
- ✅ Looks absolutely stunning with vibrant colors

**Your users will see fresh, relevant content every time they visit!** 🌟