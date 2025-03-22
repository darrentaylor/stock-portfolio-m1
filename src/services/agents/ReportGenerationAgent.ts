import { AgentInput, AgentOutput, AnalysisReport } from './types';

export class ReportGenerationAgent {
  generateReport(
    input: AgentInput,
    fundamentalAnalysis: AgentOutput,
    technicalAnalysis: AgentOutput,
    sentimentAnalysis: AgentOutput,
    macroAnalysis: AgentOutput,
    naturalLanguageAnalysis: AgentOutput
  ): AnalysisReport {
    const { symbol, stockData } = input;
    const currentPrice = stockData[stockData.length - 1].close;

    // Generate the final recommendation text with improved, conversational format
    const finalRecommendation = `# ${symbol} Analysis Summary

${naturalLanguageAnalysis.summary}

## Strategic Assessment

${this.generateStrategicAssessment(macroAnalysis)}

## Action Plan

${this.generateActionPlan(macroAnalysis)}

## Market Context

${this.generateMarketContext(technicalAnalysis)}

## Risk Snapshot

${this.generateRiskSnapshot(fundamentalAnalysis, technicalAnalysis, sentimentAnalysis, macroAnalysis)}`;

    // Calculate combined confidence score
    const weights = {
      fundamental: 0.3,
      technical: 0.3,
      sentiment: 0.2,
      macro: 0.2
    };

    const confidence = (
      fundamentalAnalysis.confidence * weights.fundamental +
      technicalAnalysis.confidence * weights.technical +
      sentimentAnalysis.confidence * weights.sentiment +
      macroAnalysis.confidence * weights.macro
    );

    // Combine recommendations
    const shortTermRecs = [
      technicalAnalysis.recommendations[0],
      sentimentAnalysis.recommendations[0],
      macroAnalysis.recommendations[0]
    ].filter(rec => rec.timeframe === 'short-term');

    const longTermRecs = [
      fundamentalAnalysis.recommendations[0],
      technicalAnalysis.recommendations[0]
    ].filter(rec => rec.timeframe === 'long-term');

    // Calculate final recommendations
    const getRecommendation = (recs: typeof shortTermRecs) => {
      const totalConviction = recs.reduce((sum, rec) => sum + rec.conviction, 0);
      const weightedAction = recs.reduce((acc, rec) => {
        const weight = rec.conviction / totalConviction;
        return {
          BUY: acc.BUY + (rec.action === 'BUY' ? weight : 0),
          SELL: acc.SELL + (rec.action === 'SELL' ? weight : 0),
          HOLD: acc.HOLD + (rec.action === 'HOLD' ? weight : 0)
        };
      }, { BUY: 0, SELL: 0, HOLD: 0 });

      const action = Object.entries(weightedAction)
        .reduce((a, b) => a[1] > b[1] ? a : b)[0] as 'BUY' | 'SELL' | 'HOLD';

      const conviction = Math.round(
        recs.reduce((sum, rec) => sum + (rec.action === action ? rec.conviction : 0), 0) /
        recs.filter(rec => rec.action === action).length
      );

      return `${action} (Conviction: ${conviction}/10)`;
    };

    // Calculate but don't need to assign to variables if unused
    getRecommendation(shortTermRecs);
    getRecommendation(longTermRecs);

    // Combine price targets from technical analysis
    const priceTargets = {
      bullish: currentPrice * 1.1,
      base: currentPrice,
      bearish: currentPrice * 0.9
    };

    if (technicalAnalysis.recommendations[0].targetPrice) {
      priceTargets.bullish = technicalAnalysis.recommendations[0].targetPrice;
      priceTargets.bearish = technicalAnalysis.recommendations[0].stopLoss || priceTargets.bearish;
    }

    // Combine support and resistance levels
    const supportLevels = (technicalAnalysis.metrics.supportLevels || []) as number[];
    const resistanceLevels = (technicalAnalysis.metrics.resistanceLevels || []) as number[];

    // Combine all risks
    const risks = [
      ...fundamentalAnalysis.risks,
      ...technicalAnalysis.risks,
      ...sentimentAnalysis.risks,
      ...macroAnalysis.risks
    ];

    return {
      symbol,
      timestamp: Date.now(),
      fundamentalAnalysis,
      technicalAnalysis,
      sentimentAnalysis,
      macroAnalysis,
      finalRecommendation,
      confidence,
      risks,
      supportLevels,
      resistanceLevels,
      priceTargets
    };
  }

