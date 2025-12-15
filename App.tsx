import React, { useState, useCallback, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { CanvasElement, CanvasState, ToolType, ElementType, AIAction, AppSettings, Theme, CANVAS_SIZE } from './types';
import Toolbar from './components/Toolbar';
import LayerPanel from './components/LayerPanel';
import Artboard from './components/Canvas/Artboard';
import PromptBar from './components/PromptBar';
import SettingsModal from './components/SettingsModal';
import ExportModal from './components/ExportModal';
import FloatingOperationsPanel from './components/FloatingOperationsPanel';
import { HeaderMenu } from './components/HeaderMenu';
import { Collaborators } from './components/Collaborators';
import { SplashScreen } from './components/SplashScreen';
import { interpretVoiceCommand, interpretTextCommand, generateImageAsset } from './services/geminiService';

const INITIAL_ELEMENTS: CanvasElement[] = [
    {
      id: '1',
      type: ElementType.SHAPE,
      shapeType: 'rectangle',
      x: CANVAS_SIZE.width / 2 - 200, // Centered default rect
      y: CANVAS_SIZE.height / 2 - 150,
      width: 400,
      height: 300,
      rotation: 0,
      opacity: 1,
      zIndex: 0,
      content: 'rect',
      visible: true,
      locked: false,
      parentId: null,
      style: { backgroundColor: '#334155' } 
    },
    {
      id: '2',
      type: ElementType.TEXT,
      x: CANVAS_SIZE.width / 2 - 150, // Centered default text
      y: CANVAS_SIZE.height / 2 + 120,
      width: 300,
      height: 60,
      rotation: 0,
      opacity: 1,
      zIndex: 1,
      content: 'Hello Genesis',
      visible: true,
      locked: false,
      parentId: null,
      style: { color: '#f8fafc', fontSize: 32 }
    }
];

const INITIAL_STATE: CanvasState = {
  elements: INITIAL_ELEMENTS,
  selectedIds: [],
  zoom: 1,
  pan: { x: 0, y: 0 },
  history: [INITIAL_ELEMENTS], 
  historyIndex: 0,
};

const INITIAL_SETTINGS: AppSettings = {
  imageModel: 'gemini-3-pro-image-preview',
  llmModel: 'gemini-2.5-flash',
  llmConfig: {
    temperature: 0.7,
    topK: 40,
    topP: 0.95,
    maxOutputTokens: 2048,
    systemInstruction: "You are a precise design assistant. Output only valid JSON."
  },
  llmEndpoints: {
    llama: 'https://api.groq.com/openai/v1/chat/completions',
    rasa: 'http://localhost:5005/webhooks/rest/webhook',
    pipecat: 'http://localhost:8000/api/command'
  },
  imageConfig: {
    aspectRatio: '1:1',
    numberOfImages: 1,
    outputMimeType: 'image/jpeg'
  },
  promptTemplates: [
    { 
        id: 'default', 
        name: 'Standard Assistant', 
        content: "You are a precise design assistant. Output only valid JSON. Do not hallucinate properties." 
    }
  ],
  apiKeys: {}
};

export const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [state, setState] = useState<CanvasState>(INITIAL_STATE);
  const [activeTool, setActiveTool] = useState<ToolType>(ToolType.SELECT);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(INITIAL_SETTINGS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>('dark');
  const [isCollaborating, setIsCollaborating] = useState(false);
  
  const quickImageRef = useRef<HTMLInputElement>(null);

  // Apply Theme
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Center Canvas on Mount
  useEffect(() => {
    // Calculate center based on window size and canvas size
    const centerX = (window.innerWidth - CANVAS_SIZE.width) / 2;
    const centerY = (window.innerHeight - CANVAS_SIZE.height) / 2;
    setState(prev => ({
        ...prev,
        pan: { x: centerX, y: centerY }
    }));
  }, []);

  // --- File Menu Handlers ---

  const handleNewSketch = () => {
    if (confirm("Start a new project? All current layers will be deleted and settings reset to default.")) {
      const centerX = (window.innerWidth - CANVAS_SIZE.width) / 2;
      const centerY = (window.innerHeight - CANVAS_SIZE.height) / 2;
      setState({
          elements: [],
          selectedIds: [],
          zoom: 1,
          pan: { x: centerX, y: centerY },
          history: [[]],
          historyIndex: 0
      });
      setSettings(INITIAL_SETTINGS);
    }
  };

  const handleSave = () => {
    try {
        const projectData = {
            state,
            settings,
            savedAt: new Date().toISOString(),
            version: '1.0'
        };
        localStorage.setItem('aether_canvas_save', JSON.stringify(projectData));
        alert("Project saved successfully to local storage!");
    } catch (e) {
        console.error("Save failed", e);
        alert("Failed to save project. Storage might be full.");
    }
  };

  const handleOpenGallery = () => {
    const saved = localStorage.getItem('aether_canvas_save');
    if (saved) {
      if (confirm("Load last saved project? Unsaved changes will be lost.")) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.state) {
              setState(parsed.state);
              if (parsed.settings) {
                  setSettings(parsed.settings);
              }
          } else {
              // Backward compatibility for old saves
              setState(parsed);
          }
        } catch (e) {
          alert("Failed to load project: Corrupt data.");
        }
      }
    } else {
      alert("No saved projects found in Gallery.");
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.includes('json')) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const parsed = JSON.parse(ev.target?.result as string);
          // Handle both full project export and simple state export
          if (parsed.state) {
             setState(parsed.state);
             if (parsed.settings) setSettings(parsed.settings);
          } else {
             setState(parsed);
          }
        } catch (err) {
          alert("Invalid JSON file");
        }
      };
      reader.readAsText(file);
    } else if (file.type.includes('image')) {
      const reader = new FileReader();
      reader.onload = (ev) => {
         const imgData = ev.target?.result as string;
         // Place new image in center of canvas
         const newEl: CanvasElement = {
            id: uuidv4(),
            type: ElementType.IMAGE,
            x: CANVAS_SIZE.width / 2 - 200,
            y: CANVAS_SIZE.height / 2 - 150,
            width: 400,
            height: 300,
            rotation: 0,
            opacity: 1,
            zIndex: state.elements.length,
            content: imgData,
            visible: true, locked: false, parentId: null
         };
         addElement(newEl);
      };
      reader.readAsDataURL(file);
    }
    // Reset input
    e.target.value = '';
  };

  const handleExport = () => {
    setIsExportOpen(true);
  };

  // --- History Helper ---
  const withHistory = (prevState: CanvasState, newElements: CanvasElement[]): CanvasState => {
    const newHistory = prevState.history.slice(0, prevState.historyIndex + 1);
    newHistory.push(newElements);
    return {
        ...prevState,
        elements: newElements,
        history: newHistory,
        historyIndex: newHistory.length - 1
    };
  };

  const undo = useCallback(() => {
    setState(prev => {
        if (prev.historyIndex > 0) {
            const newIndex = prev.historyIndex - 1;
            return {
                ...prev,
                historyIndex: newIndex,
                elements: prev.history[newIndex],
                selectedIds: [] 
            };
        }
        return prev;
    });
  }, []);

  const redo = useCallback(() => {
    setState(prev => {
        if (prev.historyIndex < prev.history.length - 1) {
            const newIndex = prev.historyIndex + 1;
            return {
                ...prev,
                historyIndex: newIndex,
                elements: prev.history[newIndex],
                selectedIds: []
            };
        }
        return prev;
    });
  }, []);

  // --- State Modifiers ---

  const updateElement = useCallback((id: string, updates: Partial<CanvasElement>) => {
    setState(prev => {
        const newElements = prev.elements.map(el => el.id === id ? { ...el, ...updates } : el);
        if (JSON.stringify(prev.elements) !== JSON.stringify(newElements)) {
            return withHistory(prev, newElements);
        }
        return prev;
    });
  }, []);

  const addElement = useCallback((element: CanvasElement) => {
    const elementWithModel = {
        ...element,
        modelId: element.modelId || settings.imageModel
    };

    setState(prev => {
        const newElements = [...prev.elements, elementWithModel];
        return {
            ...withHistory(prev, newElements),
            selectedIds: [elementWithModel.id]
        };
    });
  }, [settings.imageModel]);

  const deleteElements = useCallback((ids: string[]) => {
    setState(prev => {
        // Also delete children if a group is deleted
        const idsToDelete = new Set(ids);
        prev.elements.forEach(el => {
            if (el.parentId && idsToDelete.has(el.parentId)) {
                idsToDelete.add(el.id);
            }
        });

        const newElements = prev.elements.filter(el => !idsToDelete.has(el.id));
        return {
            ...withHistory(prev, newElements),
            selectedIds: []
        };
    });
  }, []);

  const handleSelect = useCallback((id: string | null, multi: boolean = false) => {
      setState(prev => {
          if (id === null) {
              return { ...prev, selectedIds: [] };
          }
          let targetId = id;
          const el = prev.elements.find(e => e.id === id);
          if (el && el.parentId) {
              targetId = el.parentId;
          }

          if (multi) {
              const alreadySelected = prev.selectedIds.includes(targetId);
              return {
                  ...prev,
                  selectedIds: alreadySelected 
                    ? prev.selectedIds.filter(pid => pid !== targetId)
                    : [...prev.selectedIds, targetId]
              };
          } else {
              return { ...prev, selectedIds: [targetId] };
          }
      });
  }, []);

  const handleGroup = useCallback(() => {
    setState(prev => {
        if (prev.selectedIds.length < 2) return prev;
        const groupId = uuidv4();
        const newGroup: CanvasElement = {
            id: groupId,
            type: ElementType.GROUP,
            x: 0, y: 0, width: 0, height: 0, 
            rotation: 0, opacity: 1, zIndex: prev.elements.length,
            content: 'Group',
            visible: true, locked: false, parentId: null, expanded: true
        };
        const newElements = prev.elements.map(el => {
            if (prev.selectedIds.includes(el.id)) {
                return { ...el, parentId: groupId };
            }
            return el;
        });
        return {
            ...withHistory(prev, [...newElements, newGroup]),
            selectedIds: [groupId]
        };
    });
  }, []);

  const handleUngroup = useCallback(() => {
    setState(prev => {
        const groupsToUngroup = prev.selectedIds.filter(id => prev.elements.find(e => e.id === id)?.type === ElementType.GROUP);
        if (groupsToUngroup.length === 0) return prev;
        const newElements = prev.elements.filter(el => !groupsToUngroup.includes(el.id)).map(el => {
            if (el.parentId && groupsToUngroup.includes(el.parentId)) {
                return { ...el, parentId: null };
            }
            return el;
        });
        return {
            ...withHistory(prev, newElements),
            selectedIds: []
        };
    });
  }, []);

  const toggleVisibility = useCallback((id: string) => {
      setState(prev => {
          const newElements = prev.elements.map(el => el.id === id ? { ...el, visible: !el.visible } : el);
          return withHistory(prev, newElements);
      });
  }, []);

  const toggleLock = useCallback((id: string) => {
      setState(prev => {
          const newElements = prev.elements.map(el => el.id === id ? { ...el, locked: !el.locked } : el);
          return withHistory(prev, newElements);
      });
  }, []);

  const handleReorderLayers = useCallback((draggedId: string, targetId: string) => {
    setState(prev => {
      const visualIds = [...prev.elements].sort((a, b) => b.zIndex - a.zIndex).map(el => el.id);
      const fromIndex = visualIds.indexOf(draggedId);
      const toIndex = visualIds.indexOf(targetId);
      if (fromIndex === -1 || toIndex === -1) return prev;
      visualIds.splice(fromIndex, 1);
      visualIds.splice(toIndex, 0, draggedId);
      const total = visualIds.length;
      const newElements = prev.elements.map(el => {
        const newVisualIndex = visualIds.indexOf(el.id);
        return { ...el, zIndex: total - 1 - newVisualIndex };
      });
      return withHistory(prev, newElements);
    });
  }, []);

  const setPanZoom = useCallback((pan: { x: number; y: number }, zoom: number) => {
    setState(prev => ({ ...prev, pan, zoom }));
  }, []);

  const handleAddLayer = useCallback(() => {
    let type: ElementType = ElementType.EMPTY;
    let content = '';
    let width = 200;
    let height = 200;
    let style: any = {};
    let shapeType: 'rectangle' | 'circle' | undefined = undefined;

    switch (activeTool) {
        case ToolType.RECTANGLE:
            type = ElementType.SHAPE;
            content = 'rect';
            shapeType = 'rectangle';
            style = { backgroundColor: '#64748b' };
            break;
        case ToolType.TEXT:
            type = ElementType.TEXT;
            content = 'New Text';
            width = 300;
            height = 60;
            style = { color: '#f8fafc', fontSize: 32 };
            break;
        case ToolType.IMAGE:
            type = ElementType.IMAGE;
            content = 'https://picsum.photos/300/200';
            width = 300;
            height = 200;
            break;
        case ToolType.ART_GEN:
            type = ElementType.ART_GEN;
            content = ''; 
            width = 300;
            height = 300;
            style = { backgroundColor: '#1e1b4b' };
            break;
        case ToolType.SELECT:
        case ToolType.HAND:
        default:
            type = ElementType.EMPTY;
            content = '';
            style = { borderStyle: 'dashed', borderWidth: 2, borderColor: '#475569' };
            break;
    }

    const newEl: CanvasElement = {
        id: uuidv4(),
        type,
        shapeType,
        x: CANVAS_SIZE.width / 2 - width / 2, // Center new items
        y: CANVAS_SIZE.height / 2 - height / 2,
        width,
        height,
        rotation: 0,
        opacity: 1,
        zIndex: state.elements.length,
        content,
        visible: true,
        locked: false,
        parentId: null,
        modelId: settings.imageModel,
        style
    };
    addElement(newEl);
  }, [addElement, activeTool, settings.imageModel, state.elements.length]);

  const handleQuickAction = useCallback((type: 'ART_GEN' | 'IMAGE' | 'TEXT' | 'SHAPE') => {
      if (type === 'IMAGE') {
          quickImageRef.current?.click();
          return;
      }
      
      let newType = ElementType.EMPTY;
      let content = '';
      let width = 200;
      let height = 200;
      let style: any = {};
      let shapeType: 'rectangle' | 'circle' | undefined = undefined;

      if (type === 'ART_GEN') {
          newType = ElementType.ART_GEN;
          width = 300;
          height = 300;
          style = { backgroundColor: '#1e1b4b' };
      } else if (type === 'TEXT') {
          newType = ElementType.TEXT;
          content = 'Quick Text';
          width = 300;
          height = 60;
          style = { color: '#f8fafc', fontSize: 32 };
      } else if (type === 'SHAPE') {
          newType = ElementType.SHAPE;
          shapeType = 'rectangle';
          content = 'rect';
          style = { backgroundColor: '#64748b' };
      }

      const newEl: CanvasElement = {
        id: uuidv4(),
        type: newType,
        shapeType,
        x: CANVAS_SIZE.width / 2 - width / 2,
        y: CANVAS_SIZE.height / 2 - height / 2,
        width,
        height,
        rotation: 0,
        opacity: 1,
        zIndex: state.elements.length,
        content,
        visible: true,
        locked: false,
        parentId: null,
        modelId: settings.imageModel,
        style
      };
      addElement(newEl);

  }, [addElement, state.elements.length, settings.imageModel]);

  // --- AI Context ---
  
  const getCanvasContext = useCallback(() => {
    return JSON.stringify({
      meta: {
        selectedElementIds: state.selectedIds,
        viewport: {
          zoom: state.zoom.toFixed(2),
          pan: { x: state.pan.x.toFixed(0), y: state.pan.y.toFixed(0) }
        }
      },
      elements: state.elements.map(e => ({
        id: e.id,
        type: e.type,
        visible: e.visible,
        locked: e.locked,
        geometry: { x: Math.round(e.x), y: Math.round(e.y), width: Math.round(e.width), height: Math.round(e.height) },
        appearance: { opacity: e.opacity, zIndex: e.zIndex, ...e.style },
        content: e.type === ElementType.TEXT ? e.content : `[${e.type}]`
      }))
    });
  }, [state.elements, state.selectedIds, state.zoom, state.pan]);

  // --- AI Handlers ---
  const executeAIAction = async (aiResponse: AIAction) => {
    const { action, parameters } = aiResponse;
    switch (action) {
      case 'ADD_ELEMENT': {
        const newEl: CanvasElement = {
          id: uuidv4(),
          type: parameters.elementType || ElementType.SHAPE,
          x: 400, y: 300, width: 200, height: 200, rotation: 0, opacity: 1, zIndex: state.elements.length,
          content: parameters.content || '', visible: true, locked: false, parentId: null, modelId: settings.imageModel,
          style: { backgroundColor: parameters.elementType === 'SHAPE' ? '#64748b' : undefined, color: '#fff', fontSize: 24 }
        };
        addElement(newEl);
        break;
      }
      case 'UPDATE_ELEMENT': {
        const targetIds = parameters.targetId === 'selection' ? state.selectedIds : [parameters.targetId];
        targetIds.forEach((targetId: string) => {
            const updates: any = {};
            const p = parameters.property; const v = parameters.value;
            if (['x','y','width','height','opacity','rotation'].includes(p)) updates[p] = parseFloat(v);
            else if (p === 'color') {
                const el = state.elements.find(e => e.id === targetId);
                if (el?.type === ElementType.TEXT) updates.style = { ...el.style, color: v };
                else updates.style = { ...el?.style, backgroundColor: v };
            } else if (p === 'text' || p === 'content') updates.content = v;
            else if (p === 'visible') updates.visible = v === 'true';
            else if (p === 'locked') updates.locked = v === 'true';
            updateElement(targetId, updates);
        });
        break;
      }
      case 'GENERATE_IMAGE': {
        try {
            const base64Image = await generateImageAsset(parameters.imagePrompt, settings);
            if (base64Image) {
                const newEl: CanvasElement = {
                    id: uuidv4(), type: ElementType.IMAGE, x: 200, y: 200, width: 512, height: 512, rotation: 0, opacity: 1, zIndex: state.elements.length,
                    content: base64Image, visible: true, locked: false, parentId: null, modelId: settings.imageModel
                };
                addElement(newEl);
            }
        } catch (e) { console.error("Failed to generate"); }
        break;
      }
      case 'DELETE_ELEMENT': {
        if (parameters.targetId === 'selection') deleteElements(state.selectedIds);
        else deleteElements([parameters.targetId]);
        break;
      }
    }
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(blob);
    });
  };

  const handleVoiceCommand = async (audioBlob: Blob) => {
    setIsProcessingAI(true);
    try {
        const base64Audio = await blobToBase64(audioBlob);
        const result = await interpretVoiceCommand(base64Audio, getCanvasContext(), settings);
        await executeAIAction(result);
    } finally { setIsProcessingAI(false); }
  };

  const handleTextCommand = async (text: string) => {
    setIsProcessingAI(true);
    try {
        const result = await interpretTextCommand(text, getCanvasContext(), settings);
        await executeAIAction(result);
    } finally { setIsProcessingAI(false); }
  };
  
  if (showSplash) {
      return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  return (
    <div className="w-full h-[100dvh] flex flex-col relative overflow-hidden bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <HeaderMenu 
        theme={theme}
        isCollaborating={isCollaborating}
        onToggleTheme={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
        onToggleCollaboration={() => setIsCollaborating(!isCollaborating)}
        onNewSketch={handleNewSketch}
        onSave={handleSave}
        onImport={handleImport}
        onExport={handleExport}
        onOpenGallery={handleOpenGallery}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />
      <div className="flex-1 relative overflow-hidden">
        {isCollaborating && <Collaborators />}
        <Toolbar activeTool={activeTool} onSelectTool={setActiveTool} />
        <Artboard 
            elements={state.elements}
            zoom={state.zoom}
            pan={state.pan}
            activeTool={activeTool}
            selectedIds={state.selectedIds}
            onSelect={handleSelect}
            onUpdateElement={updateElement}
            onPanZoomChange={setPanZoom}
        />
        <FloatingOperationsPanel 
            selectedElements={state.elements.filter(el => state.selectedIds.includes(el.id))}
            onDelete={() => deleteElements(state.selectedIds)}
            onUpdate={updateElement}
            onVoiceCommand={handleVoiceCommand}
            isProcessing={isProcessingAI}
            zoom={state.zoom}
            pan={state.pan}
        />
        <LayerPanel 
            elements={state.elements}
            selectedIds={state.selectedIds}
            onSelect={handleSelect}
            onDelete={() => deleteElements(state.selectedIds)}
            onReorder={handleReorderLayers}
            onAddLayer={handleAddLayer}
            onUndo={undo}
            onRedo={redo}
            canUndo={state.historyIndex > 0}
            canRedo={state.historyIndex < state.history.length - 1}
            onUpdateLayerModel={(id, modelId) => updateElement(id, { modelId })}
            onUpdateElement={updateElement}
            settings={settings}
            onGroup={handleGroup}
            onUngroup={handleUngroup}
            onToggleVisibility={toggleVisibility}
            onToggleLock={toggleLock}
        />
        
        {/* Hidden Input for Quick Import */}
        <input 
            type="file" 
            ref={quickImageRef} 
            className="hidden" 
            onChange={handleImport} 
            accept="image/*" 
        />
        
        <PromptBar 
            isProcessing={isProcessingAI}
            onVoiceCommand={handleVoiceCommand}
            onTextCommand={handleTextCommand}
            onQuickAction={handleQuickAction}
        />
        <SettingsModal 
            isOpen={isSettingsOpen} 
            onClose={() => setIsSettingsOpen(false)}
            settings={settings}
            onUpdateSettings={setSettings}
        />
        <ExportModal 
            isOpen={isExportOpen} 
            onClose={() => setIsExportOpen(false)}
        />
      </div>
    </div>
  );
};