import React, { useState, useEffect, useRef } from "react";
import { 
  Panel, 
  Group as PanelGroup, 
  Separator as PanelResizeHandle 
} from "react-resizable-panels";

import Header from "./components/Header";
import FileExplorer from "./components/FileExplorer";
import CodeEditor from "./components/CodeEditor";
import Terminal from "./components/Terminal";
import ChatPanel from "./components/chat/ChatPanel";

import { useSandbox } from "./hooks/useSandbox";
import { useAgentChat } from "./hooks/useAgentChat";
import { BOILERPLATES, getFileInfo } from "./config/templates";

const STORAGE_KEY = "codepilot_saved_files_v2";

export default function App() {
  const [activeFile, setActiveFile] = useState("HelloWorld.java");
  const [language, setLanguage] = useState("java");

  // 1. Initialize per-file code cache from localStorage; fallback to default boilerplates
  const [codeFiles, setCodeFiles] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // Ignore parse errors and use initial state
    }
    return {
      "HelloWorld.java": BOILERPLATES.java.code,
      "main.py": BOILERPLATES.python.code,
      "index.js": BOILERPLATES.javascript.code,
      "server.py": "# Python backend service\n",
      "pyproject.toml": "[project]\nname = \"codepilot\"\nversion = \"0.1.0\"\n",
      "notes.txt": "CodePilot notes and tasks...\n",
    };
  });

  const saveTimeoutRef = useRef(null);

  // Terminal logging & sandbox execution hook
  const sandbox = useSandbox();
  const { output, isRunning, sandboxStatus, runCode } = sandbox;

  // Safe logger: dynamically finds the correct appender from useSandbox
  const safeAppendLog = (text) => {
    if (typeof sandbox.appendLog === "function") {
      sandbox.appendLog(text);
    } else if (typeof sandbox.setOutput === "function") {
      sandbox.setOutput((prev) => (prev ? `${prev}\n${text}` : text));
    }
  };

  // Agent chat, message timeline & approval gate hook
  const {
    messages,
    pendingApproval,
    sendMessage,
    approveTool,
    rejectTool,
  } = useAgentChat((approvedCommand, executionResult) => {
    safeAppendLog(`$ ${approvedCommand}`);
    if (executionResult) {
      safeAppendLog(executionResult);
    }
  });

  // Debounced auto-save directly to backend disk (/workspace)
  const persistToBackend = (filename, content) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await fetch("http://localhost:8000/api/workspace/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename, content }),
        });
      } catch {
        // Silently fails if backend is offline; localStorage keeps data safe
      }
    }, 1000);
  };

  // 2. File Selection Handler: preserves edits or loads boilerplate based on extension
  const handleSelectFile = (fileName) => {
    setActiveFile(fileName);
    const { language: detectedLang, defaultCode } = getFileInfo(fileName);
    setLanguage(detectedLang);

    // If file hasn't been written to yet, initialize it with its template
    if (codeFiles[fileName] === undefined) {
      setCodeFiles((prev) => {
        const next = { ...prev, [fileName]: defaultCode };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch (e) {
          console.warn("Failed to write to localStorage", e);
        }
        return next;
      });
    }
  };

  // 3. New File Creation Handler
  const handleCreateFile = (newFileName) => {
    if (codeFiles[newFileName] !== undefined) {
      handleSelectFile(newFileName);
      return;
    }

    const { language: detectedLang, defaultCode } = getFileInfo(newFileName);

    const updatedFiles = {
      ...codeFiles,
      [newFileName]: defaultCode,
    };

    setCodeFiles(updatedFiles);
    setActiveFile(newFileName);
    setLanguage(detectedLang);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedFiles));
    } catch (e) {
      console.warn("Failed to write to localStorage", e);
    }

    persistToBackend(newFileName, defaultCode);
  };

  // 4. Update editor code on change
  const handleCodeChange = (newCode) => {
    const updated = {
      ...codeFiles,
      [activeFile]: newCode,
    };

    setCodeFiles(updated);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn("Failed to write to localStorage", e);
    }

    persistToBackend(activeFile, newCode);
  };

  // Current editor code based on active file
  const currentCode = codeFiles[activeFile] ?? getFileInfo(activeFile).defaultCode;

  // 5. Immediate manual save shortcut (Ctrl+S / Cmd+S)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        fetch("http://localhost:8000/api/workspace/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: activeFile, content: currentCode }),
        }).catch(() => {});
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeFile, currentCode]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  const handleDeleteFile = (fileName) => {
    // Prevent leaving the editor completely blank if only 1 file exists
    const remainingFiles = Object.keys(codeFiles).filter((f) => f !== fileName);
    if (remainingFiles.length === 0) return;

    const updatedFiles = { ...codeFiles };
    delete updatedFiles[fileName];

    setCodeFiles(updatedFiles);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedFiles));

    // If deleted file was active, switch to the first remaining file
    if (activeFile === fileName) {
      const nextFile = remainingFiles[0];
      setActiveFile(nextFile);
      setLanguage(getFileInfo(nextFile).language);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0f111a] text-slate-200 overflow-hidden font-sans">
      <Header sandboxStatus={sandboxStatus} />

      <div className="flex-1 w-full h-[calc(100vh-2.75rem)] overflow-hidden">
        <PanelGroup id="main-horizontal-group" orientation="horizontal">
          
          {/* Pane 1: File Explorer - Original sizes preserved */}
          <Panel 
            id="panel-explorer"
            defaultSize={20} 
            minSize={50} 
            maxSize={200}
            collapsible={false}
          >
            <FileExplorer
              files={Object.keys(codeFiles)}
              activeFile={activeFile}
              onSelectFile={handleSelectFile}
              onCreateFile={handleCreateFile}
              onDeleteFile={handleDeleteFile}
            />
          </Panel>

          <PanelResizeHandle className="w-1.5 bg-[#0f111a] hover:bg-indigo-500/80 transition-colors cursor-col-resize active:bg-indigo-500 flex items-center justify-center select-none group">
            <div className="flex flex-col items-center justify-center gap-1 py-1 bg-[#12141f] pointer-events-none">
              <span className="w-1 h-1 rounded-full bg-slate-500 group-hover:bg-indigo-400 transition-colors"></span>
              <span className="w-1 h-1 rounded-full bg-slate-500 group-hover:bg-indigo-400 transition-colors"></span>
              <span className="w-1 h-1 rounded-full bg-slate-500 group-hover:bg-indigo-400 transition-colors"></span>
            </div>
          </PanelResizeHandle>

          {/* Pane 2: Editor (Top) & Terminal (Bottom) */}
          <Panel id="panel-center" defaultSize={54} minSize={35}>
            <PanelGroup id="center-vertical-group" orientation="vertical">
              <Panel id="panel-editor" defaultSize={65} minSize={30}>
                <CodeEditor
                  code={currentCode}
                  setCode={handleCodeChange}
                  language={language}
                  fileName={activeFile}
                />
              </Panel>

              <PanelResizeHandle className="relative h-0.5 bg-slate-800 hover:bg-indigo-500/80 transition-colors cursor-row-resize active:bg-indigo-500 flex items-center justify-center select-none group">
                <div className="flex items-center justify-center gap-1 px-1 bg-[#161824] pointer-events-none">
                  <span className="w-1 h-1 rounded-full bg-slate-500 group-hover:bg-indigo-400 transition-colors"></span>
                  <span className="w-1 h-1 rounded-full bg-slate-500 group-hover:bg-indigo-400 transition-colors"></span>
                  <span className="w-1 h-1 rounded-full bg-slate-500 group-hover:bg-indigo-400 transition-colors"></span>
                </div>
              </PanelResizeHandle>

              <Panel id="panel-terminal" defaultSize={35} minSize={15}>
                <Terminal 
                  output={output} 
                  isRunning={isRunning}
                  sandboxStatus={sandboxStatus}
                  onRunCode={() => runCode(currentCode, language, activeFile)} 
                />
              </Panel>
            </PanelGroup>
          </Panel>

          <PanelResizeHandle className="w-1.5 bg-[#0f111a] hover:bg-indigo-500/80 transition-colors cursor-col-resize active:bg-indigo-500 flex items-center justify-center select-none group">
            <div className="flex flex-col items-center justify-center gap-1 py-1 bg-[#12141f] pointer-events-none">
              <span className="w-1 h-1 rounded-full bg-slate-500 group-hover:bg-indigo-400 transition-colors"></span>
              <span className="w-1 h-1 rounded-full bg-slate-500 group-hover:bg-indigo-400 transition-colors"></span>
              <span className="w-1 h-1 rounded-full bg-slate-500 group-hover:bg-indigo-400 transition-colors"></span>
            </div>
          </PanelResizeHandle>

          {/* Pane 3: AI Agent Chat - Original sizes preserved + physical min-width guard */}
          <Panel 
            id="panel-chat"
            defaultSize={28} 
            minSize={40} 
            maxSize={300}
            collapsible={false}
            style={{ minWidth: "300px" }}
            className="min-w-75 flex flex-col h-full"
          >
            <ChatPanel
              messages={messages}
              pendingApproval={pendingApproval}
              onApproveTool={approveTool}
              onRejectTool={rejectTool}
              onSendMessage={(text) => sendMessage(text, activeFile)}
            />
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}