  private generateStrategicAssessment(macroAnalysis: AgentOutput): string {
    // Extract VIX level for context
    const vixLevel = macroAnalysis.metrics.vixLevel as number || 0;
    const vixTrend = macroAnalysis.metrics.vixTrend as string || 'NEUTRAL';
    
    return `The market environment is currently showing ${macroAnalysis.summary.toLowerCase()}

With VIX at ${vixLevel.toFixed(2)} and ${vixTrend.toLowerCase()} trend, your portfolio requires ${vixLevel > 25 ? "immediate attention" : vixLevel > 20 ? "careful monitoring" : "standard oversight"}.

${macroAnalysis.analysis.split('\n').slice(0, 3).join('\n')}`;
  }

  private generateActionPlan(macroAnalysis: AgentOutput): string {
    // Get the actual recommended allocations from the metrics
    const defaultAllocations = {
      incomePie: { total: 0.25, FEPI: 0.33, SDTY: 0.33, QQQY: 0.34 },
      shortTermTreasury: { total: 0.375, SHY: 1.0 },
      treasuryETF: { total: 0.375, EDV: 1.0 }
    };
    
    // Safely access the recommendedAllocations with type checking
    const recAllocations = macroAnalysis.metrics.recommendedAllocations;
    const recommendedAllocations = (
      recAllocations && 
      typeof recAllocations === 'object' && 
      'incomePie' in recAllocations
    ) ? recAllocations : defaultAllocations;
    
    // Normalize allocations to ensure they sum to 100%
    const totalAllocation = recommendedAllocations.incomePie.total + 
                           recommendedAllocations.shortTermTreasury.total + 
                           recommendedAllocations.treasuryETF.total;
    
    // If total doesn't equal 1 (100%), normalize the values
    if (Math.abs(totalAllocation - 1) > 0.001) {
      // Adjust allocations proportionally to sum to 100%
      const normalizationFactor = 1 / totalAllocation;
      recommendedAllocations.incomePie.total *= normalizationFactor;
      recommendedAllocations.shortTermTreasury.total *= normalizationFactor;
      recommendedAllocations.treasuryETF.total *= normalizationFactor;
    }
    
    // Format with conversational action recommendations
    const vixLevel = macroAnalysis.metrics.vixLevel as number || 0;
    const rotationSignals = this.getRotationSignals(macroAnalysis);
    
    let priorityActions = [];
    
    // Determine priority actions based on VIX and rotation signals
    if (vixLevel > 25) {
      priorityActions.push(`Reduce option ETF exposure to ${(recommendedAllocations.incomePie.total * 100).toFixed(0)}% of portfolio due to elevated VIX (${vixLevel.toFixed(2)}).`);
    }
    
    if (rotationSignals.length > 0) {
      priorityActions.push(rotationSignals[0]);
    }
    
    // Add portfolio-specific actions
    if (macroAnalysis.metrics.exceedsPositionLimits) {
      priorityActions.push(`Rebalance individual option ETF positions to stay within 5% individual position limits.`);
    }
    
    if (macroAnalysis.metrics.exceedsCombinedLimits) {
      priorityActions.push(`Reduce combined option ETF allocation to maximum 25% of portfolio.`);
    }
    
    // If we have less than 3 priority actions, add general advice
    if (priorityActions.length < 3) {
      priorityActions.push(`Monitor Treasury yield curve for rotation signals between income ETFs and Treasury ETFs.`);
    }
    
    if (priorityActions.length < 3) {
      priorityActions.push(`Review distribution schedules for upcoming payouts from income ETFs.`);
    }
    
    // Limit to top 3-4 actions
    priorityActions = priorityActions.slice(0, 4);
    
    return priorityActions.map((action, index) => `${index+1}. ${action}`).join('\n\n');
  }

  private generateMarketContext(technicalAnalysis: AgentOutput): string {
    // Extract just the key market context information
    const keyContext = technicalAnalysis.analysis
      .split('\n')
      .filter(line => 
        line.includes('trend') || 
        line.includes('momentum') || 
        line.includes('sentiment') ||
        line.includes('support') ||
        line.includes('resistance')
      )
      .slice(0, 3);
    
    // If nothing was found, provide a simple summary
    if (keyContext.length === 0) {
      return technicalAnalysis.summary;
    }
    
    return keyContext.join('\n');
  }

