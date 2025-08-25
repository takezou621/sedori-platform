// Simple speech synthesis utility
export const useSpeechSynthesis = () => ({
  speak: ({ text, voice, rate = 1, pitch = 1 }: { 
    text: string; 
    voice?: SpeechSynthesisVoice; 
    rate?: number; 
    pitch?: number; 
  }) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      utterance.rate = rate;
      utterance.pitch = pitch;
      if (voice) utterance.voice = voice;
      window.speechSynthesis.speak(utterance);
    }
  },
  cancel: () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  },
  speaking: false,
  voices: typeof window !== 'undefined' ? window.speechSynthesis?.getVoices() || [] : []
});