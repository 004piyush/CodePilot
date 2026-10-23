import React from "react";
import { Play, Terminal as TerminalIcon } from "lucide-react";

export default function Terminal({
  output = [],
  onRunCode,
  sandboxStatus = "connected", // "connected" | "disconnected" | "checking"
  isRunning = false,
}) {
  return (
    <div className="h-full bg-[#0f111a] flex flex-col border-t border-slate-800/80">
      {/* Terminal Toolbar */}
      <div className="h-9 bg-[#12141f] border-b border-slate-800/80 flex items-center justify-between px-3 shrink-0 select-none">
        <div className="flex items-center gap-3">
          {/* Tab Title */}
          <div className="flex items-center gap-1.5 text-xs font-medium text-white border-b-2 border-indigo-500 pb-1">
            <TerminalIcon className="w-3.5 h-3.5" />
            <span>Terminal</span>
          </div>

          {/* Sandbox Status Badge */}
          {sandboxStatus === "connected" ? (
            <span className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded-full font-medium font-mono">
              <span className="relative flex h-2 w-2 items-center justify-center">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              <span>Sandbox Ready</span>
            </span>
          ) : sandboxStatus === "disconnected" ? (
            <span className="flex items-center gap-1.5 bg-rose-500/10 text-rose-400 border border-rose-500/30 text-[10px] px-2 py-0.5 rounded-full font-medium font-mono">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span>
              <span>Sandbox Offline</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 bg-slate-800 text-slate-400 border border-slate-700 text-[10px] px-2 py-0.5 rounded-full font-medium font-mono">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-500 animate-pulse"></span>
              <span>Connecting...</span>
            </span>
          )}
        </div>

        {/* Run Code Button */}
        <button
          type="button"
          onClick={onRunCode}
          disabled={sandboxStatus !== "connected" || isRunning}
          className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded font-medium shadow transition ${
            sandboxStatus === "connected" && !isRunning
              ? "bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
              : "bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed"
          }`}
        >
          <Play className="w-3 h-3 fill-current" />
          <span>{isRunning ? "Running..." : "Run Code"}</span>
        </button>
      </div>

      {/* Output Console Logs */}
      <div className="flex-1 p-3 font-mono text-xs overflow-y-auto space-y-1 text-slate-300 select-text">
        {output.map((line, idx) => (
          <div
            key={idx}
            className={`whitespace-pre-wrap break-all ${
              line.startsWith("$") ? "text-indigo-400" : "text-slate-300"
            }`}
          >
            {line}
          </div>
        ))}

        {/* Active Prompt Line */}
        <div className="flex items-center gap-1 text-slate-400">
          <span>$</span>
          <span className="w-2 h-4 bg-slate-400 inline-block animate-pulse"></span>
        </div>
      </div>
    </div>
  );
}