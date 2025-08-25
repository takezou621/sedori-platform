import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const NLPQuerySchema = z.object({
  question: z.string().min(1),
  context: z.enum(['price', 'trend', 'anomaly', 'prediction', 'recommendation']),
  asin: z.string().min(1),
  timeframe: z.string().optional(),
  priceData: z.array(z.object({
    timestamp: z.string(),
    price: z.number()
  })).optional(),
  analysisData: z.object({
    trend: z.enum(['rising', 'falling', 'stable', 'volatile']),
    volatility: z.number(),
    anomalies: z.array(z.any()),
    predictions: z.array(z.any())
  }).optional()
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question, context, asin, timeframe, priceData, analysisData } = NLPQuerySchema.parse(body);

    // Simulate AI processing - in production, this would call OpenAI or similar service
    const response = await processNaturalLanguageQuery({
      question,
      context,
      asin,
      timeframe,
      priceData,
      analysisData
    });

    return NextResponse.json({
      success: true,
      response,
      processingTime: Date.now()
    });

  } catch (error) {
    console.error('NLP query error:', error);
    return NextResponse.json(
      { error: 'Failed to process natural language query' },
      { status: 500 }
    );
  }
}

async function processNaturalLanguageQuery(params: {
  question: string;
  context: string;
  asin: string;
  timeframe?: string;
  priceData?: any[];
  analysisData?: any;
}): Promise<string> {
  const { question, context, asin, timeframe, priceData, analysisData } = params;

  // Simple rule-based responses (in production, this would use GPT or similar)
  const lowerQuestion = question.toLowerCase();

  // Time-based questions
  if (lowerQuestion.includes('なぜ') && lowerQuestion.includes('下が')) {
    if (analysisData?.anomalies?.length > 0) {
      const anomaly = analysisData.anomalies.find((a: any) => a.type === 'drop');
      if (anomaly && anomaly.possibleCause) {
        return `価格下落の主な原因は${anomaly.possibleCause}と考えられます。この時期の異常値は${anomaly.severity}レベルの影響を与えました。`;
      }
    }
    
    if (analysisData?.trend === 'falling') {
      return `価格が下がった理由として、市場の需要減少、競合商品の増加、または季節的要因が考えられます。ボラティリティが${analysisData.volatility.toFixed(1)}%と${analysisData.volatility > 15 ? '高く' : '低く'}、不安定な相場環境が影響している可能性があります。`;
    }
  }

  if (lowerQuestion.includes('なぜ') && lowerQuestion.includes('上が')) {
    if (analysisData?.anomalies?.length > 0) {
      const anomaly = analysisData.anomalies.find((a: any) => a.type === 'spike');
      if (anomaly && anomaly.possibleCause) {
        return `価格上昇の主な原因は${anomaly.possibleCause}と考えられます。この急騰は${anomaly.severity}レベルの影響力を持っていました。`;
      }
    }
    
    if (analysisData?.trend === 'rising') {
      return `価格上昇の要因として、需要の増加、在庫不足、または市場での注目度向上が考えられます。現在のトレンド強度から判断すると、この上昇傾向は続く可能性があります。`;
    }
  }

  // Prediction questions
  if (lowerQuestion.includes('将来') || lowerQuestion.includes('これから') || lowerQuestion.includes('今後')) {
    if (analysisData?.predictions?.length > 0) {
      const nearestPrediction = analysisData.predictions[0];
      const direction = nearestPrediction.predictedPrice > (priceData?.[priceData.length - 1]?.price || 0) ? '上昇' : '下降';
      return `AIの予測によると、今後30日間で価格は${direction}傾向になると予想されます。予測価格は¥${nearestPrediction.predictedPrice.toLocaleString()}で、信頼度は${(nearestPrediction.probability * 100).toFixed(0)}%です。`;
    }

    if (analysisData?.trend) {
      const trendText = analysisData.trend === 'rising' ? '上昇' : 
                       analysisData.trend === 'falling' ? '下降' : 
                       analysisData.trend === 'stable' ? '安定' : '変動';
      return `現在のトレンドは${trendText}です。ボラティリティが${analysisData.volatility.toFixed(1)}%であることから、${analysisData.volatility > 20 ? '価格変動が大きく、注意深く監視する必要があります' : '比較的安定した動きが予想されます'}。`;
    }
  }

  // Buy/sell timing questions
  if (lowerQuestion.includes('買い時') || lowerQuestion.includes('いつ買')) {
    if (priceData && priceData.length > 10) {
      const currentPrice = priceData[priceData.length - 1].price;
      const avgPrice = priceData.reduce((sum, p) => sum + p.price, 0) / priceData.length;
      
      if (currentPrice < avgPrice * 0.9) {
        return `現在の価格（¥${currentPrice.toLocaleString()}）は平均価格より約${((1 - currentPrice / avgPrice) * 100).toFixed(0)}%低く、買い時の可能性があります。ただし、市場状況を継続的に監視することをお勧めします。`;
      } else if (currentPrice > avgPrice * 1.1) {
        return `現在の価格は平均より高めです。価格が調整されるまで待つか、小額から段階的に購入することを検討してください。`;
      } else {
        return `現在の価格は平均的な水準にあります。トレンドと市場状況を確認してから購入タイミングを決めることをお勧めします。`;
      }
    }
  }

  if (lowerQuestion.includes('売り時') || lowerQuestion.includes('いつ売')) {
    if (analysisData?.trend === 'rising' && analysisData.volatility < 10) {
      return `現在は上昇トレンドで価格も安定しているため、もう少し様子を見ても良いかもしれません。ただし、利益確定のタイミングは個人の投資戦略によります。`;
    } else if (analysisData?.trend === 'falling') {
      return `下降トレンドが続いている場合は、損失を最小限に抑えるため早めの売却を検討した方が良いかもしれません。`;
    }
  }

  // Volatility questions
  if (lowerQuestion.includes('変動') || lowerQuestion.includes('ボラティリティ')) {
    const volatilityLevel = analysisData?.volatility || 0;
    const levelText = volatilityLevel > 20 ? '非常に高く' : 
                     volatilityLevel > 10 ? '高め' : 
                     volatilityLevel > 5 ? '中程度' : '低め';
    
    return `現在のボラティリティは${volatilityLevel.toFixed(1)}%で、${levelText}なっています。${volatilityLevel > 15 ? 'リスクが高いため、慎重な取引が必要です' : '比較的安定した価格動きが期待できます'}。`;
  }

  // Risk assessment questions
  if (lowerQuestion.includes('リスク') || lowerQuestion.includes('危険')) {
    let riskFactors = [];
    
    if (analysisData?.volatility > 20) {
      riskFactors.push('高いボラティリティ');
    }
    if (analysisData?.anomalies?.length > 3) {
      riskFactors.push('頻繁な価格異常');
    }
    if (analysisData?.trend === 'falling') {
      riskFactors.push('下降トレンド');
    }
    
    if (riskFactors.length > 0) {
      return `現在のリスク要因：${riskFactors.join('、')}。これらの要因を考慮して慎重に投資判断を行ってください。`;
    } else {
      return `現在は大きなリスク要因は見当たりません。ただし、市場状況は変動するため定期的なモニタリングは必要です。`;
    }
  }

  // Comparison questions
  if (lowerQuestion.includes('平均') || lowerQuestion.includes('比較')) {
    if (priceData && priceData.length > 0) {
      const currentPrice = priceData[priceData.length - 1].price;
      const avgPrice = priceData.reduce((sum, p) => sum + p.price, 0) / priceData.length;
      const difference = ((currentPrice - avgPrice) / avgPrice) * 100;
      
      return `現在価格（¥${currentPrice.toLocaleString()}）は期間平均価格（¥${avgPrice.toLocaleString()}）と比較して${difference > 0 ? '+' : ''}${difference.toFixed(1)}%${difference > 0 ? '高く' : '低く'}なっています。`;
    }
  }

  // Generic seasonal questions
  if (lowerQuestion.includes('季節') || lowerQuestion.includes('時期')) {
    const month = new Date().getMonth() + 1;
    let seasonalAdvice = '';
    
    if (month === 12 || month === 1) {
      seasonalAdvice = '年末年始は消費が活発になる時期のため、価格上昇の可能性があります。';
    } else if (month >= 6 && month <= 8) {
      seasonalAdvice = '夏季は一般的に消費が落ち着く傾向があり、価格も安定する場合が多いです。';
    } else if (month >= 3 && month <= 5) {
      seasonalAdvice = '春季は新生活需要により価格が上昇する傾向があります。';
    } else {
      seasonalAdvice = '秋季は比較的安定した価格動向を示すことが多いです。';
    }
    
    return `${seasonalAdvice}ただし、個別商品の特性や市場状況によって異なる場合があります。`;
  }

  // Default response
  return `${asin}の価格分析について、現在のトレンドは${analysisData?.trend || '不明'}で、ボラティリティは${analysisData?.volatility?.toFixed(1) || '計算中'}%です。より具体的な質問をしていただければ、詳細な分析をお答えできます。例：「なぜ価格が下がったのか？」「今後の価格予想は？」「買い時はいつか？」など`;
}