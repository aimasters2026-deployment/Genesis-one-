import React, { useState } from 'react';
import { MousePointer2, Hand, Type, Square, Image as ImageIcon, Sparkles, Menu, ChevronLeft } from 'lucide-react';
import { ToolType } from '../types';

interface ToolbarProps {
  activeTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ activeTool, onSelectTool }) => {
  const [isMinimized, setIsMinimized] = useState(false);
  
  const tools = [
    { type: ToolType.SELECT, icon: <MousePointer2 size={20} />, label: 'Select (V)' },
    { type: ToolType.HAND, icon: <Hand size={20} />, label: 'Hand (H)' },
    { type: ToolType.TEXT, icon: <Type size={20} />, label: 'Text (T)' },
    { type: ToolType.RECTANGLE, icon: <Square size={20} />, label: 'Shape (R)' },
    { type: ToolType.IMAGE, icon: <ImageIcon size={20} />, label: 'Import Image (I)' },
  ];

  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/90 dark:bg-slate-800/90 text-slate-400 hover:text-indigo-600 dark:hover:text-white border border-slate-200 dark:border-slate-700 shadow-2xl backdrop-blur-md z-20 transition-all hover:scale-110"
        title="Show Tools"
      >
        <Menu size={20} />
      </button>
    );
  }

  return (
    <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md p-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xl z-20 animate-in fade-in slide-in-from-left-4 duration-200">
      <button
        onClick={() => setIsMinimized(true)}
        className="self-center p-1 mb-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
        title="Minimize Toolbar"
      >
        <ChevronLeft size={16} />
      </button>
      
      {tools.map((tool) => (
        <button
          key={tool.type}
          onClick={() => onSelectTool(tool.type)}
          className={`p-3 rounded-lg transition-all duration-200 group relative ${
            activeTool === tool.type
              ? 'bg-indigo-600 text-white shadow-lg'
              : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
          }`}
          title={tool.label}
        >
          {tool.icon}
        </button>
      ))}
      
      <div className="h-px w-full bg-slate-200 dark:bg-slate-700 my-1" />

      {/* Art Generator Tool Button */}
      <button
        onClick={() => onSelectTool(ToolType.ART_GEN)}
        className={`p-3 rounded-lg transition-all duration-200 group relative ${
            activeTool === ToolType.ART_GEN
              ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg ring-1 ring-purple-400'
              : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
          }`}
        title="Art Generator"
      >
        <Sparkles size={20} />
      </button>

    </div>
  );
};

export default Toolbar;