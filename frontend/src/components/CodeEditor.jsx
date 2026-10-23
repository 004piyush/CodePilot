import React from "react";
import Editor from "@monaco-editor/react";
import { FileCode, FileText } from "lucide-react";

export default function CodeEditor({
  code,
  setCode,
  language = "plaintext",
  fileName = "HelloWorld.java",
}) {
  const isCodeFile = [".java", ".py", ".js", ".jsx", ".ts", ".tsx"].some((ext) =>
    fileName.endsWith(ext)
  );

  return (
    <div className="flex flex-col h-full bg-[#161824]">
      {/* Editor Tab Bar */}
      <div className="h-10 bg-[#12141f] border-b border-slate-800/80 flex items-center px-3 shrink-0 select-none">
        {/* Active File Tab */}
        <div className="flex items-center gap-2 bg-[#161824] px-3 py-1.5 rounded-t border-t border-x border-slate-700/60 text-xs text-white">
          {isCodeFile ? (
            <FileCode className="w-3.5 h-3.5 text-indigo-400" />
          ) : (
            <FileText className="w-3.5 h-3.5 text-slate-400" />
          )}
          <span>{fileName}</span>
        </div>
      </div>

      {/* Editor Body */}
      <div className="flex-1 overflow-hidden">
        <Editor
          height="100%"
          language={language}
          theme="vs-dark"
          value={code}
          onChange={(val) => setCode(val || "")}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            automaticLayout: true,
          }}
        />
      </div>
    </div>
  );
}