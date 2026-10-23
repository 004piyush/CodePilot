// src/hooks/useAgentChat.js
import { useState, useCallback } from "react";

const BACKEND_URL = "http://localhost:8000";

export function useAgentChat(onCommandApproved) {
  const [messages, setMessages] = useState([
    {
      id: "init-1",
      sender: "assistant",
      role: "assistant",
      text: "Hello! I'm CodePilot AI. I can inspect your code, edit files, or run sandbox commands inside Docker.",
      content: "Hello! I'm CodePilot AI. I can inspect your code, edit files, or run sandbox commands inside Docker.",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const [pendingApproval, setPendingApproval] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Send message to /api/chat
  const sendMessage = useCallback(
    async (text, activeFile = null) => {
      if (!text || !text.trim() || isLoading) return;

      const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const userMsg = {
        id: `user-${Date.now()}`,
        sender: "user",
        role: "user",
        text,
        content: text,
        time,
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);

      try {
        // Prepare history for backend
        const historyPayload = messages.map((m) => ({
          role: m.role || m.sender,
          content: m.content || m.text,
        }));

        const res = await fetch(`${BACKEND_URL}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            history: historyPayload,
            active_file: activeFile,
          }),
        });

        if (!res.ok) {
          throw new Error(`Server returned ${res.status}`);
        }

        const data = await res.json();

        // 1. Sensitive tool requested: trigger human approval card
        if (data.type === "tool_approval_request") {
          setPendingApproval({
            approvalId: data.approval_id,
            command: data.command,
            toolName: data.tool_name,
            status: "pending",
          });

          if (data.message) {
            setMessages((prev) => [
              ...prev,
              {
                id: `assistant-${Date.now()}`,
                sender: "assistant",
                role: "assistant",
                text: data.message,
                content: data.message,
                time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              },
            ]);
          }
        } 
        // 2. Standard assistant message reply
        else if (data.type === "message") {
          setMessages((prev) => [
            ...prev,
            {
              id: `assistant-${Date.now()}`,
              sender: "assistant",
              role: "assistant",
              text: data.content,
              content: data.content,
              time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            },
          ]);
        }
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            sender: "assistant",
            role: "assistant",
            text: `Agent server offline: ${err.message}`,
            content: `Agent server offline: ${err.message}`,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, isLoading]
  );

  // Triggered when user clicks "Approve"
  const approveTool = useCallback(async () => {
    if (!pendingApproval) return;
    const { approvalId, command } = pendingApproval;

    setPendingApproval(null);
    setIsLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/api/chat/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approval_id: approvalId,
          approved: true,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();

      // Forward executed command and output to App.jsx -> Terminal component
      if (onCommandApproved && command) {
        onCommandApproved(command, data.execution_output);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          sender: "assistant",
          role: "assistant",
          text: data.message || `Command approved and executed: ${command}`,
          content: data.message || `Command approved and executed: ${command}`,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: "assistant",
          role: "assistant",
          text: `Error executing approved command: ${err.message}`,
          content: `Error executing approved command: ${err.message}`,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [pendingApproval, onCommandApproved]);

  // Triggered when user clicks "Reject"
  const rejectTool = useCallback(async () => {
    if (!pendingApproval) return;
    const { approvalId } = pendingApproval;

    setPendingApproval(null);
    setIsLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/api/chat/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approval_id: approvalId,
          approved: false,
        }),
      });

      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          sender: "assistant",
          role: "assistant",
          text: data.message || "Tool execution was rejected by the user.",
          content: data.message || "Tool execution was rejected by the user.",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: "assistant",
          role: "assistant",
          text: `Error rejecting tool: ${err.message}`,
          content: `Error rejecting tool: ${err.message}`,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [pendingApproval]);

  return {
    messages,
    pendingApproval,
    isLoading,
    sendMessage,
    approveTool,
    rejectTool,
  };
}