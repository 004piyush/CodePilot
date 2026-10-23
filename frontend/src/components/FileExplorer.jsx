import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Folder, FileCode, Plus, FileText, Trash2 } from "lucide-react";

export default function FileExplorer({
  files = ["HelloWorld.java", "demo.py"],
  activeFile = "HelloWorld.java",
  onSelectFile,
  onCreateFile,
  onDeleteFile,
}) {
  const [isCreating, setIsCreating] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (isCreating && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCreating]);

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    const trimmed = newFileName.trim();
    if (trimmed) {
      if (onCreateFile) {
        onCreateFile(trimmed);
      }
      setNewFileName("");
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      setNewFileName("");
      setIsCreating(false);
    }
  };

  const handleDelete = (e, fileName) => {
    e.stopPropagation();
    if (onDeleteFile) {
      onDeleteFile(fileName);
    }
  };

  const getFileIcon = (fileName) => {
    if (fileName.endsWith(".java")) {
      return <FileCode className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
    }
    if (fileName.endsWith(".py")) {
      return <FileCode className="w-3.5 h-3.5 text-sky-400 shrink-0" />;
    }
    if (fileName.endsWith(".js") || fileName.endsWith(".jsx")) {
      return <FileCode className="w-3.5 h-3.5 text-yellow-400 shrink-0" />;
    }
    return <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
  };

  return (
    <div className="h-full w-full min-w-45 bg-[#12141f] border-r border-slate-800/80 flex flex-col select-none overflow-x-hidden">
      {/* Explorer Header */}
      <div className="p-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between shrink-0 border-b border-slate-800/40">
        <span>Explorer</span>
        <button
          type="button"
          onClick={() => setIsCreating(true)}
          title="New File"
          className="p-1 hover:text-white hover:bg-slate-800/80 rounded transition text-slate-400 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Directory Tree */}
      <div className="px-2 py-2 text-xs space-y-1 font-mono text-slate-300 overflow-y-auto">
        <div className="flex items-center gap-1.5 py-1 px-2 rounded hover:bg-slate-800/60 cursor-pointer">
          <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <Folder className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span className="truncate">workspace</span>
        </div>

        <div className="pl-5 space-y-0.5">
          {/* File Entries */}
          {files.map((fileName) => {
            const isActive = activeFile === fileName;
            return (
              <div
                key={fileName}
                onClick={() => onSelectFile && onSelectFile(fileName)}
                className={`group flex items-center justify-between py-1 px-2 rounded cursor-pointer transition ${
                  isActive
                    ? "bg-indigo-600/15 text-indigo-300 border border-indigo-500/20"
                    : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
                }`}
              >
                <div className="flex items-center gap-2 truncate min-w-0">
                  {getFileIcon(fileName)}
                  <span className="truncate">{fileName}</span>
                </div>

                {/* Delete Button (visible on item hover) */}
                <button
                  type="button"
                  title={`Delete ${fileName}`}
                  onClick={(e) => handleDelete(e, fileName)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-rose-400 hover:bg-rose-500/10 rounded transition text-slate-500 ml-1 shrink-0"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            );
          })}

          {/* Inline Input when creating a new file */}
          {isCreating && (
            <form onSubmit={handleCreateSubmit} className="pt-0.5">
              <input
                ref={inputRef}
                type="text"
                placeholder="filename.ext"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => {
                  if (!newFileName.trim()) {
                    setIsCreating(false);
                  }
                }}
                className="w-full bg-[#161824] border border-indigo-500/80 text-slate-200 px-2 py-1 rounded text-xs focus:outline-none font-mono"
              />
            </form>
          )}
        </div>
      </div>
    </div>
  );
}