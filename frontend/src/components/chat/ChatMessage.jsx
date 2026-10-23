import React from "react";

export default function ChatMessage({ message }) {
  const isUser = message.sender === "user";

  return (
    <div className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
      <span className="text-[10px] text-slate-500 mb-1 px-1">
        {isUser ? "You" : "Assistant"} • {message.time}
      </span>
      <div
        className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed shadow-sm ${
          isUser
            ? "bg-indigo-600 text-white rounded-br-none"
            : "bg-slate-800/90 text-slate-200 border border-slate-700/60 rounded-bl-none"
        }`}
      >
        {message.text}
      </div>
    </div>
  );
}