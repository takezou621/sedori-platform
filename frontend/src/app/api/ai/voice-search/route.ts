import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    // In production, this would call a speech-to-text service like OpenAI Whisper
    const transcription = await transcribeAudio(audioFile);

    return NextResponse.json({
      success: true,
      transcription,
      confidence: 0.95, // Mock confidence score
      language: 'ja',
      processingTime: Date.now()
    });

  } catch (error) {
    console.error('Voice search error:', error);
    return NextResponse.json(
      { error: 'Failed to process voice search' },
      { status: 500 }
    );
  }
}

async function transcribeAudio(audioFile: File): Promise<string> {
  // Mock transcription for demonstration
  // In production, this would use services like:
  // - OpenAI Whisper API
  // - Google Speech-to-Text
  // - Azure Speech Services
  
  const mockTranscriptions = [
    '利益率の高い商品を探して',
    '価格が上昇している商品はありますか',
    'リスクの低い商品を見つけて',
    '1万円以下の商品を検索',
    '今人気の商品を教えて',
    '在庫が少なくなっている商品は',
    'トレンドアイテムを探している',
    '安全な投資商品を見つけて'
  ];

  // Return a random mock transcription
  const randomIndex = Math.floor(Math.random() * mockTranscriptions.length);
  
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
  
  return mockTranscriptions[randomIndex];
}