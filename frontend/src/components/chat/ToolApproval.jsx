import React from "react";
import { ShieldCheck, Check, X } from "lucide-react";

export default function ToolApproval({ command, onApprove, onReject }) {
  return (
    <div className="rounded-xl border border-emerald-500/50 bg-[#162121]/80 p-3.5 text-xs space-y-3 shadow-lg">
      <div className="flex items-center justify-between text-emerald-400">
        <div className="flex items-center gap-1.5 font-semibold">
          <ShieldCheck className="w-4 h-4" />
          <span>Approve Tool Call</span>
        </div>
        <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-500/80 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
          Docker Isolation
        </span>
      </div>
      <p className="text-slate-300 text-[11px]">
        I need to execute the following command inside your sandboxed Docker container:
      </p>
      <div className="bg-[#0b1014] p-2.5 rounded font-mono text-[11px] text-emerald-300 border border-emerald-500/20 break-all">
        {command}
      </div>
      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          onClick={onApprove}
          className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white py-1.5 rounded font-medium transition"
        >
          <Check className="w-3.5 h-3.5" />
          Approve
        </button>
        <button
          onClick={onReject}
          className="flex items-center justify-center gap-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 py-1.5 rounded font-medium transition"
        >
          <X className="w-3.5 h-3.5" />
          Reject
        </button>
      </div>
    </div>
  );
}