  private generateRiskSnapshot(
    fundamentalAnalysis: AgentOutput,
    technicalAnalysis: AgentOutput,
    sentimentAnalysis: AgentOutput,
    macroAnalysis: AgentOutput
  ): string {
    // Combine all risks but limit to top 3 most significant ones
    const allRisks = [
      ...macroAnalysis.risks,  // Prioritize macro risks first
      ...technicalAnalysis.risks,
      ...fundamentalAnalysis.risks,
      ...sentimentAnalysis.risks
    ].slice(0, 3);
    
    // Add 1-2 mitigation strategies in conversational format
    const vixLevel = macroAnalysis.metrics.vixLevel as number || 0;
    const mitigationStrategies = [
      `For protection, ${vixLevel > 25 ? 
        "increase Treasury allocations to at least 50% of portfolio" : 
        "maintain balanced exposure between option ETFs and Treasuries"}`,
      `Set price alerts for VIX at ${Math.floor(vixLevel) + 5} to trigger defensive action if volatility increases`
    ];

    return `Key risks to watch: ${allRisks.map(risk => `*${risk}*`).join(', ')}\n\n${mitigationStrategies.join('\n\n')}`;
  }

  private getRotationSignals(macroAnalysis: AgentOutput): string[] {
    // Extract rotation signals if they exist
    const rotationSignalsRaw = macroAnalysis.metrics.rotationSignals;
    const rotationSignals = Array.isArray(rotationSignalsRaw) ? rotationSignalsRaw : [];
    
    if (rotationSignals.length === 0) {
      return [];
    }
    
    // Convert rotation signals to actionable recommendations
    return rotationSignals.map(signal => {
      if (typeof signal !== 'object' || signal === null) {
        return '';
      }
      
      if (signal.type === 'INCREASE') {
        return `Increase ${signal.symbol} allocation because ${typeof signal.reason === 'string' ? signal.reason.toLowerCase() : signal.reason}`;
      } else if (signal.type === 'REDUCE') {
        return `Reduce ${signal.symbol} allocation because ${typeof signal.reason === 'string' ? signal.reason.toLowerCase() : signal.reason}`;
      } else if (signal.type === 'ROTATE') {
        return `Rotate from ${signal.fromSymbol} to ${signal.symbol} because ${typeof signal.reason === 'string' ? signal.reason.toLowerCase() : signal.reason}`;
      }
      return '';
    }).filter(signal => signal !== '');
  }

  private formatVixThresholds(metrics: Record<string, unknown>): string {
    const vixLevel = metrics.vixLevel as number || 0;
    return `Current VIX: ${vixLevel.toFixed(2)} (${this.getVixDescription(vixLevel)})`;
  }

  private getVixDescription(vixLevel: number): string {
    if (vixLevel > 30) return "Highly Elevated - Defensive Positioning Required";
    if (vixLevel > 25) return "Elevated - Reduce Risk Exposure";
    if (vixLevel > 20) return "Moderately Elevated - Monitor Closely";
    return "Normal Range - Standard Positioning";
  }

  private getPositionStatus(macroAnalysis: AgentOutput, symbol: string): string {
    // Determine status based on VIX level and rotation signals
    const vixLevel = macroAnalysis.metrics.vixLevel as number || 0;
    const rotationSignalsRaw = macroAnalysis.metrics.rotationSignals;
    const rotationSignals = Array.isArray(rotationSignalsRaw) ? rotationSignalsRaw : [];
    
    const signalForSymbol = rotationSignals.find(signal => 
      typeof signal === 'object' && signal !== null && 
      (signal.symbol === symbol || signal.fromSymbol === symbol)
    );
    
    if (signalForSymbol) {
      if (signalForSymbol.type === 'INCREASE' && signalForSymbol.symbol === symbol) {
        return "INCREASE";
      }
      if (signalForSymbol.type === 'REDUCE' && signalForSymbol.symbol === symbol) {
        return "REDUCE";
      }
      if (signalForSymbol.type === 'ROTATE') {
        if (signalForSymbol.symbol === symbol) return "INCREASE";
        if (signalForSymbol.fromSymbol === symbol) return "REDUCE";
      }
    }
    
    // Default statuses based on ETF type and VIX level
    if (['FEPI', 'SDTY', 'QQQY'].includes(symbol)) {
      if (vixLevel > 30) return "REDUCE";
      if (vixLevel > 25) return "CAUTION";
      return "MAINTAIN";
    }
    
    if (symbol === 'EDV') {
      if (vixLevel > 25) return "INCREASE";
      return "MAINTAIN";
    }
    
    if (symbol === 'SHY') {
      if (vixLevel > 30) return "INCREASE";
      return "MAINTAIN";
    }
    
    return "MAINTAIN";
  }
}