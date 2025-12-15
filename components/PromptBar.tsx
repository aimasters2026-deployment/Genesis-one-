import React, { useState, useRef } from 'react';
import { Mic, Send, Sparkles, StopCircle, Loader2, Minimize2, Cpu, Image as ImageIcon, Type, Square, Waves } from 'lucide-react';

interface PromptBarProps {
  isProcessing: boolean;
  onVoiceCommand: (audioBlob: Blob) => void;
  onTextCommand: (text: string) => void;
  onQuickAction: (type: 'ART_GEN' | 'IMAGE' | 'TEXT' | 'SHAPE') => void;
}

const PromptBar: React.FC<PromptBarProps> = ({ isProcessing, onVoiceCommand, onTextCommand, onQuickAction }) => {
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const longPressTimer = useRef<any>(null);

  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("Audio recording is not supported in this browser or requires a secure context (HTTPS).");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' }); 
        onVoiceCommand(blob);
        // Stop all tracks to release the microphone
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err: any) { 
        console.error("Mic error:", err); 
        // Handle various ways browsers report permission denied
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError' || err.message?.includes('Permission denied')) {
            alert("Microphone permission was denied. Please allow microphone access in your browser address bar.");
        } else if (err.name === 'NotFoundError') {
            alert("No microphone found. Please check your audio input settings.");
        } else {
            alert(`Microphone error: ${err.message || 'Unknown error'}`);
        }
    }
  };

  const stopRecording = () => { if (mediaRecorderRef.current && isRecording) { mediaRecorderRef.current.stop(); setIsRecording(false); } };
  const handleSendText = () => { if (!inputText.trim()) return; onTextCommand(inputText); setInputText(''); };

  // Long Press Handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    longPressTimer.current = setTimeout(() => {
        setShowShortcuts(true);
        longPressTimer.current = null;
    }, 500);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
        if (!showShortcuts) {
             setIsMinimized(false);
        }
    }
  };

  const handlePointerLeave = () => {
      if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
      }
  };

  const renderCircularShortcuts = () => {
      const actions = [
          { id: 'ART_GEN', icon: <Cpu size={20} />, color: 'text-indigo-600', bg: 'bg-indigo-50', label: 'Art' },
          { id: 'IMAGE', icon: <ImageIcon size={20} />, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Image' },
          { id: 'TEXT', icon: <Type size={20} />, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Text' },
          { id: 'SHAPE', icon: <Square size={20} />, color: 'text-amber-600', bg: 'bg-amber-50', label: 'Shape' },
      ];
      
      const radius = 80; // Distance from center
      const startAngle = 180; // Left
      const endAngle = 0; // Right
      const totalAngle = Math.abs(endAngle - startAngle);
      const step = totalAngle / (actions.length - 1);

      return actions.map((action, index) => {
          // Calculate angle in radians. 
          // 180 deg is PI. 0 deg is 0. 
          // We want them distributed in the top semi-circle.
          const degrees = startAngle - (step * index);
          const radians = (degrees * Math.PI) / 180;
          
          // Basic trig: x = r * cos(theta), y = r * sin(theta)
          // In CSS, negative y is up.
          const x = radius * Math.cos(radians);
          const y = -1 * radius * Math.sin(radians); // Flip for CSS

          return (
            <button 
                key={action.id}
                onClick={() => { onQuickAction(action.id as any); setShowShortcuts(false); }}
                className={`
                    absolute p-3 rounded-full shadow-lg border hover:scale-110 transition-transform flex items-center justify-center
                    ${action.bg} ${action.color} border-slate-200 dark:border-slate-700 dark:bg-slate-800
                `}
                style={{
                    left: `calc(50% + ${x}px)`,
                    top: `calc(50% + ${y}px)`,
                    transform: 'translate(-50%, -50%)'
                }}
                title={action.label}
            >
                {action.icon}
            </button>
          );
      });
  };

  if (isMinimized) {
    return (
        <>
            {showShortcuts && (
                <>
                    <div className="fixed inset-0 z-30" onClick={() => setShowShortcuts(false)} />
                    {/* Container centered on the button */}
                    <div className="absolute bottom-6 left-1/2 w-0 h-0 z-40">
                         {renderCircularShortcuts()}
                    </div>
                </>
            )}
            <button
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerLeave}
                className={`
                    absolute bottom-6 left-1/2 -translate-x-1/2 p-4 rounded-full 
                    bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_20px_rgba(79,70,229,0.5)] 
                    z-30 transition-all hover:scale-110 animate-in fade-in zoom-in duration-300 pb-safe
                    ${showShortcuts ? 'scale-110 ring-4 ring-indigo-500/30' : ''}
                `}
                title="Open NLP Assistant (Long press for shortcuts)"
            >
                {isProcessing ? <Loader2 className="animate-spin" size={24} /> : <Mic size={24} />}
            </button>
        </>
    );
  }

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-30 animate-in slide-in-from-bottom-4 duration-300 pb-safe">
      <div className="relative group/prompt">
        <div className={`
            relative flex items-center gap-2 p-2 rounded-2xl border transition-all duration-300
            ${isRecording ? 'bg-indigo-600/10 border-indigo-500/50 shadow-[0_0_30px_rgba(79,70,229,0.3)] ring-2 ring-indigo-500/20' : 'bg-white/90 dark:bg-slate-800/90 border-slate-200 dark:border-slate-600/50 shadow-2xl backdrop-blur-xl'}
        `}>
            <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isProcessing}
            className={`
                flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-xl transition-all shrink-0
                ${isRecording ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/30' : 'bg-indigo-600 text-white hover:bg-indigo-500'}
                ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            >
            {isProcessing ? <Loader2 className="animate-spin" size={20} /> : isRecording ? <Waves size={24} className="animate-pulse" /> : <Mic size={24} />}
            </button>
            <div className="flex-1 relative">
                <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
                placeholder={isRecording ? "Listening (NLP Mode Active)..." : "Describe a change..."}
                disabled={isRecording || isProcessing}
                className="w-full bg-transparent border-none text-slate-800 dark:text-white placeholder-slate-400 focus:ring-0 focus:outline-none px-2 py-3 text-sm md:text-base"
                />
                {isProcessing && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-indigo-500 dark:text-indigo-400 font-medium animate-pulse flex items-center gap-1">
                        <Sparkles size={12} /> Thinking...
                    </div>
                )}
            </div>
            {!isRecording && (
            <button onClick={handleSendText} disabled={!inputText.trim() || isProcessing} className="p-3 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-30 transition-colors shrink-0">
                <Send size={20} />
            </button>
            )}
        </div>
        <button onClick={() => setIsMinimized(true)} className="absolute -top-3 -right-3 p-1.5 bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-full hover:bg-slate-300 dark:hover:bg-slate-600 hover:text-slate-800 dark:hover:text-white shadow-md border border-slate-300 dark:border-slate-600 opacity-100 md:opacity-0 group-hover/prompt:opacity-100 transition-all duration-200">
            <Minimize2 size={12} />
        </button>
      </div>
    </div>
  );
};

export default PromptBar;