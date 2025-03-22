import { Agent, AgentInput, AgentOutput } from './types';

export class NaturalLanguageSummaryAgent implements Agent {
  async analyze(input: AgentInput): Promise<AgentOutput> {
    const { portfolioState, actualAllocations, positionLimits } = input;
    
    // Extract real data from portfolioState
    const vixLevel = portfolioState.marketCondition.vix;
    const vixTrend = portfolioState.marketCondition.vixTrend;
    const riskLevel = portfolioState.marketCondition.riskLevel;
    const sharpeRatio = portfolioState.metrics.sharpeRatio;
    const rotationSignals = portfolioState.rotationSignals || [];
    
    // Check if portfolio exceeds position limits
    const exceedsPositionLimits = actualAllocations?.limitExceeded?.individualPositions || false;
    const exceedsCombinedLimits = actualAllocations?.limitExceeded?.combinedOptionETFs || false;
    
    // Calculate market metrics based on actual portfolio state
    const marketMetrics = this.calculateMarketMetrics(input);
    
    // Generate allocation recommendations based on VIX levels and actual position limits
    const allocations = this.calculateAllocations(vixLevel, actualAllocations, positionLimits);
    
    // Generate adjusted recommendations that respect position limits
    const adjustedAllocations = this.generateAdjustedAllocations(allocations, positionLimits);
    
    // Generate summary and analysis based on actual portfolio data
    const summary = this.generateStrategySummary(
      vixLevel, 
      marketMetrics, 
      adjustedAllocations,
      exceedsPositionLimits,
      exceedsCombinedLimits
    );
    
    const analysis = this.generateDetailedAnalysis(
      vixLevel, 
      marketMetrics, 
      adjustedAllocations, 
      portfolioState
    );
    
    // Generate recommendations based on actual rotation signals
    const recommendations = this.generateStrategyRecommendations(portfolioState);
    
    // Calculate confidence based on portfolio metrics
    const confidence = this.calculateStrategyConfidence(vixLevel, sharpeRatio, marketMetrics);
    
    // Identify risks based on actual portfolio data
    const risks = this.identifyStrategyRisks(portfolioState, exceedsPositionLimits);

    return {
      summary,
      analysis,
      confidence,
      recommendations,
      metrics: {
        vixLevel,
        vixTrend,
        riskLevel,
        sharpeRatio,
        actualAllocations,
        recommendedAllocations: adjustedAllocations,
        rotationSignals: portfolioState.rotationSignals,
        exceedsPositionLimits,
        exceedsCombinedLimits
      },
      risks
    };
  }

  private calculateMarketMetrics(input: AgentInput) {
    const { portfolioState } = input;
    
    // Extract market conditions from portfolio state
    const { marketCondition } = portfolioState;
    
    return {
      marketTrend: portfolioState.metrics.sharpeRatio > 0 ? 'positive' : 'negative',
      treasuryTrend: marketCondition.tenYearYield > marketCondition.twoYearYield ? 'positive' : 'negative',
      treasurySpread: marketCondition.tenYearYield - marketCondition.twoYearYield,
      marketSentiment: marketCondition.riskLevel
    };
  }

