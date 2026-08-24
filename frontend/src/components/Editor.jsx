import React, { useRef, useEffect, useState } from 'react';
import MonacoEditor from '@monaco-editor/react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { MonacoBinding } from 'y-monaco';
import { Play, Terminal as TerminalIcon, Loader2 } from 'lucide-react';

const LANGUAGES = [
  { label: 'JavaScript', monaco: 'javascript', piston: 'javascript', version: '*' },
  { label: 'Python', monaco: 'python', piston: 'python', version: '*' },
  { label: 'C++', monaco: 'cpp', piston: 'cpp', version: '*' },
  { label: 'C', monaco: 'c', piston: 'c', version: '*' },
  { label: 'Java', monaco: 'java', piston: 'java', version: '*' },
];

const Editor = ({ roomId }) => {
  const editorRef = useRef(null);
  const providerRef = useRef(null);
  const bindingRef = useRef(null);
  const docRef = useRef(null);
  
  const [language, setLanguage] = useState(LANGUAGES[0]);
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [showTerminal, setShowTerminal] = useState(true);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;

    // Initialize Yjs Document
    const doc = new Y.Doc();
    docRef.current = doc;

    // Connect to Yjs WebSocket Server using custom route
    const provider = new WebsocketProvider(
      'ws://localhost:5000/yjs', // Pointing to our backend custom route
      roomId,
      doc,
      { connect: true }
    );
    providerRef.current = provider;

    // Retrieve shared text structure
    const type = doc.getText('monaco');

    // Bind Yjs representation to the Monaco text model
    const binding = new MonacoBinding(
      type, 
      editorRef.current.getModel(), 
      new Set([editorRef.current]), 
      provider.awareness
    );
    bindingRef.current = binding;
  };

  useEffect(() => {
    return () => {
      // Clean up on component unmount
      if (bindingRef.current) bindingRef.current.destroy();
      if (providerRef.current) providerRef.current.destroy();
      if (docRef.current) docRef.current.destroy();
    };
  }, []);

  const runCode = async () => {
    if (!editorRef.current) return;
    
    const sourceCode = editorRef.current.getValue();
    if (!sourceCode.trim()) return;

    setIsRunning(true);
    setShowTerminal(true);
    setOutput('Running...');

    try {
      const response = await fetch('http://localhost:5000/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: language.piston, // piston id doubles as local engine id ('javascript', 'python', 'cpp', 'c', 'java')
          sourceCode: sourceCode
        })
      });
      
      const result = await response.json();
      
      if (result.error) {
         setOutput(result.error);
      } else if (result.output) {
         setOutput(result.output);
      } else {
         setOutput('Execution returned no output or encountered an unexpected error.');
      }
    } catch (err) {
      setOutput('Failed to connect to execution engine.\n' + err.message);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="flex-1 w-full h-full flex flex-col p-4 gap-4 overflow-hidden relative z-0 text-white">
       
       <div className="flex justify-between items-center bg-[#1a1a1a] rounded-lg p-2 border border-gray-700/60 shadow-md">
         <div className="flex items-center gap-3 ml-2">
           <label className="text-sm font-semibold text-gray-400">Language:</label>
           <select 
             className="bg-[#2a2a2a] border border-gray-600 text-sm rounded px-3 py-1.5 focus:outline-none focus:border-blue-500 transition-colors"
             value={language.monaco}
             onChange={(e) => setLanguage(LANGUAGES.find(l => l.monaco === e.target.value))}
           >
             {LANGUAGES.map(lang => (
               <option key={lang.monaco} value={lang.monaco}>{lang.label}</option>
             ))}
           </select>
         </div>
         
         <div className="flex items-center gap-2">
           <button 
             onClick={() => setShowTerminal(!showTerminal)}
             className={`p-2 rounded transition-colors ${showTerminal ? 'bg-gray-700/50 text-gray-200' : 'text-gray-400 hover:bg-gray-700/30'}`}
             title="Toggle Terminal"
           >
             <TerminalIcon size={18} />
           </button>
           <button 
             onClick={runCode}
             disabled={isRunning}
             className="flex items-center gap-2 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 text-white px-4 py-1.5 rounded font-medium transition-colors shadow-lg"
           >
             {isRunning ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} fill="currentColor" />}
             Run Code
           </button>
         </div>
       </div>

       <div className={`flex flex-col w-full flex-1 gap-4 overflow-hidden ${showTerminal ? 'h-2/3' : 'h-full'}`}>
         {/* Editor Pane */}
         <div className="bg-[#1e1e1e] rounded-xl overflow-hidden flex-1 border border-gray-700/60 shadow-2xl relative">
           <MonacoEditor
            language={language.monaco}
            theme="vs-dark"
            onMount={handleEditorDidMount}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              wordWrap: 'on',
              padding: { top: 20 },
              fontFamily: "'Fira Code', 'JetBrains Mono', monospace",
              formatOnPaste: true,
              scrollBeyondLastLine: false,
            }}
          />
         </div>

         {/* Terminal Output Pane */}
         {showTerminal && (
           <div className="h-64 sm:h-72 bg-[#121212] rounded-xl border border-gray-700/60 flex flex-col shrink-0 shadow-inner">
             <div className="bg-[#1a1a1a] px-4 py-2 border-b border-gray-700/60 flex items-center justify-between rounded-t-xl">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-300">
                  <TerminalIcon size={16} />
                  Output
                </div>
                <button onClick={() => setOutput('')} className="text-xs text-gray-500 hover:text-gray-300">Clear</button>
             </div>
             <div className="p-4 flex-1 overflow-y-auto custom-scrollbar font-mono text-sm whitespace-pre-wrap text-gray-300">
               {output || <span className="text-gray-600 italic">No output...</span>}
             </div>
           </div>
         )}
       </div>
    </div>
  );
};

export default Editor;
