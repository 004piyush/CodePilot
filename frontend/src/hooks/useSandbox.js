// src/hooks/useSandbox.js
import { useState, useCallback, useRef, useEffect } from "react";

export function useSandbox() {
  const [output, setOutput] = useState([
    "$ # CodePilot Docker Sandbox initialized",
    "$ # Ready to compile and run your code.",
  ]);
  const [isRunning, setIsRunning] = useState(false);
  const [sandboxStatus, setSandboxStatus] = useState("checking"); // "checking" | "connected" | "disconnected"

  // Use a ref lock to immediately block duplicate calls in the same tick
  const runningRef = useRef(false);

  // Poll FastAPI health endpoint to track Docker status
  useEffect(() => {
    let isMounted = true;

    const checkStatus = async () => {
      try {
        const res = await fetch("http://localhost:8000/api/health");
        const data = await res.json();
        if (isMounted) {
          setSandboxStatus(data.status === "ok" ? "connected" : "disconnected");
        }
      } catch {
        if (isMounted) {
          setSandboxStatus("disconnected");
        }
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 8000); // Check every 8s

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const appendLines = useCallback((rawText) => {
    if (!rawText) return;
    const splitLines = rawText.split("\n");
    setOutput((prev) => [...prev, ...splitLines]);
  }, []);

  const runCode = useCallback(
    async (code, language = "java", filename = null) => {
      if (runningRef.current || sandboxStatus !== "connected") return;
      runningRef.current = true;
      setIsRunning(true);

      appendLines(`$ [Executing ${language.toUpperCase()} in Docker sandbox...]`);

      try {
        const response = await fetch("http://localhost:8000/api/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, language, filename }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (data.output) {
          appendLines(data.output);
        }
        appendLines(`$ [Process exited with code ${data.exit_code}]`);
      } catch (err) {
        appendLines(`$ Execution error: ${err.message}`);
      } finally {
        runningRef.current = false;
        setIsRunning(false);
      }
    },
    [appendLines, sandboxStatus]
  );

  return {
    output,
    isRunning,
    sandboxStatus, // Expose status for pulse animation
    runCode,
    clearTerminal: () => setOutput([]),
  };
}