  private calculateAllocations(
    vixLevel: number, 
    actualAllocations: any,
    positionLimits: any
  ) {
    const maxSingleOptionETF = positionLimits?.maxSingleOptionETF || 0.05;
    const maxCombinedOptionETFs = positionLimits?.maxCombinedOptionETFs || 0.25;
    const idealIncomePieAllocation = positionLimits?.idealIncomePieAllocation || 0.60;
    
    // Start with the actual portfolio allocations if available
    const optionETFSymbols = ['FEPI', 'QQQY', 'SDTY'];
    const shortTermSymbols = ['SHY'];
    const treasurySymbols = ['EDV'];
    
    // Calculate actual allocations from portfolio data if available
    let currentOptionETFAllocation = 0;
    let currentShortTermAllocation = 0;
    let currentTreasuryAllocation = 0;
    
    if (actualAllocations?.holdings?.length > 0) {
      const holdings = actualAllocations.holdings;
      
      // Calculate current allocations from actual portfolio data
      holdings.forEach(holding => {
        if (optionETFSymbols.includes(holding.symbol)) {
          currentOptionETFAllocation += holding.allocation;
        } else if (shortTermSymbols.includes(holding.symbol)) {
          currentShortTermAllocation += holding.allocation;
        } else if (treasurySymbols.includes(holding.symbol)) {
          currentTreasuryAllocation += holding.allocation;
        }
      });
    }
    
    // Base allocations - start with actual allocations if available
    let baseAllocations = {
      incomePie: {
        total: currentOptionETFAllocation > 0 ? currentOptionETFAllocation : 
               Math.min(idealIncomePieAllocation, maxCombinedOptionETFs),
        FEPI: 0.35,
        SDTY: 0.35, 
        QQQY: 0.30  
      },
      shortTermTreasury: {
        total: currentShortTermAllocation > 0 ? currentShortTermAllocation : 0.2,
        SHY: 1.00
      },
      treasuryETF: {
        total: currentTreasuryAllocation > 0 ? currentTreasuryAllocation : 0.2,
        EDV: 1.00
      }
    };
    
    // Normalize to ensure base allocations add up to 100%
    this.normalizeAllocations(baseAllocations);

    // Adjust based on VIX - only modify if needed based on risk levels
    if (vixLevel > 30) {
      // High risk - reduce option ETFs significantly, increase treasuries
      const highVixAllocations = {
        incomePie: {
          total: maxCombinedOptionETFs, // Respect position limits (max 25%)
          FEPI: 0.40,
          SDTY: 0.35,
          QQQY: 0.25
        },
        shortTermTreasury: {
          total: (1 - maxCombinedOptionETFs) * 0.5,
          SHY: 1.00
        },
        treasuryETF: {
          total: (1 - maxCombinedOptionETFs) * 0.5,
          EDV: 1.00
        }
      };
      this.normalizeAllocations(highVixAllocations);
      return highVixAllocations;
    } else if (vixLevel > 25) {
      // Medium risk - reduce option ETFs moderately
      const midVixAllocations = {
        incomePie: {
          total: maxCombinedOptionETFs + 0.05, // Slightly more than minimum
          FEPI: 0.40,
          SDTY: 0.35,
          QQQY: 0.25
        },
        shortTermTreasury: {
          total: (1 - (maxCombinedOptionETFs + 0.05)) * 0.5,
          SHY: 1.00
        },
        treasuryETF: {
          total: (1 - (maxCombinedOptionETFs + 0.05)) * 0.5,
          EDV: 1.00
        }
      };
      this.normalizeAllocations(midVixAllocations);
      return midVixAllocations;
    }

    // Check if current allocations exceed limits
    if (actualAllocations?.limitExceeded?.combinedOptionETFs) {
      const adjustedAllocations = {
        incomePie: {
          total: maxCombinedOptionETFs, // Reduce to max combined limit
          FEPI: 0.35,
          SDTY: 0.35,
          QQQY: 0.30
        },
        shortTermTreasury: {
          total: (1 - maxCombinedOptionETFs) * 0.5,
          SHY: 1.00
        },
        treasuryETF: {
          total: (1 - maxCombinedOptionETFs) * 0.5,
          EDV: 1.00
        }
      };
      this.normalizeAllocations(adjustedAllocations);
      return adjustedAllocations;
    }

    return baseAllocations;
  }
  
  /**
   * Normalize allocations to ensure they sum to exactly 100%
   */
  private normalizeAllocations(allocations: any) {
    // Calculate total allocation
    const totalAllocation = allocations.incomePie.total + 
                           allocations.shortTermTreasury.total + 
                           allocations.treasuryETF.total;
    
    // If total doesn't equal 1 (100%), normalize the values
    if (Math.abs(totalAllocation - 1) > 0.001) {
      // Adjust allocations proportionally to sum to 100%
      const normalizationFactor = 1 / totalAllocation;
      allocations.incomePie.total *= normalizationFactor;
      allocations.shortTermTreasury.total *= normalizationFactor;
      allocations.treasuryETF.total *= normalizationFactor;
    }
  }
  
