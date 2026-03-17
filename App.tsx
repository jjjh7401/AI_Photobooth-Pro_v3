
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AppState, SYSTEM_PROMPT, HistoryItem, AppMode, AspectRatio, LightingStyle } from './types';
import { generateRefinedPrompt, generatePreviewImage, generateFinalImage, editImage } from './services/geminiService';
import { fileToDataUrl } from './utils';

// Icons
const UploadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 mb-2 text-gray-400">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
  </svg>
);

const PhotoIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mb-1 text-gray-400">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
);

const XMarkIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const DownloadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
  </svg>
);

const ZoomInIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
  </svg>
);

const ZoomOutIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM7.5 10.5h6" />
  </svg>
);

const ChevronLeftIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
);

const ChevronRightIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
);

const CopyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
  </svg>
);

interface ImageModalProps {
    historyItems: HistoryItem[];
    initialIndex: number;
    onClose: () => void;
    onAddHistoryItem: (newUrl: string, type: 'preview' | 'final', prompt: string) => void;
}

type DrawTool = 'brush' | 'box' | 'arrow' | 'text' | null;

const ImageModal: React.FC<ImageModalProps> = ({ historyItems, initialIndex, onClose, onAddHistoryItem }) => {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [editPrompt, setEditPrompt] = useState("");
    const [isEditing, setIsEditing] = useState(false);

    // Drawing state
    const [activeTool, setActiveTool] = useState<DrawTool>('brush');
    const [brushSize, setBrushSize] = useState(150);
    const [isDrawing, setIsDrawing] = useState(false);
    const [startPoint, setStartPoint] = useState<{x: number, y: number} | null>(null);
    const [canvasSnapshot, setCanvasSnapshot] = useState<ImageData | null>(null);
    const [textEntry, setTextEntry] = useState<{ x: number, y: number, text: string } | null>(null);
    
    const containerRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const textInputRef = useRef<HTMLInputElement>(null);
    const currentItem = historyItems[currentIndex];
    
    useEffect(() => {
        setScale(1);
        setPosition({ x: 0, y: 0 });
        setEditPrompt("");
        clearCanvas();
    }, [currentIndex]);

    const clearCanvas = () => {
        if (!canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    };
    
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') handlePrev();
            if (e.key === 'ArrowRight') handleNext();
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentIndex, historyItems.length]);

    const handlePrev = () => {
        if (currentIndex < historyItems.length - 1) {
            setCurrentIndex(prev => prev + 1);
        }
    };

    const handleNext = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        }
    };

    const handleWheel = (e: React.WheelEvent) => {
        e.stopPropagation();
        const newScale = Math.min(Math.max(1, scale + (e.deltaY > 0 ? -0.1 : 0.1)), 4);
        setScale(newScale);
        if (newScale === 1) setPosition({ x: 0, y: 0 });
    };

    const drawArrow = (ctx: CanvasRenderingContext2D, fromx: number, fromy: number, tox: number, toy: number) => {
        const headlen = 50; // Increased arrowhead size
        const angle = Math.atan2(toy - fromy, tox - fromx);
        ctx.beginPath();
        ctx.moveTo(fromx, fromy);
        ctx.lineTo(tox, toy);
        ctx.lineWidth = 4; // Thinner line
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(tox, toy);
        ctx.lineTo(tox - headlen * Math.cos(angle - Math.PI / 6), toy - headlen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(tox - headlen * Math.cos(angle + Math.PI / 6), toy - headlen * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
    };

    const getCanvasPos = (e: React.MouseEvent | React.TouchEvent) => {
        if (!canvasRef.current) return { x: 0, y: 0 };
        const rect = canvasRef.current.getBoundingClientRect();
        let clientX, clientY;
        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }
        return {
            x: (clientX - rect.left) * (canvasRef.current.width / rect.width),
            y: (clientY - rect.top) * (canvasRef.current.height / rect.height)
        };
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (activeTool) {
            e.preventDefault();
            e.stopPropagation();
            const pos = getCanvasPos(e);

            if (activeTool === 'text') {
                setTextEntry({ x: pos.x, y: pos.y, text: '' });
                setTimeout(() => textInputRef.current?.focus(), 10);
                return;
            }

            setIsDrawing(true);
            setStartPoint(pos);
            const ctx = canvasRef.current?.getContext('2d');
            if (ctx) {
                if (activeTool === 'box' || activeTool === 'arrow') {
                    setCanvasSnapshot(ctx.getImageData(0, 0, canvasRef.current!.width, canvasRef.current!.height));
                }

                if (activeTool === 'brush') {
                    ctx.beginPath();
                    ctx.moveTo(pos.x, pos.y);
                    ctx.lineJoin = 'round';
                    ctx.lineCap = 'round';
                    ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)'; // Semi-transparent red
                    ctx.lineWidth = brushSize;
                }
            }
            return;
        }
        if (scale > 1) {
            setIsDragging(true);
            setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (activeTool && isDrawing && canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            if (!ctx) return;
            const pos = getCanvasPos(e);

            if (activeTool === 'brush') {
                ctx.lineTo(pos.x, pos.y);
                ctx.stroke();
            } else if ((activeTool === 'box' || activeTool === 'arrow') && canvasSnapshot && startPoint) {
                ctx.putImageData(canvasSnapshot, 0, 0);
                ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
                ctx.fillStyle = 'rgba(239, 68, 68, 0.6)';

                if (activeTool === 'box') {
                    ctx.lineWidth = 6;
                    ctx.strokeRect(startPoint.x, startPoint.y, pos.x - startPoint.x, pos.y - startPoint.y);
                } else if (activeTool === 'arrow') {
                    drawArrow(ctx, startPoint.x, startPoint.y, pos.x, pos.y);
                }
            }
            return;
        }
        if (isDragging && scale > 1) {
            setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
        }
    };

    const handleMouseUp = () => {
        if (activeTool && isDrawing) {
            setIsDrawing(false);
            setStartPoint(null);
            setCanvasSnapshot(null);
            return;
        }
        setIsDragging(false);
    };

    const finalizeText = () => {
        if (textEntry && canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            if (ctx && textEntry.text.trim()) {
                const fontSize = Math.max(24, brushSize * 0.3);
                ctx.font = `bold ${fontSize}px sans-serif`;
                ctx.fillStyle = '#ef4444'; // Solid Red
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(textEntry.text, textEntry.x, textEntry.y);
            }
        }
        setTextEntry(null);
    };

    const handleDownload = () => {
        if (!currentItem) return;
        const link = document.createElement('a');
        link.href = currentItem.url;
        link.download = `generated-${currentItem.type}-${currentItem.timestamp}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleEdit = async () => {
        if (!currentItem || !editPrompt.trim()) return;
        setIsEditing(true);
        try {
            const finalCanvas = document.createElement('canvas');
            const img = imageRef.current;
            if (!img || !canvasRef.current) throw new Error("Assets not ready");
            
            finalCanvas.width = img.naturalWidth;
            finalCanvas.height = img.naturalHeight;
            const ctx = finalCanvas.getContext('2d');
            if (!ctx) throw new Error("Context error");
            
            ctx.drawImage(img, 0, 0);
            ctx.drawImage(canvasRef.current, 0, 0, img.naturalWidth, img.naturalHeight);
            
            const markedUpBase64 = finalCanvas.toDataURL('image/png');
            const isPro = currentItem.type === 'final';
            
            const finalPrompt = `I have marked areas on the image with red marks. ${editPrompt}. Please output the result WITHOUT the red marks. Focus on modifying product quantity or position as requested in the marked areas.`;
            const newImage = await editImage(markedUpBase64, finalPrompt, isPro);
            
            onAddHistoryItem(newImage, currentItem.type, editPrompt);
            setCurrentIndex(0);
            setEditPrompt(""); 
            clearCanvas();
        } catch (e) {
            console.error(e);
            alert("Failed to edit image.");
        } finally {
            setIsEditing(false);
        }
    };

    if (!currentItem) return null;

    const getInputStyles = () => {
        if (!textEntry || !canvasRef.current) return {};
        const rect = canvasRef.current.getBoundingClientRect();
        const ratioX = rect.width / canvasRef.current.width;
        const ratioY = rect.height / canvasRef.current.height;
        return {
            left: `${textEntry.x * ratioX}px`,
            top: `${textEntry.y * ratioY}px`,
            fontSize: `${Math.max(24, brushSize * 0.3) * ratioY}px`,
            color: '#ef4444',
            position: 'absolute' as 'absolute',
            transform: 'translate(-50%, -50%)',
            background: 'transparent',
            border: '1px dashed #ef4444',
            outline: 'none',
            zIndex: 100,
            textAlign: 'center' as 'center',
            fontWeight: 'bold',
            minWidth: '50px'
        };
    };

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#050505] font-sans" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex justify-between items-center p-4 bg-black/50 border-b border-white/5">
                <div className="text-white font-medium flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${currentItem.type === 'final' ? 'bg-yellow-600' : 'bg-blue-600'}`}>
                        {currentItem.type === 'final' ? 'PRO 4K' : 'PREVIEW'}
                    </span>
                    <span className="text-sm opacity-60">Identity Viewer</span>
                    <span className="text-xs opacity-40">
                        {historyItems.length - currentIndex} / {historyItems.length}
                    </span>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex bg-white/5 rounded-lg p-1 border border-white/10">
                        <button onClick={() => setScale(Math.min(4, scale + 0.5))} className="p-2 hover:bg-white/5 rounded text-white" title="Zoom In"><ZoomInIcon/></button>
                        <button onClick={() => { setScale(1); setPosition({x:0,y:0}); }} className="px-3 py-2 text-xs font-mono hover:bg-white/5 rounded text-slate-300">
                           {Math.round(scale * 100)}%
                        </button>
                        <button onClick={() => setScale(Math.max(1, scale - 0.5))} className="p-2 hover:bg-white/5 rounded text-white" title="Zoom Out"><ZoomOutIcon/></button>
                    </div>
                    <button onClick={handleDownload} className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-lg text-sm transition font-medium">
                        <DownloadIcon /> Download
                    </button>
                    <button onClick={onClose} className="hover:bg-red-500/80 text-white p-2 rounded-full transition">
                        <XMarkIcon />
                    </button>
                </div>
            </div>

            <div className="flex-grow flex overflow-hidden relative">
                {/* Main Content Area */}
                <div className="flex-grow relative flex items-center justify-center bg-black/20 overflow-hidden" ref={containerRef} onWheel={handleWheel} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
                    {currentIndex < historyItems.length - 1 && (
                         <button onClick={handlePrev} className="absolute left-6 top-1/2 -translate-y-1/2 z-30 p-4 bg-black/40 hover:bg-white/10 rounded-full text-white transition backdrop-blur-md border border-white/5">
                            <ChevronLeftIcon />
                         </button>
                    )}
                    {currentIndex > 0 && (
                         <button onClick={handleNext} className="absolute right-6 top-1/2 -translate-y-1/2 z-30 p-4 bg-black/40 hover:bg-white/10 rounded-full text-white transition backdrop-blur-md border border-white/5">
                            <ChevronRightIcon />
                         </button>
                    )}
                    
                    <div style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`, transition: isDragging || isDrawing ? 'none' : 'transform 0.2s cubic-bezier(0.2, 0, 0, 1)' }} className={`max-w-full max-h-full flex items-center justify-center relative ${activeTool ? 'cursor-crosshair' : (scale > 1 ? 'cursor-grab active:cursor-grabbing' : '')}`}>
                         <img ref={imageRef} src={currentItem.url} alt="Full View" className="max-w-[calc(100vw-340px)] max-h-[85vh] object-contain shadow-[0_0_100px_rgba(0,0,0,0.5)]" draggable={false} onLoad={(e) => {
                             const img = e.currentTarget;
                             if (canvasRef.current) {
                                 canvasRef.current.width = img.naturalWidth;
                                 canvasRef.current.height = img.naturalHeight;
                             }
                         }} />
                         <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full pointer-events-none" />
                         
                         {textEntry && (
                             <input 
                                ref={textInputRef}
                                type="text"
                                value={textEntry.text}
                                onChange={(e) => setTextEntry({...textEntry, text: e.target.value})}
                                onBlur={finalizeText}
                                onKeyDown={(e) => e.key === 'Enter' && finalizeText()}
                                style={getInputStyles()}
                             />
                         )}
                    </div>
                </div>

                {/* Sidebar (Refinement Panel) */}
                <div className="w-80 bg-[#0a0a0a] border-l border-white/5 p-6 flex flex-col z-20 shadow-2xl shrink-0 overflow-y-auto">
                    <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6">Refinement Tools</h3>
                    
                    {/* Tool Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-8">
                        <button 
                            onClick={() => setActiveTool('brush')}
                            className={`py-4 rounded-xl font-bold text-sm transition-all border ${activeTool === 'brush' ? 'bg-blue-600 border-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.4)] text-white' : 'bg-[#0f0f0f] border-white/5 text-slate-400 hover:bg-white/5'}`}
                        >
                            Brush
                        </button>
                        <button 
                            onClick={() => setActiveTool('box')}
                            className={`py-4 rounded-xl font-bold text-sm transition-all border ${activeTool === 'box' ? 'bg-blue-600 border-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.4)] text-white' : 'bg-[#0f0f0f] border-white/5 text-slate-400 hover:bg-white/5'}`}
                        >
                            Box
                        </button>
                        <button 
                            onClick={() => setActiveTool('arrow')}
                            className={`py-4 rounded-xl font-bold text-sm transition-all border ${activeTool === 'arrow' ? 'bg-blue-600 border-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.4)] text-white' : 'bg-[#0f0f0f] border-white/5 text-slate-400 hover:bg-white/5'}`}
                        >
                            Arrow
                        </button>
                        <button 
                            onClick={() => setActiveTool('text')}
                            className={`py-4 rounded-xl font-bold text-sm transition-all border ${activeTool === 'text' ? 'bg-blue-600 border-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.4)] text-white' : 'bg-[#0f0f0f] border-white/5 text-slate-400 hover:bg-white/5'}`}
                        >
                            Text
                        </button>
                    </div>

                    {/* Diameter Slider */}
                    <div className="mb-8">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Brush Diameter</span>
                            <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">{brushSize}PX</span>
                        </div>
                        <input 
                            type="range" 
                            min="5" max="300" 
                            value={brushSize} 
                            onChange={(e) => setBrushSize(parseInt(e.target.value))} 
                            className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500" 
                        />
                    </div>

                    {/* Reset Button */}
                    <button 
                        onClick={clearCanvas}
                        className="w-full py-4 rounded-xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-500 text-[10px] font-bold uppercase tracking-widest transition-all mb-12"
                    >
                        Reset Markers
                    </button>

                    {/* AI Prompt Area */}
                    <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6">AI Directed Refinement</h3>
                    <div className="relative mb-6">
                        <textarea 
                            className="w-full h-40 bg-[#0f0f0f] border border-white/5 rounded-3xl p-6 text-sm text-slate-400 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 transition-all resize-none leading-relaxed" 
                            placeholder="Ex: 'Increase terminal sharpness', 'Add subtle ink splatters'..." 
                            value={editPrompt} 
                            onChange={(e) => setEditPrompt(e.target.value)}
                        />
                    </div>

                    {/* Apply Button */}
                    <button 
                        onClick={handleEdit} 
                        disabled={isEditing || !editPrompt.trim()} 
                        className={`w-full py-5 rounded-2xl font-bold text-sm shadow-xl transition-all ${isEditing || !editPrompt.trim() ? 'bg-white/5 text-white/20 cursor-not-allowed' : 'bg-white text-black hover:bg-slate-200'}`}
                    >
                        {isEditing ? "PROCESSING..." : "APPLY CHANGES"}
                    </button>

                    {/* Context Info */}
                    <div className="mt-12 pt-8 border-t border-white/5">
                        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Original Context</h4>
                        <div className="text-[10px] text-slate-500 leading-relaxed font-mono opacity-60 line-clamp-6">{currentItem.prompt || "No context data."}</div>
                    </div>
                </div>
            </div>
        </div>
    );
};


const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    activeMode: AppMode.BEAUTY,
    uploadedFiles: [],
    referenceFiles: [],
    aspectRatio: AspectRatio.RATIO_16_9,
    concept: '',
    lightingStyle: LightingStyle.NONE,
    bgFiles: [],
    bgColor: '#f0f0f0',
    quantities: { product1: 1, product2: 0, product3: 0 },
    generatedPrompt: '',
    previewImage: null,
    finalImage: null,
    isGeneratingPrompt: false,
    isGeneratingPreview: false,
    isGeneratingFinal: false,
    error: null,
    history: [],
  });

  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [refPreviewUrls, setRefPreviewUrls] = useState<string[]>([]);
  const [bgPreviewUrls, setBgPreviewUrls] = useState<string[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isRefDragActive, setIsRefDragActive] = useState(false);
  const [isBgDragActive, setIsBgDragActive] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const refFileInputRef = useRef<HTMLInputElement>(null);
  const bgFileInputRef = useRef<HTMLInputElement>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalInitialIndex, setModalInitialIndex] = useState(0);
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);

  const checkApiKey = useCallback(async () => {
    // @ts-ignore
    if (window.aistudio && window.aistudio.hasSelectedApiKey) {
      // @ts-ignore
      const has = await window.aistudio.hasSelectedApiKey();
      setHasApiKey(has);
      return has;
    }
    // Fallback check for env vars
    const key = process.env.API_KEY || process.env.GEMINI_API_KEY || (window as any).process?.env?.API_KEY || (window as any).process?.env?.GEMINI_API_KEY;
    const exists = !!(key && key !== 'undefined' && key !== 'null');
    setHasApiKey(exists);
    return exists;
  }, []);

  const openKeySelector = async () => {
    // @ts-ignore
    if (window.aistudio && window.aistudio.openSelectKey) {
      // @ts-ignore
      await window.aistudio.openSelectKey();
      // Re-check after a short delay or just assume success
      setTimeout(checkApiKey, 2000);
    }
  };

  useEffect(() => {
    checkApiKey();
    // Periodically check if key is missing
    const interval = setInterval(checkApiKey, 5000);
    return () => clearInterval(interval);
  }, [checkApiKey]);

  const hoveredZoneRef = useRef<'product' | 'reference' | 'background' | null>(null);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files).filter(file => file.type.startsWith('image/'));
    setState(prev => ({ ...prev, uploadedFiles: [...prev.uploadedFiles, ...fileArray] }));
    const urls = await Promise.all(fileArray.map(fileToDataUrl));
    setPreviewUrls(prev => [...prev, ...urls]);
  }, []);

  const handleReferenceFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files).filter(file => file.type.startsWith('image/'));
    setState(prev => ({ ...prev, referenceFiles: [...prev.referenceFiles, ...fileArray] }));
    const urls = await Promise.all(fileArray.map(fileToDataUrl));
    setRefPreviewUrls(prev => [...prev, ...urls]);
  }, []);

  const handleBgFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files).filter(file => file.type.startsWith('image/'));
    setState(prev => ({ ...prev, bgFiles: [...prev.bgFiles, ...fileArray] }));
    const urls = await Promise.all(fileArray.map(fileToDataUrl));
    setBgPreviewUrls(prev => [...prev, ...urls]);
  }, []);

  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }
      if (e.clipboardData && e.clipboardData.files && e.clipboardData.files.length > 0) {
        const files = e.clipboardData.files;
        if (hoveredZoneRef.current === 'reference') {
          handleReferenceFiles(files);
        } else if (hoveredZoneRef.current === 'background') {
          handleBgFiles(files);
        } else {
          handleFiles(files);
        }
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, [handleFiles, handleReferenceFiles, handleBgFiles]);

  const removeFile = (idx: number) => {
    setState(prev => ({ ...prev, uploadedFiles: prev.uploadedFiles.filter((_, i) => i !== idx) }));
    setPreviewUrls(prev => prev.filter((_, i) => i !== idx));
  };
  const removeRefFile = (idx: number) => {
    setState(prev => ({ ...prev, referenceFiles: prev.referenceFiles.filter((_, i) => i !== idx) }));
    setRefPreviewUrls(prev => prev.filter((_, i) => i !== idx));
  };
  const removeBgFile = (idx: number) => {
    setState(prev => ({ ...prev, bgFiles: prev.bgFiles.filter((_, i) => i !== idx) }));
    setBgPreviewUrls(prev => prev.filter((_, i) => i !== idx));
  };

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragActive(true); };
  const onDragLeave = () => setIsDragActive(false);
  const onDrop = (e: React.DragEvent) => { e.preventDefault(); setIsDragActive(false); handleFiles(e.dataTransfer.files); };

  const onRefDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsRefDragActive(true); };
  const onRefDragLeave = () => setIsRefDragActive(false);
  const onRefDrop = (e: React.DragEvent) => { e.preventDefault(); setIsRefDragActive(false); handleReferenceFiles(e.dataTransfer.files); };

  const onBgDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsBgDragActive(true); };
  const onBgDragLeave = () => setIsBgDragActive(false);
  const onBgDrop = (e: React.DragEvent) => { e.preventDefault(); setIsBgDragActive(false); handleBgFiles(e.dataTransfer.files); };

  const addToHistory = (url: string, type: 'preview' | 'final', prompt: string) => {
    const newItem: HistoryItem = { id: Date.now().toString(), url, type, prompt, timestamp: Date.now() };
    setState(prev => ({ ...prev, history: [newItem, ...prev.history], previewImage: type === 'preview' ? url : prev.previewImage, finalImage: type === 'final' ? url : prev.finalImage }));
  };

  const handleGeneratePrompt = async () => {
    setState(prev => ({ ...prev, isGeneratingPrompt: true, error: null }));
    try {
      const prompt = await generateRefinedPrompt(
        state.uploadedFiles, state.referenceFiles, state.aspectRatio, state.concept, 
        state.lightingStyle, 
        state.activeMode,
        state.bgFiles, state.bgColor, state.quantities
      );
      setState(prev => ({ ...prev, generatedPrompt: prompt, isGeneratingPrompt: false }));
    } catch (err: any) {
      setState(prev => ({ 
        ...prev, 
        error: err.message || "Error", 
        isGeneratingPrompt: false 
      }));
    }
  };

  const handleGeneratePreview = async () => {
    if (!state.generatedPrompt) return;
    setState(prev => ({ ...prev, isGeneratingPreview: true, error: null }));
    try {
      const img = await generatePreviewImage(state.uploadedFiles, state.referenceFiles, state.generatedPrompt, state.aspectRatio);
      addToHistory(img, 'preview', state.generatedPrompt);
    } catch (err: any) {
      setState(prev => ({ ...prev, error: err.message || "Error", isGeneratingPreview: false }));
    } finally {
      setState(prev => ({ ...prev, isGeneratingPreview: false }));
    }
  };

  const handleGenerateFinal = async () => {
    if (!state.generatedPrompt) return;
    setState(prev => ({ ...prev, isGeneratingFinal: true, error: null }));
    try {
      const img = await generateFinalImage(state.uploadedFiles, state.referenceFiles, state.generatedPrompt, state.aspectRatio);
      addToHistory(img, 'final', state.generatedPrompt);
    } catch (err: any) {
      setState(prev => ({ ...prev, error: err.message || "Error", isGeneratingFinal: false }));
    } finally {
      setState(prev => ({ ...prev, isGeneratingFinal: false }));
    }
  };

  const copyPromptToClipboard = () => {
    if (!state.generatedPrompt) return;
    navigator.clipboard.writeText(state.generatedPrompt).then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex font-sans overflow-hidden">
      {modalOpen && state.history.length > 0 && <ImageModal historyItems={state.history} initialIndex={modalInitialIndex} onClose={() => setModalOpen(false)} onAddHistoryItem={addToHistory} />}
      
      <div className="w-[100px] bg-slate-950 border-r border-slate-800 flex flex-col items-center py-6 gap-4 shrink-0 h-screen overflow-y-auto">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">History</div>
          {state.history.map((item, idx) => (
              <div key={item.id} className="w-16 h-16 rounded-lg bg-slate-800 border border-slate-700 hover:border-blue-500 cursor-pointer overflow-hidden relative group transition-all" onClick={() => { setModalInitialIndex(idx); setModalOpen(true); }}>
                  <img src={item.url} alt="thumb" className="w-full h-full object-cover" />
                  <div className={`absolute bottom-0 left-0 right-0 h-1 ${item.type === 'final' ? 'bg-yellow-500' : 'bg-blue-500'}`}></div>
              </div>
          ))}
      </div>

      <div className="flex-1 flex p-6 gap-6 overflow-y-auto h-screen">
        <div className="w-1/3 min-w-[380px] bg-slate-950 rounded-2xl p-6 flex flex-col border border-slate-800 shadow-xl overflow-y-auto max-h-[95vh]">
            <div className="flex flex-col gap-4 mb-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-xl font-bold text-blue-450">AI PHOTOBOOTH</h1>
                    <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800">
                        <button 
                            onClick={() => setState(p => ({ ...p, activeMode: AppMode.BEAUTY }))}
                            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${state.activeMode === AppMode.BEAUTY ? 'bg-blue-450 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            BEAUTY
                        </button>
                        <button 
                            onClick={() => setState(p => ({ ...p, activeMode: AppMode.COMPOSITION }))}
                            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${state.activeMode === AppMode.COMPOSITION ? 'bg-blue-450 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            COMPOSITION
                        </button>
                    </div>
                </div>

                {hasApiKey === false && (
                    <button 
                        onClick={openKeySelector}
                        className="w-full py-2 bg-amber-500/10 border border-amber-500/50 text-amber-500 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-amber-500/20 transition-all flex items-center justify-center gap-2"
                    >
                        <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
                        Connect API Key Required
                    </button>
                )}
                {hasApiKey === true && (
                    <div className="w-full py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-2">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                        API Connected
                    </div>
                )}
            </div>

            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-semibold mb-2 text-slate-300">1. Upload Product Photos</label>
                    <div 
                        className={`rounded-xl border-2 border-dashed p-3 transition-all ${isDragActive ? 'border-blue-450 bg-blue-450/10' : 'border-slate-700 bg-slate-900/50'}`}
                        onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
                        onMouseEnter={() => hoveredZoneRef.current = 'product'}
                        onMouseLeave={() => hoveredZoneRef.current = null}
                    >
                        <div className="grid grid-cols-3 gap-2">
                            {previewUrls.map((url, idx) => (
                                <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-slate-700 bg-slate-900 group">
                                    <img src={url} alt="p" className="w-full h-full object-cover" />
                                    <button onClick={() => removeFile(idx)} className="absolute top-1 right-1 bg-black/60 rounded-full p-1 opacity-0 group-hover:opacity-100"><XMarkIcon /></button>
                                </div>
                            ))}
                            <button onClick={() => fileInputRef.current?.click()} className="aspect-square rounded-lg border border-dashed border-slate-600 bg-slate-800/50 hover:bg-slate-800 transition flex flex-col items-center justify-center text-[10px] text-slate-400">
                                <UploadIcon />
                                <span>Click or Paste</span>
                            </button>
                        </div>
                        <input type="file" multiple ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => handleFiles(e.target.files)} />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-semibold mb-2 text-slate-300">2. Add Reference Image (Style Only)</label>
                    <div 
                        className={`rounded-xl border-2 border-dashed p-3 transition-all ${isRefDragActive ? 'border-blue-450 bg-blue-450/10' : 'border-slate-700 bg-slate-900/50'}`}
                        onDragOver={onRefDragOver} onDragLeave={onRefDragLeave} onDrop={onRefDrop}
                        onMouseEnter={() => hoveredZoneRef.current = 'reference'}
                        onMouseLeave={() => hoveredZoneRef.current = null}
                    >
                        <div className="grid grid-cols-3 gap-2">
                            {refPreviewUrls.map((url, idx) => (
                                <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-slate-700 bg-slate-900 group">
                                    <img src={url} alt="r" className="w-full h-full object-cover opacity-80" />
                                    <button onClick={() => removeRefFile(idx)} className="absolute top-1 right-1 bg-black/60 rounded-full p-1 opacity-0 group-hover:opacity-100"><XMarkIcon /></button>
                                </div>
                            ))}
                            <button onClick={() => refFileInputRef.current?.click()} className="aspect-square rounded-lg border border-dashed border-slate-600 bg-slate-800/50 hover:bg-slate-800 transition flex flex-col items-center justify-center text-[10px] text-slate-400">
                                <PhotoIcon />
                                <span>Style Ref</span>
                            </button>
                        </div>
                        <input type="file" multiple ref={refFileInputRef} className="hidden" accept="image/*" onChange={(e) => handleReferenceFiles(e.target.files)} />
                        <p className="text-[10px] text-slate-500 mt-2">Arrangement & Style reference only.</p>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-semibold mb-2 text-slate-300">3. 이미지 비율</label>
                    <select value={state.aspectRatio} onChange={(e) => setState(p => ({ ...p, aspectRatio: e.target.value as AspectRatio }))} className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg p-3 text-sm">
                        {Object.values(AspectRatio).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>

                {state.activeMode === AppMode.COMPOSITION && (
                    <>
                        <div>
                            <label className="block text-sm font-semibold mb-2 text-slate-300">4. Background</label>
                            <div className="flex gap-2 mb-3">
                                <input type="color" value={state.bgColor} onChange={(e) => setState(p => ({ ...p, bgColor: e.target.value }))} className="h-10 w-20 bg-slate-900 border border-slate-700 rounded cursor-pointer" />
                                <div className="flex-1 bg-slate-900 border border-slate-700 rounded-lg flex items-center px-3 text-xs text-slate-400 font-mono">
                                    {state.bgColor}
                                </div>
                            </div>
                            <div 
                                className={`rounded-xl border-2 border-dashed p-3 transition-all ${isBgDragActive ? 'border-blue-450 bg-blue-450/10' : 'border-slate-700 bg-slate-900/50'}`}
                                onDragOver={onBgDragOver} onDragLeave={onBgDragLeave} onDrop={onBgDrop}
                                onMouseEnter={() => hoveredZoneRef.current = 'background'}
                                onMouseLeave={() => hoveredZoneRef.current = null}
                            >
                                <div className="grid grid-cols-3 gap-2">
                                    {bgPreviewUrls.map((url, idx) => (
                                        <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-slate-700 bg-slate-900 group">
                                            <img src={url} alt="bg" className="w-full h-full object-cover" />
                                            <button onClick={() => removeBgFile(idx)} className="absolute top-1 right-1 bg-black/60 rounded-full p-1 opacity-0 group-hover:opacity-100"><XMarkIcon /></button>
                                        </div>
                                    ))}
                                    <button onClick={() => bgFileInputRef.current?.click()} className="aspect-square rounded-lg border border-dashed border-slate-600 bg-slate-800/50 hover:bg-slate-800 transition flex flex-col items-center justify-center text-[10px] text-slate-400">
                                        <UploadIcon />
                                        <span>BG Image</span>
                                    </button>
                                </div>
                                <input type="file" multiple ref={bgFileInputRef} className="hidden" accept="image/*" onChange={(e) => handleBgFiles(e.target.files)} />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold mb-2 text-slate-300">5. Quantity</label>
                            <div className="flex gap-2 text-[10px]">
                                <div className="flex-1 flex items-center bg-slate-900 border border-slate-800 rounded p-1">
                                    <span className="text-slate-500 mr-2 uppercase">P1</span>
                                    <input type="number" value={state.quantities.product1} onChange={(e) => setState(p => ({ ...p, quantities: { ...p.quantities, product1: parseInt(e.target.value) || 0 } }))} className="w-full bg-slate-950 border-none focus:ring-0 text-center" />
                                </div>
                                <div className="flex-1 flex items-center bg-slate-900 border border-slate-800 rounded p-1">
                                    <span className="text-slate-500 mr-2 uppercase">P2</span>
                                    <input type="number" value={state.quantities.product2} onChange={(e) => setState(p => ({ ...p, quantities: { ...p.quantities, product2: parseInt(e.target.value) || 0 } }))} className="w-full bg-slate-950 border-none focus:ring-0 text-center" />
                                </div>
                                <div className="flex-1 flex items-center bg-slate-900 border border-slate-800 rounded p-1">
                                    <span className="text-slate-500 mr-2 uppercase">P3</span>
                                    <input type="number" value={state.quantities.product3} onChange={(e) => setState(p => ({ ...p, quantities: { ...p.quantities, product3: parseInt(e.target.value) || 0 } }))} className="w-full bg-slate-950 border-none focus:ring-0 text-center" />
                                </div>
                            </div>
                        </div>
                    </>
                )}

                <div>
                    <label className="block text-sm font-semibold mb-2 text-slate-300">{state.activeMode === AppMode.BEAUTY ? '4. Add Concept (Optional)' : '6. Add Concept (Optional)'}</label>
                    <textarea 
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm focus:outline-none h-24 resize-none"
                        placeholder={state.activeMode === AppMode.BEAUTY ? "e.g., 'A cozy winter scene'..." : "e.g., 'Arrange products in two rows'..."}
                        value={state.concept} onChange={(e) => setState(p => ({ ...p, concept: e.target.value }))}
                    />
                </div>

                {state.activeMode === AppMode.BEAUTY && (
                  <div className="pb-8">
                      <label className="block text-sm font-semibold mb-2 text-slate-300">5. 조명 스타일</label>
                      <select value={state.lightingStyle} onChange={(e) => setState(p => ({ ...p, lightingStyle: e.target.value as LightingStyle }))} className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg p-3 text-sm">
                          {Object.values(LightingStyle).map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                  </div>
                )}
            </div>

            {state.error && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm mb-4">
                    {state.error}
                </div>
            )}

            <button onClick={handleGeneratePrompt} disabled={state.isGeneratingPrompt || state.uploadedFiles.length === 0} className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center transition-all mt-auto ${state.isGeneratingPrompt ? 'bg-slate-800' : 'bg-blue-450 hover:bg-blue-500 text-white'}`}>
                {state.isGeneratingPrompt ? "GENERATING PROMPT..." : "GENERATE PROMPT"}
            </button>
        </div>

        <div className="flex-1 flex flex-col gap-6">
            <div className="flex gap-6 h-[350px]">
                <div className="w-1/2 flex flex-col">
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase">Prompt</label>
                        {state.generatedPrompt && (
                            <button onClick={copyPromptToClipboard} className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold uppercase transition-all ${copySuccess ? 'bg-green-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
                                <CopyIcon /> {copySuccess ? 'COPIED' : 'COPY'}
                            </button>
                        )}
                    </div>
                    <textarea 
                        className="flex-grow bg-white text-slate-900 rounded-2xl p-4 overflow-auto border border-slate-200 shadow-sm font-mono text-xs leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        value={state.generatedPrompt}
                        onChange={(e) => setState(p => ({ ...p, generatedPrompt: e.target.value }))}
                        placeholder="Prompt will appear here after generation..."
                    />
                </div>
                <div className="w-1/2 flex flex-col">
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase">Preview (Flash)</label>
                        <button 
                            onClick={handleGeneratePreview} 
                            disabled={!state.generatedPrompt || state.isGeneratingPreview} 
                            className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-all ${!state.generatedPrompt || state.isGeneratingPreview ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-500'}`}
                        >
                            {state.isGeneratingPreview ? 'GENERATING...' : 'GENERATE PREVIEW'}
                        </button>
                    </div>
                    <div className="flex-grow bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative flex items-center justify-center bg-slate-100 group cursor-pointer" onClick={() => { const i = state.history.findIndex(h => h.url === state.previewImage); if (i>=0) {setModalInitialIndex(i); setModalOpen(true);} }}>
                        {state.isGeneratingPreview ? <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div> : state.previewImage ? <img src={state.previewImage} alt="prev" className="w-full h-full object-contain" /> : <span className="text-slate-400 italic">Click Generate to see preview</span>}
                    </div>
                </div>
            </div>

            <div className="flex justify-center items-center gap-4">
                <button onClick={handleGenerateFinal} disabled={!state.generatedPrompt || state.isGeneratingFinal} className="px-10 py-3 rounded-full font-bold text-sm bg-gradient-to-r from-yellow-600 to-yellow-500 text-white shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed">
                    {state.isGeneratingFinal ? "RENDERING 4K..." : "GENERATE FINAL (4K PRO)"}
                </button>
            </div>

            <div className="flex-grow flex flex-col min-h-[350px]">
                <label className="block text-xs font-bold mb-2 text-slate-500 uppercase">Final Result (Pro 4K)</label>
                <div className="flex-grow bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden relative flex items-center justify-center bg-slate-100 group cursor-pointer" onClick={() => { const i = state.history.findIndex(h => h.url === state.finalImage); if (i>=0) {setModalInitialIndex(i); setModalOpen(true);} }}>
                    {state.isGeneratingFinal ? <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500"></div> : state.finalImage ? <img src={state.finalImage} alt="final" className="w-full h-full object-contain" /> : <span className="text-slate-400 italic text-center">Final High-Res Render</span>}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default App;
