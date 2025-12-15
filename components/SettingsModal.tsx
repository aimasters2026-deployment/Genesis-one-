import React, { useState, useEffect } from 'react';
import { X, Settings, Cpu, Palette, Info, Bookmark, Save, Trash2, ArrowRight, Shield, Key, Server } from 'lucide-react';
import { AppSettings, AVAILABLE_IMAGE_MODELS, AVAILABLE_LLM_MODELS } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onUpdateSettings }) => {
  const [activeTab, setActiveTab] = useState<'image' | 'llm' | 'advanced'>('llm');
  const [newTemplateName, setNewTemplateName] = useState('');
  const [hasGoogleKey, setHasGoogleKey] = useState(false);

  useEffect(() => {
    const checkKey = async () => {
        if ((window as any).aistudio?.hasSelectedApiKey) {
            const hasKey = await (window as any).aistudio.hasSelectedApiKey();
            setHasGoogleKey(hasKey);
        }
    };
    if (isOpen) checkKey();
  }, [isOpen]);

  const handleConnectGoogle = async () => {
      if ((window as any).aistudio?.openSelectKey) {
          await (window as any).aistudio.openSelectKey();
          const hasKey = await (window as any).aistudio.hasSelectedApiKey();
          setHasGoogleKey(hasKey);
      }
  };

  if (!isOpen) return null;

  const handleLlmConfigChange = (key: keyof AppSettings['llmConfig'], value: any) => {
    onUpdateSettings({
      ...settings,
      llmConfig: {
        ...settings.llmConfig,
        [key]: value
      }
    });
  };

  const handleEndpointChange = (key: keyof AppSettings['llmEndpoints'], value: string) => {
      onUpdateSettings({
          ...settings,
          llmEndpoints: {
              ...settings.llmEndpoints,
              [key]: value
          }
      });
  };

  const handleImageConfigChange = (key: keyof AppSettings['imageConfig'], value: any) => {
    onUpdateSettings({
      ...settings,
      imageConfig: {
        ...settings.imageConfig,
        [key]: value
      }
    });
  };

  const handleApiKeyChange = (modelId: string, key: string) => {
      onUpdateSettings({
          ...settings,
          apiKeys: {
              ...settings.apiKeys,
              [modelId]: key
          }
      });
  };

  const handleApplyTemplate = (content: string) => {
    handleLlmConfigChange('systemInstruction', content);
  };

  const handleSaveTemplate = () => {
    if (!newTemplateName.trim()) return;
    const newTemplate = {
        id: Date.now().toString(),
        name: newTemplateName,
        content: settings.llmConfig.systemInstruction
    };
    onUpdateSettings({
        ...settings,
        promptTemplates: [...(settings.promptTemplates || []), newTemplate]
    });
    setNewTemplateName('');
  };

  const handleDeleteTemplate = (id: string) => {
    onUpdateSettings({
        ...settings,
        promptTemplates: (settings.promptTemplates || []).filter(t => t.id !== id)
    });
  };

  const isGoogleModel = (id: string) => id.includes('gemini') || id.includes('imagen') || id.includes('veo');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 p-4">
      <div className="w-full md:w-[800px] h-[90dvh] md:max-h-[85vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-4 md:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-lg">
              <Settings size={20} className="md:w-6 md:h-6" />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-bold text-white">System Config</h2>
              <p className="text-xs md:text-sm text-slate-400 hidden xs:block">Configure AI Coordinators and Art Generators</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Responsive Layout */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden h-full">
          
          {/* Sidebar / Tabs */}
          <div className="w-full md:w-64 bg-slate-950/50 border-b md:border-b-0 md:border-r border-slate-800 p-2 md:p-4 flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-visible shrink-0">
            <button onClick={() => setActiveTab('llm')} className={`flex-1 md:w-full flex items-center justify-center md:justify-start gap-2 md:gap-3 p-2 md:p-3 rounded-xl transition-all whitespace-nowrap ${activeTab === 'llm' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}>
              <Cpu size={18} />
              <div className="text-left"><div className="font-medium text-xs md:text-sm">NLP Model</div><div className="text-[10px] opacity-70 hidden md:block">System Coordinator</div></div>
            </button>
            <button onClick={() => setActiveTab('image')} className={`flex-1 md:w-full flex items-center justify-center md:justify-start gap-2 md:gap-3 p-2 md:p-3 rounded-xl transition-all whitespace-nowrap ${activeTab === 'image' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}>
              <Palette size={18} />
              <div className="text-left"><div className="font-medium text-xs md:text-sm">Art Generator</div><div className="text-[10px] opacity-70 hidden md:block">Image Models</div></div>
            </button>
            <button onClick={() => setActiveTab('advanced')} className={`flex-1 md:w-full flex items-center justify-center md:justify-start gap-2 md:gap-3 p-2 md:p-3 rounded-xl transition-all whitespace-nowrap ${activeTab === 'advanced' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}>
              <Shield size={18} />
              <div className="text-left"><div className="font-medium text-xs md:text-sm">Advanced</div><div className="text-[10px] opacity-70 hidden md:block">API Keys & Auth</div></div>
            </button>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-900/50 custom-scrollbar">
            
            {/* NLP Coordinator Settings */}
            {activeTab === 'llm' && (
              <div className="space-y-6 md:space-y-8 animate-in slide-in-from-right-4 duration-300 pb-20">
                <div>
                  <h3 className="text-base md:text-lg font-semibold text-white mb-4 flex items-center gap-2"><Cpu size={20} className="text-indigo-400" /> System Coordinator</h3>

                  <div className="bg-slate-800 p-4 md:p-6 rounded-xl border border-slate-700 space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-2">Primary NLP Model</label>
                      <select value={settings.llmModel} onChange={(e) => onUpdateSettings({ ...settings, llmModel: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                        {AVAILABLE_LLM_MODELS.map(model => <option key={model.id} value={model.id}>{model.name}</option>)}
                      </select>
                    </div>

                    {/* Dynamic Configurations based on Model Selection */}
                    {settings.llmModel === 'llama-3.1-8b' && (
                        <div className="p-3 bg-indigo-900/20 border border-indigo-500/30 rounded-lg space-y-3">
                             <h4 className="text-sm font-semibold text-indigo-300 flex items-center gap-2"><Server size={14}/> Llama Configuration</h4>
                             <div>
                                 <label className="text-xs text-slate-400 block mb-1">API Endpoint (e.g., Groq, HuggingFace)</label>
                                 <input type="text" value={settings.llmEndpoints.llama} onChange={(e) => handleEndpointChange('llama', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-xs text-white" />
                             </div>
                             <div>
                                 <label className="text-xs text-slate-400 block mb-1">API Key</label>
                                 <input type="password" value={settings.apiKeys['llama-3.1-8b'] || ''} onChange={(e) => handleApiKeyChange('llama-3.1-8b', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-xs text-white" placeholder="sk-..." />
                             </div>
                        </div>
                    )}
                    
                    {settings.llmModel === 'rasa' && (
                        <div className="p-3 bg-indigo-900/20 border border-indigo-500/30 rounded-lg space-y-3">
                             <h4 className="text-sm font-semibold text-indigo-300 flex items-center gap-2"><Server size={14}/> Rasa Configuration</h4>
                             <div>
                                 <label className="text-xs text-slate-400 block mb-1">Webhook URL</label>
                                 <input type="text" value={settings.llmEndpoints.rasa} onChange={(e) => handleEndpointChange('rasa', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-xs text-white" placeholder="http://localhost:5005/webhooks/rest/webhook" />
                             </div>
                        </div>
                    )}

                     {settings.llmModel === 'pipecat' && (
                        <div className="p-3 bg-indigo-900/20 border border-indigo-500/30 rounded-lg space-y-3">
                             <h4 className="text-sm font-semibold text-indigo-300 flex items-center gap-2"><Server size={14}/> Pipecat Configuration</h4>
                             <div>
                                 <label className="text-xs text-slate-400 block mb-1">Agent Endpoint URL</label>
                                 <input type="text" value={settings.llmEndpoints.pipecat} onChange={(e) => handleEndpointChange('pipecat', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-xs text-white" placeholder="http://localhost:8000/api/command" />
                             </div>
                        </div>
                    )}

                    <div>
                        <div className="flex justify-between items-end mb-2">
                            <label className="block text-sm font-medium text-slate-400">System Instructions</label>
                            <span className="text-[10px] md:text-xs text-slate-500">Global Persona & Rules</span>
                        </div>
                        <textarea value={settings.llmConfig.systemInstruction} onChange={(e) => handleLlmConfigChange('systemInstruction', e.target.value)} rows={4} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none" placeholder="Define the persona and global rules for the AI..." />
                        
                        <div className="mt-3 flex flex-col md:flex-row items-stretch md:items-center gap-2">
                            <input type="text" placeholder="New Template Name..." value={newTemplateName} onChange={(e) => setNewTemplateName(e.target.value)} className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
                            <button onClick={handleSaveTemplate} disabled={!newTemplateName.trim()} className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-700 hover:bg-indigo-600 disabled:opacity-50 disabled:hover:bg-slate-700 text-white text-sm rounded-lg transition-colors"><Save size={14} /> Save</button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <div className="flex justify-between mb-2">
                                <label className="text-sm font-medium text-slate-400">Temperature</label>
                                <span className="text-xs text-indigo-400">{settings.llmConfig.temperature}</span>
                            </div>
                            <input type="range" min="0" max="2" step="0.1" value={settings.llmConfig.temperature} onChange={(e) => handleLlmConfigChange('temperature', parseFloat(e.target.value))} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                        </div>
                        <div>
                            <div className="flex justify-between mb-2">
                                <label className="text-sm font-medium text-slate-400">Top P</label>
                                <span className="text-xs text-indigo-400">{settings.llmConfig.topP}</span>
                            </div>
                            <input type="range" min="0" max="1" step="0.05" value={settings.llmConfig.topP} onChange={(e) => handleLlmConfigChange('topP', parseFloat(e.target.value))} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                        </div>
                        <div className="col-span-1 md:col-span-2">
                            <div className="flex justify-between mb-2">
                                <label className="text-sm font-medium text-slate-400">Max Output Tokens</label>
                                <span className="text-xs text-indigo-400">{settings.llmConfig.maxOutputTokens}</span>
                            </div>
                            <input type="range" min="100" max="8192" step="100" value={settings.llmConfig.maxOutputTokens} onChange={(e) => handleLlmConfigChange('maxOutputTokens', parseInt(e.target.value))} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                        </div>
                    </div>
                  </div>

                  {/* Prompt Templates List */}
                  <div className="bg-slate-800 p-4 md:p-6 rounded-xl border border-slate-700 space-y-4">
                     <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-slate-400 flex items-center gap-2"><Bookmark size={16} /> Saved Personas</label>
                        <span className="text-[10px] md:text-xs text-slate-500">Select to load</span>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto custom-scrollbar">
                        {settings.promptTemplates?.map(template => (
                            <div key={template.id} className="group flex items-center justify-between bg-slate-900 border border-slate-700 p-2 rounded-lg hover:border-indigo-500/50 transition-colors">
                                <button onClick={() => handleApplyTemplate(template.content)} className="flex-1 text-left text-xs md:text-sm text-slate-300 hover:text-white truncate px-2" title={template.content}>{template.name}</button>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => handleApplyTemplate(template.content)} className="p-1 hover:bg-indigo-600 rounded text-slate-400 hover:text-white"><ArrowRight size={12} /></button>
                                    <button onClick={() => handleDeleteTemplate(template.id)} className="p-1 hover:bg-red-500/20 rounded text-slate-500 hover:text-red-400"><Trash2 size={12} /></button>
                                </div>
                            </div>
                        ))}
                     </div>
                  </div>

                </div>
              </div>
            )}

             {/* Image Generator Settings */}
            {activeTab === 'image' && (
              <div className="space-y-6 md:space-y-8 animate-in slide-in-from-right-4 duration-300 pb-20">
                <div>
                  <h3 className="text-base md:text-lg font-semibold text-white mb-4 flex items-center gap-2"><Palette size={20} className="text-indigo-400" /> AI Art Generator Model</h3>
                  <div className="bg-slate-800 p-4 md:p-6 rounded-xl border border-slate-700 space-y-4">
                    <label className="block text-sm font-medium text-slate-400 mb-2">Active Model</label>
                    <select value={settings.imageModel} onChange={(e) => onUpdateSettings({ ...settings, imageModel: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                      {AVAILABLE_IMAGE_MODELS.map(model => <option key={model.id} value={model.id}>{model.name}</option>)}
                    </select>
                    
                    {/* New Configuration Options */}
                    <div className="grid grid-cols-2 gap-4 pt-2">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">Aspect Ratio</label>
                            <select value={settings.imageConfig.aspectRatio} onChange={(e) => handleImageConfigChange('aspectRatio', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm outline-none">
                                <option value="1:1">1:1 (Square)</option>
                                <option value="16:9">16:9 (Landscape)</option>
                                <option value="4:3">4:3 (Photo)</option>
                                <option value="9:16">9:16 (Portrait)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">Image Count</label>
                             <div className="flex items-center gap-3">
                                <input type="range" min="1" max="4" value={settings.imageConfig.numberOfImages} onChange={(e) => handleImageConfigChange('numberOfImages', parseInt(e.target.value))} className="flex-1 h-2 bg-slate-700 rounded-lg accent-indigo-500" />
                                <span className="text-white text-sm font-mono">{settings.imageConfig.numberOfImages}</span>
                             </div>
                        </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Advanced Settings */}
            {activeTab === 'advanced' && (
                <div className="space-y-6 md:space-y-8 animate-in slide-in-from-right-4 duration-300 pb-20">
                    <div>
                        <h3 className="text-base md:text-lg font-semibold text-white mb-4 flex items-center gap-2"><Shield size={20} className="text-indigo-400" /> Advanced Configuration</h3>
                        
                        {/* Google Models */}
                        <div className="bg-slate-800 p-4 md:p-6 rounded-xl border border-slate-700 mb-6">
                            <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2"><img src="https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg" className="w-4 h-4" /> Google AI (Gemini / Imagen / Veo)</h4>
                            <p className="text-xs text-slate-400 mb-4">High-performance models require an API Key or Google Account connection.</p>
                            
                            <div className="flex items-center justify-between bg-slate-900 p-3 rounded-lg border border-slate-700">
                                <div className="flex flex-col">
                                    <span className="text-sm text-slate-200">Google AI Studio Access</span>
                                    <span className="text-[10px] text-slate-500">{hasGoogleKey ? 'Connected' : 'No active session'}</span>
                                </div>
                                <button 
                                    onClick={handleConnectGoogle}
                                    className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${hasGoogleKey ? 'bg-green-500/10 text-green-500 border border-green-500/50' : 'bg-indigo-600 text-white hover:bg-indigo-500'}`}
                                >
                                    {hasGoogleKey ? 'Reconnect Account' : 'Connect Google Account'}
                                </button>
                            </div>
                        </div>

                        {/* Third Party Keys */}
                        <div className="bg-slate-800 p-4 md:p-6 rounded-xl border border-slate-700">
                            <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2"><Key size={16} /> Third-Party API Keys</h4>
                            <p className="text-xs text-slate-400 mb-4">Enter keys for external providers.</p>
                            
                            <div className="space-y-3">
                                {AVAILABLE_LLM_MODELS.filter(m => !isGoogleModel(m.id)).map(model => (
                                    <div key={model.id} className="group">
                                        <label className="block text-xs font-medium text-slate-400 mb-1">{model.name} API Key / Auth Token</label>
                                        <div className="relative">
                                            <input 
                                                type="password" 
                                                value={settings.apiKeys[model.id] || ''}
                                                onChange={(e) => handleApiKeyChange(model.id, e.target.value)}
                                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                                                placeholder={`sk-...`}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900 flex justify-end gap-3 shrink-0">
            <button 
                onClick={onClose}
                className="w-full md:w-auto px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors"
            >
                Done
            </button>
        </div>

      </div>
    </div>
  );
};

export default SettingsModal;