  /**
   * Generate adjusted allocations that respect position limits
   */
  private generateAdjustedAllocations(allocations: any, positionLimits: any) {
    const maxSingleOptionETF = positionLimits?.maxSingleOptionETF || 0.05;
    const maxCombinedOptionETFs = positionLimits?.maxCombinedOptionETFs || 0.25;
    
    // Calculate individual option ETF allocations
    const fepiAllocation = allocations.incomePie.total * allocations.incomePie.FEPI;
    const sdtyAllocation = allocations.incomePie.total * allocations.incomePie.SDTY;
    const qqqyAllocation = allocations.incomePie.total * allocations.incomePie.QQQY;
    
    // Check if any individual allocations exceed limits
    const exceedsIndividualLimits = 
      fepiAllocation > maxSingleOptionETF || 
      sdtyAllocation > maxSingleOptionETF || 
      qqqyAllocation > maxSingleOptionETF;
    
    // If within limits, return original allocations
    if (!exceedsIndividualLimits && allocations.incomePie.total <= maxCombinedOptionETFs) {
      return allocations;
    }
    
    // Otherwise, create adjusted allocations
    const adjustedAllocations = {
      incomePie: {
        total: Math.min(allocations.incomePie.total, maxCombinedOptionETFs),
        FEPI: 0.33,
        SDTY: 0.33,
        QQQY: 0.34
      },
      shortTermTreasury: {
        total: allocations.shortTermTreasury.total,
        SHY: 1.00
      },
      treasuryETF: {
        total: allocations.treasuryETF.total,
        EDV: 1.00
      },
      note: "Adjusted to respect position limits: 5% max per option ETF, 25% max combined"
    };
    
    // Normalize to ensure allocations add up to 100%
    this.normalizeAllocations(adjustedAllocations);
    
    return adjustedAllocations;
  }

  private generateStrategySummary(
    vixLevel: number, 
    marketMetrics: any, 
    allocations: any,
    exceedsPositionLimits: boolean,
    exceedsCombinedLimits: boolean
  ) {
    // Create a warning if position limits are exceeded
    const positionWarning = exceedsPositionLimits || exceedsCombinedLimits ? 
      `\n⚠️ POSITION LIMIT ALERT: Current allocations exceed recommended limits. Adjustments needed.` : '';
    
    // Calculate percentages with rounding that ensures they sum to 100%
    const incomePiePercent = Math.round(allocations.incomePie.total * 100);
    const shortTermTreasuryPercent = Math.round(allocations.shortTermTreasury.total * 100);
    
    // Calculate the treasury ETF percentage to ensure the total is exactly 100%
    const treasuryETFPercent = 100 - incomePiePercent - shortTermTreasuryPercent;
    
    return `M1 Portfolio Strategy Analysis

Current market conditions indicate a ${marketMetrics.marketTrend} trend with VIX at ${vixLevel.toFixed(2)}. Based on our strategic rotation system:

${this.getVixStatusSummary(vixLevel)}${positionWarning}

Recommended Portfolio Allocation:
- Income Factory: ${incomePiePercent}%
- Short-Term Treasury: ${shortTermTreasuryPercent}%
- Treasury ETF: ${treasuryETFPercent}%`;
  }

  private generateDetailedAnalysis(
    vixLevel: number, 
    marketMetrics: any, 
    allocations: any, 
    portfolioState: any
  ) {
    // Extract VIX thresholds from portfolio state
    const VIX_THRESHOLDS = {
      MONITOR: 20,
      FIRST_REDUCTION: 25,
      SECOND_REDUCTION: 30
    };
    
    // Add position limit warnings if needed
    const positionLimitNotes = allocations.note ? 
      `\n## Position Limit Notes\n${allocations.note}` : '';
    
    return `# Strategic Rotation System Analysis

## Market Environment
- VIX Level: ${vixLevel.toFixed(2)}
- Market Trend: ${marketMetrics.marketTrend.toUpperCase()}
- Treasury Spread: ${marketMetrics.treasurySpread.toFixed(2)}%
- Risk Level: ${portfolioState.marketCondition.riskLevel}

## VIX Threshold Analysis
🔍 Current Status:
${this.getVixAnalysis(vixLevel, VIX_THRESHOLDS)}

## Recommended Allocations

### Income Factory (${(allocations.incomePie.total * 100).toFixed(0)}% Total)
- FEPI: ${(allocations.incomePie.FEPI * allocations.incomePie.total * 100).toFixed(1)}%
- SDTY: ${(allocations.incomePie.SDTY * allocations.incomePie.total * 100).toFixed(1)}%
- QQQY: ${(allocations.incomePie.QQQY * allocations.incomePie.total * 100).toFixed(1)}%

### Treasury Allocations
- SHY: ${(allocations.shortTermTreasury.total * 100).toFixed(1)}%
- EDV: ${(allocations.treasuryETF.total * 100).toFixed(1)}%${positionLimitNotes}

## Implementation Strategy
${this.getImplementationStrategy(vixLevel, marketMetrics, portfolioState)}

## Monitoring Checklist
${this.getMonitoringChecklist()}`;
  }

