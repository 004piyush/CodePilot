import React from "react";
import { Layers, Settings } from "lucide-react";

export default function Header({ sandboxStatus = "connected" }) {
  return (
    <header className="h-11 border-b border-slate-800/80 bg-[#141622] flex items-center justify-between px-4 z-10 shrink-0 select-none">
      {/* Brand Logo & Name */}
      <div className="flex items-center gap-2">
        <Layers className="w-5 h-5 text-indigo-400" />
        <span className="font-bold tracking-wide text-white text-sm">CodePilot</span>
        <span className="bg-indigo-500/20 text-indigo-400 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-indigo-500/30">
          Beta
        </span>
      </div>

      {/* Dynamic Sandbox Status with Radar Pulse */}
      <div className="text-xs font-mono flex items-center gap-2">
        {sandboxStatus === "connected" ? (
          <div className="flex items-center gap-2 text-emerald-400">
            <span className="relative flex h-2.5 w-2.5 items-center justify-center">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Docker Sandbox: Connected</span>
          </div>
        ) : sandboxStatus === "disconnected" ? (
          <div className="flex items-center gap-2 text-rose-400">
            <span className="h-2 w-2 rounded-full bg-rose-500"></span>
            <span>Docker Sandbox: Offline</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-slate-400">
            <span className="h-2 w-2 rounded-full bg-slate-500 animate-pulse"></span>
            <span>Checking Sandbox...</span>
          </div>
        )}
      </div>

      {/* Actions & Profile */}
      <div className="flex items-center gap-3">
        <button 
          title="Settings"
          className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition"
        >
          <Settings className="w-4 h-4" />
        </button>
        <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
          PK
        </div>
      </div>
    </header>
  );
}