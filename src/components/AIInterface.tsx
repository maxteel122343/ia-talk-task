import { useEffect, useRef, useState, FormEvent } from 'react';
import { Mic, MicOff, Video, VideoOff, Send, Sparkles, Loader2, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface AIInterfaceProps {
  onSendMessage: (text: string, image?: string) => void;
  isProcessing: boolean;
  messages: { role: string; content: string }[];
  onCameraFrame: (frame: string) => void; // Callback to send frame to parent
}

export const AIInterface = ({ onSendMessage, isProcessing, messages, onCameraFrame }: AIInterfaceProps) => {
  const [input, setInput] = useState('');
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const latestOnSendMessage = useRef(onSendMessage);

  useEffect(() => {
    latestOnSendMessage.current = onSendMessage;
  }, [onSendMessage]);

  // Text-to-Speech
  useEffect(() => {
    if (isMuted || messages.length === 0) return;
    
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role === 'assistant') {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(lastMessage.content);
      // Try to find a good English voice, or Portuguese if the content is Portuguese (detected via simple heuristic or default)
      // For now, let browser pick default, but prefer a "Google US English" or similar if available.
      // Actually, since the user spoke Portuguese ("n estou ouvindo..."), the AI might reply in Portuguese.
      // We should let the browser detect language or just use default.
      
      // Simple language detection heuristic
      const isPortuguese = /[ãõáéíóúç]/i.test(lastMessage.content);
      utterance.lang = isPortuguese ? 'pt-BR' : 'en-US';
      
      utterance.rate = 1.1; // Slightly faster
      utterance.pitch = 1.0;
      
      window.speechSynthesis.speak(utterance);
    }
  }, [messages, isMuted]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Camera setup
  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      if (isCameraOn) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (err) {
          console.error("Error accessing camera:", err);
          setIsCameraOn(false);
        }
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isCameraOn]);

  // Periodic frame capture for "Vision"
  useEffect(() => {
    if (!isCameraOn) return;

    const interval = setInterval(() => {
      if (videoRef.current) {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0);
          const base64 = canvas.toDataURL('image/jpeg', 0.5).split(',')[1]; // Remove prefix
          onCameraFrame(base64);
        }
      }
    }, 5000); // Capture every 5 seconds for monitoring

    return () => clearInterval(interval);
  }, [isCameraOn, onCameraFrame]);

  // Speech Recognition
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn("Speech recognition not supported");
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US'; // Default to English, could be dynamic

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      latestOnSendMessage.current(transcript); // Auto-send on voice end
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    if (isListening) {
      recognition.start();
    } else {
      recognition.stop();
    }

    return () => {
      recognition.stop();
    };
  }, [isListening]); // Removed onSendMessage from deps

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSendMessage(input);
    setInput('');
  };

  return (
    <div className="fixed bottom-6 right-6 flex flex-col items-end gap-4 z-50 pointer-events-none">
      
      {/* Camera View (Draggable/Floating feel) */}
      <AnimatePresence>
        {isCameraOn && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="pointer-events-auto relative w-48 h-36 bg-black rounded-xl overflow-hidden border border-white/10 shadow-2xl"
          >
            <video 
              ref={videoRef} 
              autoPlay 
              muted 
              playsInline 
              className="w-full h-full object-cover transform scale-x-[-1]" 
            />
            <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-2 py-1 rounded-full">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] font-medium text-white">AI VISION ACTIVE</span>
            </div>
            
            {/* Overlay UI for "Scanning" effect */}
            <div className="absolute inset-0 border-2 border-white/5 pointer-events-none">
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-blue-500/50 rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-blue-500/50 rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-blue-500/50 rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-blue-500/50 rounded-br-lg" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Interface */}
      <div className="pointer-events-auto w-[380px] bg-[#18181b] border border-[#27272a] rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[600px]">
        
        {/* Header */}
        <div className="p-3 border-b border-[#27272a] flex items-center justify-between bg-[#18181b]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Sparkles size={16} className="text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Chronos</h3>
              <p className="text-[10px] text-gray-400">Productivity Mentor</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => {
                setIsMuted(!isMuted);
                if (!isMuted) window.speechSynthesis.cancel();
              }}
              className={cn("p-2 rounded-lg transition-colors", isMuted ? "text-gray-500 hover:text-gray-300" : "text-blue-400 hover:bg-blue-500/10")}
              title={isMuted ? "Unmute AI" : "Mute AI"}
            >
              {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <button 
              onClick={() => setIsCameraOn(!isCameraOn)}
              className={cn("p-2 rounded-lg transition-colors", isCameraOn ? "bg-blue-500/10 text-blue-400" : "hover:bg-white/5 text-gray-400")}
            >
              {isCameraOn ? <Video size={16} /> : <VideoOff size={16} />}
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px] max-h-[400px] bg-[#09090b]/50">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 text-xs mt-10">
              <p>Chronos is watching and ready to help.</p>
              <p className="mt-2">Try saying:</p>
              <ul className="mt-1 space-y-1">
                <li>"Create a plan to learn React"</li>
                <li>"I'm feeling distracted"</li>
                <li>"Organize my day"</li>
              </ul>
            </div>
          )}
          {messages.map((msg, i) => (
            <div 
              key={i} 
              className={cn(
                "flex w-full",
                msg.role === 'user' ? "justify-end" : "justify-start"
              )}
            >
              <div 
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",
                  msg.role === 'user' 
                    ? "bg-blue-600 text-white rounded-br-none" 
                    : "bg-[#27272a] text-gray-200 rounded-bl-none"
                )}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {isProcessing && (
             <div className="flex justify-start">
               <div className="bg-[#27272a] rounded-2xl rounded-bl-none px-4 py-3">
                 <div className="flex gap-1">
                   <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                   <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                   <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                 </div>
               </div>
             </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <form onSubmit={handleSubmit} className="p-3 bg-[#18181b] border-t border-[#27272a]">
          <div className="relative flex items-center gap-2">
            <button 
              type="button"
              onClick={() => setIsListening(!isListening)}
              className={cn(
                "p-2.5 rounded-xl transition-all",
                isListening ? "bg-red-500/20 text-red-500 animate-pulse" : "bg-[#27272a] text-gray-400 hover:text-white"
              )}
            >
              {isListening ? <MicOff size={18} /> : <Mic size={18} />}
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a command..."
              className="flex-1 bg-[#27272a] text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-gray-500"
            />
            <button 
              type="submit"
              disabled={!input.trim() || isProcessing}
              className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