  private getVixStatusSummary(vixLevel: number) {
    if (vixLevel > 30) {
      return "⚠️ HIGH RISK ALERT: VIX above 30 - Implement maximum defensive positioning";
    } else if (vixLevel > 25) {
      return "⚠️ ELEVATED RISK: VIX above 25 - Reduce option ETF exposure";
    } else if (vixLevel > 20) {
      return "📊 MONITOR: VIX above 20 - Enhanced monitoring required";
    }
    return "✅ NORMAL: VIX below 20 - Maintain standard allocations";
  }

  private getVixAnalysis(vixLevel: number, VIX_THRESHOLDS: any) {
    let analysis = '';
    
    if (vixLevel > VIX_THRESHOLDS.SECOND_REDUCTION) {
      analysis += `🚨 CRITICAL: VIX (${vixLevel.toFixed(2)}) exceeds ${VIX_THRESHOLDS.SECOND_REDUCTION}
- Reduce option ETF exposure to 25% of original position
- Increase Treasury allocations significantly
- Implement strict risk controls`;
    } else if (vixLevel > VIX_THRESHOLDS.FIRST_REDUCTION) {
      analysis += `⚠️ WARNING: VIX (${vixLevel.toFixed(2)}) exceeds ${VIX_THRESHOLDS.FIRST_REDUCTION}
- Reduce option ETF exposure by 25%
- Increase Treasury allocations moderately
- Enhanced monitoring required`;
    } else if (vixLevel > VIX_THRESHOLDS.MONITOR) {
      analysis += `📊 MONITOR: VIX (${vixLevel.toFixed(2)}) exceeds ${VIX_THRESHOLDS.MONITOR}
- Maintain current positions
- Prepare for potential adjustments
- Increase monitoring frequency`;
    } else {
      analysis += `✅ NORMAL: VIX (${vixLevel.toFixed(2)}) below ${VIX_THRESHOLDS.MONITOR}
- Maintain standard allocations
- Regular monitoring sufficient
- Focus on yield optimization`;
    }

    return analysis;
  }

  private getImplementationStrategy(vixLevel: number, marketMetrics: any, portfolioState: any) {
    // Add specific instructions if position limits are exceeded
    const positionLimitInstructions = portfolioState.rotationSignals.length > 0 ?
      '- Prioritize implementation of current rotation signals\n' : '';
    
    return `### Implementation Priority
${vixLevel > 25 ? '🚨 HIGH PRIORITY - Execute adjustments within 1-2 trading days' :
  vixLevel > 20 ? '⚠️ MEDIUM PRIORITY - Execute adjustments within 3-5 trading days' :
  '✅ NORMAL PRIORITY - Regular rebalancing schedule'}

### Execution Strategy
${positionLimitInstructions}1. ${vixLevel > 25 ? 'Reduce option ETF exposure first' : 'Monitor option ETF performance'}
2. ${vixLevel > 25 ? 'Increase Treasury positions second' : 'Maintain Treasury allocations'}
3. ${vixLevel > 25 ? 'Review and adjust stop levels' : 'Regular stop level monitoring'}

### Position Sizing
- Option ETFs: ${vixLevel > 30 ? 'Minimum' : vixLevel > 25 ? 'Reduced' : 'Standard'} position sizes
- Treasuries: ${vixLevel > 25 ? 'Increased' : 'Standard'} allocation`;
  }

  private getMonitoringChecklist() {
    return `### Daily Monitoring
- [ ] Check VIX level and trend
- [ ] Monitor option ETF price movements
- [ ] Review market news for volatility triggers

### Weekly Review
- [ ] Calculate 5-day VIX moving average
- [ ] Assess Treasury yield curve changes
- [ ] Review option ETF performance metrics
- [ ] Evaluate rotation signals

### Monthly Assessment
- [ ] Calculate 3-month rolling performance
- [ ] Evaluate NAV erosion metrics
- [ ] Update distribution yield calculations
- [ ] Review strategy effectiveness`;
  }

