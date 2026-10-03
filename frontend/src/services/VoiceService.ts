import { useAppStore } from '../store';

export class VoiceService {
  private static instance: VoiceService;
  private audio: HTMLAudioElement;
  private voices: SpeechSynthesisVoice[] = [];

  private constructor() { 
    this.audio = new Audio(); 
    this.audio.crossOrigin = "anonymous"; 
    
    // 🎧 Load voices immediately
    if (typeof window !== 'undefined' && window.speechSynthesis) {
        // Chrome/Edge load voices asynchronously
        window.speechSynthesis.onvoiceschanged = () => {
            this.voices = window.speechSynthesis.getVoices();
            console.log(`🎤 Loaded ${this.voices.length} voices.`);
        };
        // Try getting them right now just in case
        this.voices = window.speechSynthesis.getVoices();
    }
  }

  static getInstance(): VoiceService {
    if (!VoiceService.instance) VoiceService.instance = new VoiceService();
    return VoiceService.instance;
  }

  playBase64(base64String: string) {
    try {
      this.audio.pause();
      window.speechSynthesis.cancel();
      
      const binaryString = window.atob(base64String);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
      const blob = new Blob([bytes], { type: 'audio/mpeg' });
      this.audio.src = URL.createObjectURL(blob);
      this.audio.play();
      this.triggerLipSync(true);
      this.audio.onended = () => this.triggerLipSync(false);
    } catch (e) { console.error("Audio error", e); }
  }

  speak(text: string, onAudioLevel?: (audioLevel: number) => void) {
    this.audio.pause();
    window.speechSynthesis.cancel();

    // Retry logic if voices aren't loaded yet
    if (this.voices.length === 0) {
        this.voices = window.speechSynthesis.getVoices();
        if (this.voices.length === 0) {
            console.warn("🎤 Voices not ready, retrying in 100ms...");
            setTimeout(() => this.speak(text, onAudioLevel), 100);
            return;
        }
    }

    const utterance = new SpeechSynthesisUtterance(text);
    
    // 👩🏼‍🦰 AGGRESSIVE FEMALE VOICE SEARCH
    const femaleVoice = this.voices.find(v => 
        v.name.includes("Aria Online (Natural)") ||
        v.name.includes("Jenny Online (Natural)") ||
        v.name.includes("Google US English") ||
        v.name.includes("Google UK English Female") ||
        v.name.includes("Samantha") ||
        v.name.includes("Zira") ||
        v.name.includes("Eva") ||
        v.name.includes("Female")
    );

    if (femaleVoice) {
        utterance.voice = femaleVoice;
        utterance.pitch = 1.2; // Higher pitch = Anime style
        utterance.rate = 1.1;  // Slightly faster
        console.log(`✅ Speaking with: ${femaleVoice.name}`);
    } else {
        console.log("⚠️ No female voice found, using system default.");
    }

    // Audio level simulation for lip sync
    if (onAudioLevel) {
      const simulateAudioLevel = () => {
        const interval = setInterval(() => {
          if (!window.speechSynthesis.speaking) {
            clearInterval(interval);
            onAudioLevel(0);
            return;
          }
          // Simulate audio level based on speech
          const level = 0.3 + Math.random() * 0.7;
          onAudioLevel(level);
        }, 100);
      };

      utterance.onstart = () => {
        this.triggerLipSync(true);
        simulateAudioLevel();
      };
      utterance.onend = () => {
        this.triggerLipSync(false);
        onAudioLevel(0);
      };
    } else {
      utterance.onstart = () => this.triggerLipSync(true);
      utterance.onend = () => this.triggerLipSync(false);
    }
    
    window.speechSynthesis.speak(utterance);
  }

  private triggerLipSync(speaking: boolean) {
    const controller = (window as any).motionController;
    if (controller && typeof controller.setSpeaking === 'function') {
      controller.setSpeaking(speaking);
      if (!speaking) {
        controller.play('IDLE');
        controller.applyEmotion('NEUTRAL');
      }
    }
    try {
      const store = useAppStore.getState();
      if (store.setMascotSpeaking) store.setMascotSpeaking(speaking);
      if (!speaking && store.setMascotEmotion) {
        store.setMascotEmotion('NEUTRAL' as any);
        if (store.setMascotAction) store.setMascotAction('IDLE' as any);
      }
    } catch (error) {}
  }
}
