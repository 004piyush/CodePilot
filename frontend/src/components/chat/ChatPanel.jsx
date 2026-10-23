import React, { useState } from "react";
import { Bot, Send } from "lucide-react";
import ChatMessage from "./ChatMessage";
import ToolApproval from "./ToolApproval";

export default function ChatPanel({
  messages,
  pendingApproval,
  onApproveTool,
  onRejectTool,
  onSendMessage,
}) {
  const [inputText, setInputText] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setInputText("");
  };

  return (
    <div className="h-full bg-[#12141f] border-l border-slate-800/80 flex flex-col">
      {/* Header */}
      <div className="h-10 border-b border-slate-800/80 px-4 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-purple-400" />
          <span className="text-xs font-semibold text-white">AI Agent & Chat</span>
        </div>
      </div>

      {/* Message Timeline */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.map((msg, idx) => (
          <ChatMessage key={idx} message={msg} />
        ))}

        {pendingApproval && pendingApproval.status === "pending" && (
          <ToolApproval
            command={pendingApproval.command}
            onApprove={onApproveTool}
            onReject={onRejectTool}
          />
        )}
      </div>

      {/* Input Field */}
      <div className="p-3 border-t border-slate-800/80 bg-[#141622] shrink-0">
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 bg-[#0d0e15] border border-slate-700/80 rounded-lg px-3 py-1.5 focus-within:border-indigo-500 transition"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Message the Agent..."
            className="bg-transparent text-xs text-white placeholder-slate-500 outline-none flex-1"
          />
          <button type="submit" className="text-indigo-400 hover:text-indigo-300 p-1">
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}