  private generateStrategyRecommendations(portfolioState: any) {
    const recommendations = [];
    const { marketCondition, rotationSignals, metrics } = portfolioState;
    const vixLevel = marketCondition.vix;

    // Use actual rotation signals if available
    if (rotationSignals && rotationSignals.length > 0) {
      // Map rotation signals to recommendations
      rotationSignals.forEach(signal => {
        recommendations.push({
          action: signal.type === 'INCREASE' ? 'BUY' : 
                 signal.type === 'REDUCE' ? 'SELL' : 'HOLD',
          symbol: signal.symbol,
          timeframe: signal.urgency === 'HIGH' ? 'short-term' : 'medium-term',
          conviction: signal.urgency === 'HIGH' ? 8 : 
                     signal.urgency === 'MEDIUM' ? 6 : 4,
          rationale: signal.reason,
          targetPrice: null,
          stopLoss: null
        });
      });
    } else {
      // Default recommendations based on VIX levels
      if (vixLevel > 25) {
        recommendations.push({
          action: 'SELL',
          symbol: 'OPTION_ETFS',
          timeframe: 'short-term',
          conviction: 7,
          rationale: `VIX above ${vixLevel.toFixed(2)} suggests elevated market risk`,
          targetPrice: null,
          stopLoss: null
        });
      } else if (metrics.sharpeRatio < -1) {
        recommendations.push({
          action: 'SELL',
          symbol: 'OPTION_ETFS',
          timeframe: 'medium-term',
          conviction: 6,
          rationale: `Negative Sharpe ratio (${metrics.sharpeRatio.toFixed(2)}) indicates poor risk-adjusted returns`,
          targetPrice: null,
          stopLoss: null
        });
      } else {
        recommendations.push({
          action: 'HOLD',
          symbol: 'PORTFOLIO',
          timeframe: 'medium-term',
          conviction: 5,
          rationale: 'Current market conditions remain stable',
          targetPrice: null,
          stopLoss: null
        });
      }
    }

    return recommendations;
  }

  private calculateStrategyConfidence(
    vixLevel: number, 
    sharpeRatio: number, 
    marketMetrics: any
  ): number {
    // Base confidence level
    let confidence = 0.7;
    
    // Adjust based on VIX level
    if (vixLevel > 30) {
      confidence -= 0.2; // Lower confidence in high volatility
    } else if (vixLevel < 15) {
      confidence += 0.1; // Higher confidence in low volatility
    }
    
    // Adjust based on Sharpe ratio
    if (sharpeRatio < -1) {
      confidence -= 0.2; // Lower confidence with poor risk-adjusted returns
    } else if (sharpeRatio > 1) {
      confidence += 0.1; // Higher confidence with good risk-adjusted returns
    }
    
    // Adjust based on market trend consistency
    if (marketMetrics.marketTrend === 'positive' && sharpeRatio > 0) {
      confidence += 0.1; // Higher confidence when signals align
    } else if (marketMetrics.marketTrend === 'negative' && sharpeRatio < 0) {
      confidence += 0.1; // Higher confidence when signals align
    } else {
      confidence -= 0.1; // Lower confidence with conflicting signals
    }
    
    // Ensure confidence is within [0, 1] range
    return Math.max(0, Math.min(1, confidence));
  }

  private identifyStrategyRisks(portfolioState: any, exceedsPositionLimits: boolean): string[] {
    const risks = [];
    const { marketCondition, metrics, holdings } = portfolioState;
    
    // VIX-related risks
    if (marketCondition.vix > 25) {
      risks.push('Elevated market volatility increases downside risk');
    }
    
    // Sharpe ratio risks
    if (metrics.sharpeRatio < 0) {
      risks.push('Negative risk-adjusted returns (Sharpe ratio)');
    }
    
    // Position limit risks
    if (exceedsPositionLimits) {
      risks.push('Position sizes exceed recommended limits, increasing concentration risk');
    }
    
    // Performance-related risks
    const optionETFs = holdings.filter(h => ['FEPI', 'QQQY', 'SDTY'].includes(h.symbol));
    const poorPerformingETFs = optionETFs.filter(h => h.weeklyPerformance < -3);
    
    if (poorPerformingETFs.length > 0) {
      risks.push('Weak option ETF performance may indicate continued pressure');
    }
    
    // NAV erosion risks
    const highErosionETFs = optionETFs.filter(h => h.navErosion < -5);
    
    if (highErosionETFs.length > 0) {
      risks.push('Significant NAV erosion detected in option ETFs');
    }
    
    // Low yield risks
    if (metrics.totalYield < 0.1) {
      risks.push('Portfolio yield below target threshold');
    }
    
    // Add at least one risk if none identified
    if (risks.length === 0) {
      risks.push('Weak trend strength may lead to false signals');
    }
    
    return risks;
  }
}