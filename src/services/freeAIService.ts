import { NewsArticle, FundingRound, Event } from "@/types/news";

// FREE AI MODELS & PROCESSING
export class FreeAIService {
  
  // 1. LOCAL TEXT PROCESSING - No API calls needed
  private localTextProcessor = {
    // Extract key entities from text
    extractEntities: (text: string): string[] => {
      const entities: string[] = [];
      const words = text.toLowerCase().split(/\s+/);
      
      // Company name patterns
      const companyPatterns = [
        /[A-Z][a-z]+(?:[A-Z][a-z]+)*/g, // CamelCase
        /[A-Z]{2,}/g, // Acronyms
        /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g // Proper nouns
      ];
      
      companyPatterns.forEach(pattern => {
        const matches = text.match(pattern);
        if (matches) {
          entities.push(...matches.filter(match => match.length > 2));
        }
      });
      
      // Funding amounts
      const fundingPatterns = [
        /\$\d+(?:\.\d+)?[MBK]?\b/g, // $1.2M, $500K, etc.
        /\d+(?:\.\d+)?\s*(?:million|billion|thousand)/gi
      ];
      
      fundingPatterns.forEach(pattern => {
        const matches = text.match(pattern);
        if (matches) {
          entities.push(...matches);
        }
      });
      
      return [...new Set(entities)].slice(0, 10);
    },

    // Generate summary using extractive summarization
    generateSummary: (text: string, maxLength: number = 150): string => {
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
      const words = text.toLowerCase().split(/\s+/);
      
      // Simple TF-IDF scoring
      const wordFreq: { [key: string]: number } = {};
      words.forEach(word => {
        if (word.length > 3) {
          wordFreq[word] = (wordFreq[word] || 0) + 1;
        }
      });
      
      // Score sentences based on word frequency
      const sentenceScores = sentences.map(sentence => {
        const sentenceWords = sentence.toLowerCase().split(/\s+/);
        const score = sentenceWords.reduce((sum, word) => {
          return sum + (wordFreq[word] || 0);
        }, 0);
        return { sentence, score };
      });
      
      // Sort by score and take top sentences
      sentenceScores.sort((a, b) => b.score - a.score);
      
      let summary = '';
      for (const { sentence } of sentenceScores) {
        if ((summary + sentence).length <= maxLength) {
          summary += sentence + '. ';
        } else {
          break;
        }
      }
      
      return summary.trim() || text.substring(0, maxLength) + '...';
    },

    // Categorize content using keyword matching
    categorizeContent: (text: string): string => {
      const lowerText = text.toLowerCase();
      
      const categories = {
        'Funding': ['funding', 'series', 'raise', 'investment', 'venture', 'capital', 'round'],
        'Acquisition': ['acquire', 'acquisition', 'merger', 'buyout', 'purchase', 'takeover'],
        'Product Launch': ['launch', 'release', 'product', 'feature', 'announcement'],
        'AI & Tech': ['ai', 'artificial intelligence', 'machine learning', 'ml', 'algorithm'],
        'IPO': ['ipo', 'initial public offering', 'public', 'stock', 'market'],
        'Leadership': ['ceo', 'founder', 'executive', 'leadership', 'appointment'],
        'Partnership': ['partnership', 'collaboration', 'alliance', 'joint venture'],
        'Expansion': ['expand', 'growth', 'international', 'global', 'new market']
      };
      
      for (const [category, keywords] of Object.entries(categories)) {
        if (keywords.some(keyword => lowerText.includes(keyword))) {
          return category;
        }
      }
      
      return 'General';
    },

    // Extract sentiment (positive/negative/neutral)
    analyzeSentiment: (text: string): 'positive' | 'negative' | 'neutral' => {
      const positiveWords = [
        'success', 'growth', 'profit', 'revenue', 'funding', 'investment', 'launch',
        'innovation', 'breakthrough', 'partnership', 'expansion', 'acquisition',
        'positive', 'strong', 'excellent', 'amazing', 'incredible', 'revolutionary'
      ];
      
      const negativeWords = [
        'failure', 'loss', 'decline', 'bankruptcy', 'layoff', 'shutdown', 'closure',
        'negative', 'weak', 'poor', 'terrible', 'disappointing', 'struggling',
        'downsizing', 'restructuring', 'losses', 'debt'
      ];
      
      const lowerText = text.toLowerCase();
      const words = lowerText.split(/\s+/);
      
      let positiveCount = 0;
      let negativeCount = 0;
      
      words.forEach(word => {
        if (positiveWords.includes(word)) positiveCount++;
        if (negativeWords.includes(word)) negativeCount++;
      });
      
      if (positiveCount > negativeCount) return 'positive';
      if (negativeCount > positiveCount) return 'negative';
      return 'neutral';
    }
  };

