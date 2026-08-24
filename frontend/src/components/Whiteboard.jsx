import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Pencil,
  Square,
  Circle,
  Diamond,
  Triangle,
  Minus,
  ArrowRight,
  CornerDownRight,
  MoveRight,
  SeparatorHorizontal,
  StickyNote,
  Type,
  Shapes,
  Eraser,
  Undo2,
  Redo2,
  Trash2,
  Download,
  ChevronDown,
  Upload,
  X,
  Check
} from 'lucide-react';

const Whiteboard = ({ socket, roomId }) => {
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });
  const currentPathRef = useRef([]);
  
  // State
  const [elements, setElements] = useState([]);
  const [history, setHistory] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  
  // Active Tool & Sub-tool
  const [activeTool, setActiveTool] = useState('pen'); // 'pen' | 'shapes' | 'sticky' | 'text' | 'eraser'
  const [selectedShape, setSelectedShape] = useState('rectangle'); // 'line'|'arrow'|'elbow-arrow'|'block-arrow'|'rectangle'|'oval'|'rhombus'|'triangle'|'divider'
  const [isShapesOpen, setIsShapesOpen] = useState(false);
  
  // Styling Properties
  const [color, setColor] = useState('#1e293b'); // stroke color
  const [fillColor, setFillColor] = useState('transparent');
  const [stickyColor, setStickyColor] = useState('#fef08a'); // default yellow sticky
  const [lineWidth, setLineWidth] = useState(3);
  const [previewElement, setPreviewElement] = useState(null);

  // Active Text / Sticky Input modal state
  const [textInput, setTextInput] = useState(null); // { x, y, type: 'sticky'|'text' }
  const [inputValue, setInputValue] = useState('');

  const strokeColors = ['#1e293b', '#2563eb', '#059669', '#dc2626', '#d97706', '#7c3aed', '#db2777', '#ffffff'];
  const stickyColors = ['#fef08a', '#bfdbfe', '#bbf7d0', '#fbcfe8', '#e9d5ff', '#fed7aa'];

  // Redraw all canvas elements
  const redrawCanvas = useCallback((elementList, currentPreview = null) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const allElements = currentPreview ? [...elementList, currentPreview] : elementList;

    allElements.forEach((el) => {
      ctx.save();
      ctx.strokeStyle = el.color || '#1e293b';
      ctx.fillStyle = el.fill || 'transparent';
      ctx.lineWidth = el.lineWidth || 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      switch (el.type) {
        case 'pen':
          if (el.points && el.points.length > 1) {
            ctx.beginPath();
            ctx.moveTo(el.points[0].x, el.points[0].y);
            for (let i = 1; i < el.points.length; i++) {
              ctx.lineTo(el.points[i].x, el.points[i].y);
            }
            ctx.stroke();
          }
          break;

        case 'line':
          ctx.beginPath();
          ctx.moveTo(el.x1, el.y1);
          ctx.lineTo(el.x2, el.y2);
          ctx.stroke();
          break;

        case 'arrow':
          ctx.beginPath();
          ctx.moveTo(el.x1, el.y1);
          ctx.lineTo(el.x2, el.y2);
          ctx.stroke();
          // Draw arrowhead at (x2, y2)
          drawArrowhead(ctx, el.x1, el.y1, el.x2, el.y2, el.color || '#1e293b', 14);
          break;

        case 'elbow-arrow': {
          ctx.beginPath();
          ctx.moveTo(el.x1, el.y1);
          ctx.lineTo(el.x2, el.y1);
          ctx.lineTo(el.x2, el.y2);
          ctx.stroke();
          drawArrowhead(ctx, el.x2, el.y1, el.x2, el.y2, el.color || '#1e293b', 14);
          break;
        }

        case 'block-arrow': {
          drawBlockArrow(ctx, el.x1, el.y1, el.x2, el.y2, el.color, el.fill);
          break;
        }

        case 'rectangle': {
          const w = el.x2 - el.x1;
          const h = el.y2 - el.y1;
          if (el.fill && el.fill !== 'transparent') {
            ctx.fillRect(el.x1, el.y1, w, h);
          }
          ctx.strokeRect(el.x1, el.y1, w, h);
          break;
        }

        case 'oval': {
          const radiusX = Math.abs(el.x2 - el.x1) / 2;
          const radiusY = Math.abs(el.y2 - el.y1) / 2;
          const centerX = Math.min(el.x1, el.x2) + radiusX;
          const centerY = Math.min(el.y1, el.y2) + radiusY;

          ctx.beginPath();
          ctx.ellipse(centerX, centerY, Math.max(radiusX, 1), Math.max(radiusY, 1), 0, 0, 2 * Math.PI);
          if (el.fill && el.fill !== 'transparent') {
            ctx.fill();
          }
          ctx.stroke();
          break;
        }

        case 'rhombus': {
          const cx = (el.x1 + el.x2) / 2;
          const cy = (el.y1 + el.y2) / 2;
          ctx.beginPath();
          ctx.moveTo(cx, el.y1);
          ctx.lineTo(el.x2, cy);
          ctx.lineTo(cx, el.y2);
          ctx.lineTo(el.x1, cy);
          ctx.closePath();
          if (el.fill && el.fill !== 'transparent') {
            ctx.fill();
          }
          ctx.stroke();
          break;
        }

        case 'triangle': {
          const cx = (el.x1 + el.x2) / 2;
          ctx.beginPath();
          ctx.moveTo(cx, el.y1);
          ctx.lineTo(el.x2, el.y2);
          ctx.lineTo(el.x1, el.y2);
          ctx.closePath();
          if (el.fill && el.fill !== 'transparent') {
            ctx.fill();
          }
          ctx.stroke();
          break;
        }

        case 'divider': {
          ctx.beginPath();
          ctx.setLineDash([8, 6]);
          ctx.moveTo(el.x1, el.y1);
          ctx.lineTo(el.x2, el.y1);
          ctx.stroke();
          ctx.setLineDash([]);
          break;
        }

        case 'sticky': {
          const sw = el.width || 140;
          const sh = el.height || 140;
          
          // Drop shadow
          ctx.shadowColor = 'rgba(0,0,0,0.12)';
          ctx.shadowBlur = 10;
          ctx.shadowOffsetY = 4;

          // Sticky background card
          ctx.fillStyle = el.stickyColor || '#fef08a';
          ctx.beginPath();
          ctx.roundRect(el.x, el.y, sw, sh, 10);
          ctx.fill();

          // Reset shadow
          ctx.shadowColor = 'transparent';

          // Top tape effect
          ctx.fillStyle = 'rgba(255,255,255,0.4)';
          ctx.fillRect(el.x + sw / 4, el.y - 4, sw / 2, 8);

          // Text content
          if (el.text) {
            ctx.fillStyle = '#1e293b';
            ctx.font = '14px Inter, sans-serif';
            wrapText(ctx, el.text, el.x + 12, el.y + 28, sw - 24, 20);
          }
          break;
        }

        case 'text': {
          if (el.text) {
            ctx.fillStyle = el.color || '#1e293b';
            ctx.font = '18px Inter, sans-serif';
            ctx.fillText(el.text, el.x, el.y);
          }
          break;
        }

        default:
          break;
      }
      ctx.restore();
    });
  }, []);

  // Arrowhead helper
  const drawArrowhead = (ctx, fromX, fromY, toX, toY, color, size) => {
    const angle = Math.atan2(toY - fromY, toX - fromX);
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - size * Math.cos(angle - Math.PI / 6), toY - size * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(toX - size * Math.cos(angle + Math.PI / 6), toY - size * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  // Block Arrow helper
  const drawBlockArrow = (ctx, x1, y1, x2, y2, strokeColor, fillColor) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    if (len < 10) return;

    const angle = Math.atan2(dy, dx);
    const shaftWidth = Math.min(len * 0.3, 24);
    const headWidth = shaftWidth * 1.8;
    const headLength = Math.min(len * 0.4, 32);
    const shaftLength = len - headLength;

    ctx.save();
    ctx.translate(x1, y1);
    ctx.rotate(angle);

    ctx.beginPath();
    ctx.moveTo(0, -shaftWidth / 2);
    ctx.lineTo(shaftLength, -shaftWidth / 2);
    ctx.lineTo(shaftLength, -headWidth / 2);
    ctx.lineTo(len, 0);
    ctx.lineTo(shaftLength, headWidth / 2);
    ctx.lineTo(shaftLength, shaftWidth / 2);
    ctx.lineTo(0, shaftWidth / 2);
    ctx.closePath();

    if (fillColor && fillColor !== 'transparent') {
      ctx.fillStyle = fillColor;
      ctx.fill();
    } else {
      ctx.fillStyle = strokeColor || '#1e293b';
      ctx.fill();
    }
    ctx.strokeStyle = strokeColor || '#1e293b';
    ctx.stroke();

    ctx.restore();
  };

  // Canvas Text wrap helper
  const wrapText = (ctx, text, x, y, maxWidth, lineHeight) => {
    const words = text.split(' ');
    let line = '';
    let currY = y;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        ctx.fillText(line, x, currY);
        line = words[n] + ' ';
        currY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, currY);
  };

  // Sync canvas dimensions
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;

    const updateSize = () => {
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
      redrawCanvas(elements, previewElement);
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [elements, previewElement, redrawCanvas]);

  // Handle Socket.IO incoming drawing updates from peers
  useEffect(() => {
    if (!socket) return;

    const handleWhiteboardUpdate = (remoteElements) => {
      setElements(remoteElements);
      redrawCanvas(remoteElements);
    };

    socket.on('whiteboard-update', handleWhiteboardUpdate);

    return () => {
      socket.off('whiteboard-update', handleWhiteboardUpdate);
    };
  }, [socket, redrawCanvas]);

  // Coordinate helper
  const getCoords = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  // Mouse Handlers
  const handleMouseDown = (e) => {
    const coords = getCoords(e);
    isDrawingRef.current = true;
    startPosRef.current = coords;

    if (activeTool === 'sticky') {
      isDrawingRef.current = false;
      setTextInput({ x: coords.x, y: coords.y, type: 'sticky' });
      setInputValue('');
      return;
    }

    if (activeTool === 'text') {
      isDrawingRef.current = false;
      setTextInput({ x: coords.x, y: coords.y, type: 'text' });
      setInputValue('');
      return;
    }

    if (activeTool === 'eraser') {
      // Erase element under click
      eraseAtPos(coords);
      return;
    }

    if (activeTool === 'pen') {
      currentPathRef.current = [coords];
    }
  };

  const handleMouseMove = (e) => {
    if (!isDrawingRef.current) return;
    const coords = getCoords(e);

    if (activeTool === 'eraser') {
      eraseAtPos(coords);
      return;
    }

    if (activeTool === 'pen') {
      currentPathRef.current.push(coords);
      const tempPen = {
        type: 'pen',
        points: currentPathRef.current,
        color,
        lineWidth,
      };
      setPreviewElement(tempPen);
      redrawCanvas(elements, tempPen);
    } else if (activeTool === 'shapes') {
      const tempShape = {
        type: selectedShape,
        x1: startPosRef.current.x,
        y1: startPosRef.current.y,
        x2: coords.x,
        y2: coords.y,
        color,
        fill: fillColor,
        lineWidth,
      };
      setPreviewElement(tempShape);
      redrawCanvas(elements, tempShape);
    }
  };

  const handleMouseUp = (e) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const coords = getCoords(e);

    let newEl = null;

    if (activeTool === 'pen' && currentPathRef.current.length > 1) {
      newEl = {
        id: Date.now(),
        type: 'pen',
        points: currentPathRef.current,
        color,
        lineWidth,
      };
    } else if (activeTool === 'shapes') {
      newEl = {
        id: Date.now(),
        type: selectedShape,
        x1: startPosRef.current.x,
        y1: startPosRef.current.y,
        x2: coords.x,
        y2: coords.y,
        color,
        fill: fillColor,
        lineWidth,
      };
    }

    if (newEl) {
      const updated = [...elements, newEl];
      setElements(updated);
      setHistory([...history, elements]);
      setRedoStack([]);
      syncWithPeers(updated);
    }

    currentPathRef.current = [];
    setPreviewElement(null);
    redrawCanvas(elements);
  };

  // Erase logic
  const eraseAtPos = (coords) => {
    const updated = elements.filter((el) => {
      if (el.type === 'pen' && el.points) {
        return !el.points.some((p) => Math.hypot(p.x - coords.x, p.y - coords.y) < 15);
      }
      if (el.x1 !== undefined && el.y1 !== undefined) {
        const minX = Math.min(el.x1, el.x2) - 10;
        const maxX = Math.max(el.x1, el.x2) + 10;
        const minY = Math.min(el.y1, el.y2) - 10;
        const maxY = Math.max(el.y1, el.y2) + 10;
        return !(coords.x >= minX && coords.x <= maxX && coords.y >= minY && coords.y <= maxY);
      }
      if (el.x !== undefined && el.y !== undefined) {
        return !(coords.x >= el.x && coords.x <= el.x + 140 && coords.y >= el.y && coords.y <= el.y + 140);
      }
      return true;
    });

    if (updated.length !== elements.length) {
      setElements(updated);
      syncWithPeers(updated);
      redrawCanvas(updated);
    }
  };

  // Commit text or sticky note
  const submitTextModal = () => {
    if (!textInput || !inputValue.trim()) {
      setTextInput(null);
      return;
    }

    let newEl = null;

    if (textInput.type === 'sticky') {
      newEl = {
        id: Date.now(),
        type: 'sticky',
        x: textInput.x,
        y: textInput.y,
        width: 140,
        height: 140,
        text: inputValue,
        stickyColor: stickyColor,
      };
    } else if (textInput.type === 'text') {
      newEl = {
        id: Date.now(),
        type: 'text',
        x: textInput.x,
        y: textInput.y,
        text: inputValue,
        color: color,
      };
    }

    if (newEl) {
      const updated = [...elements, newEl];
      setElements(updated);
      setHistory([...history, elements]);
      setRedoStack([]);
      syncWithPeers(updated);
      redrawCanvas(updated);
    }

    setTextInput(null);
    setInputValue('');
  };

  // Sync to peers via socket
  const syncWithPeers = (updatedElements) => {
    if (socket && roomId) {
      socket.emit('whiteboard-update', { roomId, elements: updatedElements });
    }
  };

  // Undo / Redo
  const handleUndo = () => {
    if (elements.length === 0) return;
    const previous = elements.slice(0, -1);
    setRedoStack([...redoStack, elements[elements.length - 1]]);
    setElements(previous);
    syncWithPeers(previous);
    redrawCanvas(previous);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const nextEl = redoStack[redoStack.length - 1];
    const updated = [...elements, nextEl];
    setRedoStack(redoStack.slice(0, -1));
    setElements(updated);
    syncWithPeers(updated);
    redrawCanvas(updated);
  };

  const handleClear = () => {
    setHistory([...history, elements]);
    setElements([]);
    setRedoStack([]);
    syncWithPeers([]);
    redrawCanvas([]);
  };

  // Export to PNG image
  const handleExportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create temp canvas with white background
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');

    tempCtx.fillStyle = '#ffffff';
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    tempCtx.drawImage(canvas, 0, 0);

    const link = document.createElement('a');
    link.download = `whiteboard-${roomId || 'export'}.png`;
    link.href = tempCanvas.toDataURL('image/png');
    link.click();
  };

  // Shape List Config matching the screenshot
  const shapeOptions = [
    { id: 'line', label: 'Line', shortcut: 'L', icon: Minus },
    { id: 'arrow', label: 'Arrow', icon: ArrowRight },
    { id: 'elbow-arrow', label: 'Elbow arrow', icon: CornerDownRight },
    { id: 'block-arrow', label: 'Block arrow', icon: MoveRight },
    { id: 'rectangle', label: 'Rectangle', shortcut: 'R', icon: Square },
    { id: 'oval', label: 'Oval', shortcut: 'O', icon: Circle },
    { id: 'rhombus', label: 'Rhombus', icon: Diamond },
    { id: 'triangle', label: 'Triangle', icon: Triangle },
    { id: 'divider', label: 'Divider', icon: SeparatorHorizontal },
  ];

  return (
    <div className="flex flex-col h-full w-full bg-[#f4f5f7] relative overflow-hidden font-sans select-none">
      
      {/* Dynamic Grid Background Pattern */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-60" 
        style={{
          backgroundImage: `linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)`,
          backgroundSize: '24px 24px'
        }}
      />

      {/* Top Left Header Badge (Miro Style) */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-3 bg-white/95 backdrop-blur-md border border-gray-200/80 shadow-md rounded-2xl px-4 py-2.5">
        <div>
          <h1 className="text-sm font-bold text-gray-900 leading-tight">Web whiteboard</h1>
          <p className="text-[11px] text-purple-600 font-medium leading-none">Powered by LiveEditor</p>
        </div>
        <div className="h-6 w-[1px] bg-gray-200 mx-1" />
        <button
          onClick={handleExportPNG}
          className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all"
          title="Export as PNG"
        >
          <Upload size={18} />
        </button>
      </div>

      {/* Miro Floating Vertical Toolbar (Left Side) */}
      <div className="absolute top-1/2 -translate-y-1/2 left-4 z-30 flex flex-col items-center gap-1.5 bg-white/95 backdrop-blur-md border border-gray-200/80 shadow-xl rounded-2xl p-1.5">
        {/* Pen Tool */}
        <button
          onClick={() => {
            setActiveTool('pen');
            setIsShapesOpen(false);
          }}
          className={`p-3 rounded-xl transition-all ${
            activeTool === 'pen' ? 'bg-purple-100 text-purple-600 shadow-sm' : 'text-gray-600 hover:bg-gray-100'
          }`}
          title="Freehand Pen (P)"
        >
          <Pencil size={20} />
        </button>

        {/* Shapes Menu Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setActiveTool('shapes');
              setIsShapesOpen(!isShapesOpen);
            }}
            className={`p-3 rounded-xl transition-all flex items-center gap-0.5 ${
              activeTool === 'shapes' ? 'bg-purple-100 text-purple-600 shadow-sm' : 'text-gray-600 hover:bg-gray-100'
            }`}
            title="Shapes & Connectors (S)"
          >
            <Shapes size={20} />
          </button>

          {/* Shapes Flyout Menu matching screenshot */}
          {isShapesOpen && (
            <div className="absolute left-14 top-0 w-56 bg-white border border-gray-200/90 shadow-2xl rounded-2xl p-2 z-40 flex flex-col gap-0.5 animate-in fade-in slide-in-from-left-2 duration-150">
              {shapeOptions.map((shape) => {
                const IconComp = shape.icon;
                const isSelected = activeTool === 'shapes' && selectedShape === shape.id;
                return (
                  <button
                    key={shape.id}
                    onClick={() => {
                      setSelectedShape(shape.id);
                      setActiveTool('shapes');
                      setIsShapesOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-all ${
                      isSelected ? 'bg-purple-100 text-purple-700 font-semibold' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <IconComp size={18} className={isSelected ? 'text-purple-600' : 'text-gray-500'} />
                      <span>{shape.label}</span>
                    </div>
                    {shape.shortcut && (
                      <span className="text-xs font-mono text-gray-400">{shape.shortcut}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Sticky Note Tool */}
        <button
          onClick={() => {
            setActiveTool('sticky');
            setIsShapesOpen(false);
          }}
          className={`p-3 rounded-xl transition-all ${
            activeTool === 'sticky' ? 'bg-purple-100 text-purple-600 shadow-sm' : 'text-gray-600 hover:bg-gray-100'
          }`}
          title="Sticky Note (N)"
        >
          <StickyNote size={20} />
        </button>

        {/* Text Tool */}
        <button
          onClick={() => {
            setActiveTool('text');
            setIsShapesOpen(false);
          }}
          className={`p-3 rounded-xl transition-all ${
            activeTool === 'text' ? 'bg-purple-100 text-purple-600 shadow-sm' : 'text-gray-600 hover:bg-gray-100'
          }`}
          title="Text Box (T)"
        >
          <Type size={20} />
        </button>

        {/* Eraser Tool */}
        <button
          onClick={() => {
            setActiveTool('eraser');
            setIsShapesOpen(false);
          }}
          className={`p-3 rounded-xl transition-all ${
            activeTool === 'eraser' ? 'bg-purple-100 text-purple-600 shadow-sm' : 'text-gray-600 hover:bg-gray-100'
          }`}
          title="Eraser (E)"
        >
          <Eraser size={20} />
        </button>
      </div>

      {/* Top Center Properties Bar (Color & Stroke Selector) */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-white/95 backdrop-blur-md border border-gray-200/80 shadow-md rounded-2xl px-4 py-2 flex items-center gap-4">
        {/* Stroke Color Swatches */}
        <div className="flex items-center gap-1.5 border-r border-gray-200 pr-3">
          {strokeColors.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-5 h-5 rounded-full transition-transform ${
                color === c ? 'scale-125 ring-2 ring-purple-500 ring-offset-2' : 'hover:scale-110'
              }`}
              style={{ backgroundColor: c, border: c === '#ffffff' ? '1px solid #cbd5e1' : 'none' }}
            />
          ))}
        </div>

        {/* Fill Toggle for Shapes */}
        {activeTool === 'shapes' && (
          <div className="flex items-center gap-1.5 border-r border-gray-200 pr-3">
            <span className="text-xs text-gray-500 font-medium">Fill</span>
            <button
              onClick={() => setFillColor(fillColor === 'transparent' ? color : 'transparent')}
              className={`w-6 h-6 rounded-lg border text-xs font-bold transition-all ${
                fillColor !== 'transparent' ? 'border-purple-600 bg-purple-50 text-purple-600' : 'border-gray-300 text-gray-400'
              }`}
            >
              {fillColor !== 'transparent' ? 'ON' : 'OFF'}
            </button>
          </div>
        )}

        {/* Sticky Note Color Swatches */}
        {activeTool === 'sticky' && (
          <div className="flex items-center gap-1.5 border-r border-gray-200 pr-3">
            <span className="text-xs text-gray-500 font-medium">Card</span>
            {stickyColors.map((sc) => (
              <button
                key={sc}
                onClick={() => setStickyColor(sc)}
                className={`w-5 h-5 rounded-md transition-transform ${
                  stickyColor === sc ? 'scale-125 ring-2 ring-purple-500 ring-offset-1' : 'hover:scale-110'
                }`}
                style={{ backgroundColor: sc }}
              />
            ))}
          </div>
        )}

        {/* Line Thickness */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-medium">Size</span>
          <input
            type="range"
            min="1"
            max="10"
            value={lineWidth}
            onChange={(e) => setLineWidth(Number(e.target.value))}
            className="w-16 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
          />
        </div>
      </div>

      {/* Floating Bottom Left Undo / Redo / Clear Controls */}
      <div className="absolute bottom-4 left-4 z-20 bg-white/95 backdrop-blur-md border border-gray-200/80 shadow-md rounded-2xl p-1.5 flex items-center gap-1">
        <button
          onClick={handleUndo}
          disabled={elements.length === 0}
          className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all disabled:opacity-30"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 size={18} />
        </button>
        <button
          onClick={handleRedo}
          disabled={redoStack.length === 0}
          className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all disabled:opacity-30"
          title="Redo (Ctrl+Y)"
        >
          <Redo2 size={18} />
        </button>
        <div className="h-4 w-[1px] bg-gray-200 mx-0.5" />
        <button
          onClick={handleClear}
          className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all"
          title="Clear Board"
        >
          <Trash2 size={18} />
        </button>
      </div>

      {/* Interactive HTML5 Canvas */}
      <div className="flex-1 w-full h-full relative cursor-crosshair">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="absolute inset-0 block w-full h-full"
        />
      </div>

      {/* Inline Text / Sticky Note Input Modal */}
      {textInput && (
        <div
          className="absolute z-50 bg-white border border-gray-300 shadow-2xl rounded-2xl p-3 flex flex-col gap-2 animate-in zoom-in-95 duration-100"
          style={{ top: Math.min(textInput.y, window.innerHeight - 200), left: Math.min(textInput.x, window.innerWidth - 300) }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-700">
              {textInput.type === 'sticky' ? 'New Sticky Note' : 'Add Text'}
            </span>
            <button onClick={() => setTextInput(null)} className="text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          </div>
          <textarea
            autoFocus
            rows={3}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={textInput.type === 'sticky' ? 'Write something...' : 'Type text here...'}
            className="w-56 p-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
          />
          <div className="flex justify-end gap-1.5">
            <button
              onClick={() => setTextInput(null)}
              className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={submitTextModal}
              className="px-3 py-1.5 text-xs bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 flex items-center gap-1"
            >
              <Check size={12} /> Add
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Whiteboard;
