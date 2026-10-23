# backend/server.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from pathlib import Path
import traceback

from tools import read_workspace_file, write_workspace_file, execute_sandbox_command
from agent import handle_user_chat, resolve_tool_approval

app = FastAPI(title="CodePilot API")

# Enable CORS for React frontend (Vite default: http://localhost:5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------- Request / Response Models -----------------

class WorkspaceSaveRequest(BaseModel):
    filename: str
    content: str


class ExecuteRequest(BaseModel):
    command: Optional[str] = None
    code: Optional[str] = None
    language: Optional[str] = None
    filename: Optional[str] = None
    file_name: Optional[str] = None


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []
    active_file: Optional[str] = None


class ApprovalRequest(BaseModel):
    approval_id: str
    approved: bool


# ----------------- Workspace & Sandbox Endpoints -----------------

@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "CodePilot Backend"}


@app.post("/api/workspace/save")
def save_file(req: WorkspaceSaveRequest):
    result = write_workspace_file(req.filename, req.content)
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    return result


@app.get("/api/workspace/files/{filename}")
def get_file(filename: str):
    result = read_workspace_file(filename)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


@app.post("/api/execute")
@app.post("/api/sandbox/execute")
def direct_execute(req: ExecuteRequest):
    # 1. If explicit code and filename are passed, save before executing
    target_filename = req.filename or req.file_name
    if req.code and target_filename:
        write_workspace_file(filename=target_filename, content=req.code)

    # 2. Direct raw bash command provided (e.g., from terminal or AI agent)
    if req.command and req.command.strip():
        return execute_sandbox_command(req.command.strip())

    # 3. Dynamic compilation/execution triggered via "Run Code" button
    lang = (req.language or "").lower()
    file_target = target_filename or ("HelloWorld.java" if "java" in lang else "main.py")

    if "java" in lang or file_target.endswith(".java"):
        class_name = Path(file_target).stem
        cmd = f"javac {file_target} && java {class_name}"
    elif "python" in lang or "py" in lang or file_target.endswith(".py"):
        cmd = f"python3 {file_target}"
    elif "javascript" in lang or "node" in lang or "js" in lang or file_target.endswith(".js"):
        cmd = f"node {file_target}"
    else:
        cmd = req.command or f"python3 {file_target}"

    return execute_sandbox_command(cmd)


# ----------------- AI Agent & Approval Endpoints -----------------

@app.post("/api/chat")
def chat_route(req: ChatRequest):
    try:
        history_dicts = [{"role": m.role, "content": m.content} for m in req.history]
        result = handle_user_chat(
            message=req.message,
            history=history_dicts,
            active_file=req.active_file,
        )
        return result
    except Exception as e:
        print("\n--- CHAT ERROR TRACEBACK ---")
        traceback.print_exc()
        print("----------------------------\n")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/chat/approve")
def approve_route(req: ApprovalRequest):
    try:
        result = resolve_tool_approval(
            approval_id=req.approval_id,
            approved=req.approved,
        )
        return result
    except Exception as e:
        print("\n--- APPROVE ERROR TRACEBACK ---")
        traceback.print_exc()
        print("-------------------------------\n")
        raise HTTPException(status_code=500, detail=str(e))