  // 2. ENHANCE ARTICLES WITH LOCAL AI PROCESSING
  async enhanceArticles(articles: NewsArticle[]): Promise<NewsArticle[]> {
    return articles.map(article => {
      const enhanced = { ...article };
      
      // Generate summary if not present
      if (!enhanced.description || enhanced.description.length < 50) {
        enhanced.description = this.localTextProcessor.generateSummary(
          enhanced.content || enhanced.title,
          200
        );
      }
      
      // Extract entities for better tagging
      const entities = this.localTextProcessor.extractEntities(
        enhanced.title + ' ' + (enhanced.content || enhanced.description)
      );
      
      // Enhance tags
      if (!enhanced.tags || enhanced.tags.length === 0) {
        enhanced.tags = entities.slice(0, 5);
      } else {
        enhanced.tags = [...new Set([...enhanced.tags, ...entities])].slice(0, 8);
      }
      
      // Categorize if not present
      if (!enhanced.category) {
        enhanced.category = this.localTextProcessor.categorizeContent(
          enhanced.title + ' ' + (enhanced.content || enhanced.description)
        );
      }
      
      // Add sentiment analysis
      const sentiment = this.localTextProcessor.analyzeSentiment(
        enhanced.title + ' ' + (enhanced.content || enhanced.description)
      );
      
      // Add sentiment to tags
      if (sentiment !== 'neutral') {
        enhanced.tags = [...enhanced.tags, sentiment];
      }
      
      return enhanced;
    });
  }

  // 3. GENERATE INSIGHTS FROM FUNDING DATA
  async generateFundingInsights(fundingRounds: FundingRound[]): Promise<string> {
    if (fundingRounds.length === 0) {
      return "No funding data available for analysis.";
    }
    
    // Analyze funding trends
    const totalAmount = fundingRounds.reduce((sum, round) => {
      const amount = parseFloat(round.amount.replace(/[^0-9.]/g, ''));
      const multiplier = round.amount.includes('B') ? 1000 : 
                        round.amount.includes('M') ? 1 : 0.001;
      return sum + (amount * multiplier);
    }, 0);
    
    const stageDistribution = fundingRounds.reduce((acc, round) => {
      acc[round.stage] = (acc[round.stage] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const sectorDistribution = fundingRounds.reduce((acc, round) => {
      acc[round.sector] = (acc[round.sector] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Generate insights
    const insights = [
      `Total funding analyzed: $${totalAmount.toFixed(1)}M`,
      `Most active stage: ${Object.entries(stageDistribution)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || 'Unknown'}`,
      `Top sector: ${Object.entries(sectorDistribution)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || 'Unknown'}`,
      `Average round size: $${(totalAmount / fundingRounds.length).toFixed(1)}M`
    ];
    
    return insights.join('. ');
  }

  // 4. GENERATE TRENDING TOPICS
  async generateTrendingTopics(articles: NewsArticle[]): Promise<string[]> {
    const allText = articles.map(article => 
      article.title + ' ' + (article.content || article.description)
    ).join(' ');
    
    const words = allText.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !['this', 'that', 'with', 'from', 'they', 'have', 'will', 'been', 'were'].includes(word));
    
    const wordFreq: { [key: string]: number } = {};
    words.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });
    
    const trendingWords = Object.entries(wordFreq)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);
    
    return trendingWords;
  }

  // 5. GENERATE SEARCH SUGGESTIONS
  async generateSearchSuggestions(query: string): Promise<string[]> {
    const suggestions = [
      'startup funding',
      'AI companies',
      'venture capital',
      'tech news',
      'series A funding',
      'startup acquisitions',
      'IPO news',
      'tech startups',
      'funding rounds',
      'startup ecosystem'
    ];
    
    if (!query) return suggestions;
    
    const filtered = suggestions.filter(suggestion =>
      suggestion.toLowerCase().includes(query.toLowerCase())
    );
    
    return filtered.length > 0 ? filtered : suggestions.slice(0, 5);
  }

  // 6. ENHANCE CONTENT WITH SMART FILTERING
  async filterAndRankContent(articles: NewsArticle[]): Promise<NewsArticle[]> {
    return articles
      .filter(article => {
        // Filter out low-quality content
        const titleLength = article.title.length;
        const contentLength = (article.content || article.description).length;
        
        return titleLength > 10 && 
               titleLength < 200 && 
               contentLength > 20 &&
               !article.title.includes('spam') &&
               !article.title.includes('clickbait');
      })
      .map(article => {
        // Add quality score
        const qualityScore = this.calculateQualityScore(article);
        return { ...article, qualityScore };
      })
      .sort((a, b) => (b.qualityScore || 0) - (a.qualityScore || 0));
  }

  private calculateQualityScore(article: NewsArticle): number {
    let score = 0;
    
    // Title quality
    const titleLength = article.title.length;
    if (titleLength > 20 && titleLength < 100) score += 2;
    
    // Content quality
    const contentLength = (article.content || article.description).length;
    if (contentLength > 100) score += 3;
    if (contentLength > 500) score += 2;
    
    // Source quality
    const trustedSources = ['techcrunch', 'venturebeat', 'hacker news', 'reddit'];
    if (trustedSources.some(source => 
      article.source?.name.toLowerCase().includes(source)
    )) {
      score += 2;
    }
    
    // Recency
    const daysOld = (Date.now() - new Date(article.publishedAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysOld < 1) score += 3;
    else if (daysOld < 7) score += 2;
    else if (daysOld < 30) score += 1;
    
    // Engagement indicators
    if (article.tags && article.tags.length > 2) score += 1;
    if (article.category) score += 1;
    
    return score;
  }
}

// Export singleton instance
export const freeAIService = new FreeAIService();