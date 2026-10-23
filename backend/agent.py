# backend/agent.py
import os
import uuid
import time
import random
from pathlib import Path
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv
from google import genai
from google.genai import types
from google.genai.errors import ServerError

from tools import (
    SENSITIVE_TOOLS,
    read_workspace_file,
    write_workspace_file,
    execute_sandbox_command,
    dispatch_tool_call,
)

# Explicitly resolve and load .env located in the backend directory
ENV_PATH = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=ENV_PATH)

GEMINI_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_KEY:
    print("⚠️ WARNING: GEMINI_API_KEY is not set or .env file is missing!")

# Initialize Google GenAI client
client = genai.Client(api_key=GEMINI_KEY)

# Ordered pool of available models from your project list
# Automatically rotates to subsequent models if Google returns 503 capacity errors
CANDIDATE_MODELS = [
    "gemini-3.8-flash",
    "gemini-3.7-flash",
    "gemini-3.5-flash",
    "gemini-3-flash-preview",
]

# In-memory storage for pending tool approval requests: {approval_id: {...}}
PENDING_APPROVALS: Dict[str, Dict[str, Any]] = {}

SYSTEM_INSTRUCTION = """You are CodePilot AI, an autonomous software development assistant integrated into a modern web IDE.
You operate alongside an isolated Ubuntu Docker container with workspace access at /workspace.

Capabilities:
1. Inspect workspace files using `read_workspace_file`.
2. Create or edit files using `write_workspace_file`.
3. Execute bash commands inside the Docker container via `execute_sandbox_command`.

Operating Rules:
- When asked to run, compile, or test code, ALWAYS invoke `execute_sandbox_command` with the exact shell command required.
- Do not run dangerous or destructive commands outside /workspace.
- Be concise, direct, and pragmatic.
"""

SANDBOX_TOOLS = [read_workspace_file, write_workspace_file, execute_sandbox_command]


def _safe_get_text(response: Any, default: str = "Done.") -> str:
    """Safely extracts text or provides a fallback string so messages are never blank."""
    try:
        text = response.text
        if text and text.strip():
            return text.strip()
    except Exception:
        pass
    return default


def generate_with_fallback(contents: list, config: types.GenerateContentConfig):
    """
    Cycles across candidate models. Automatically retries with jitter and 
    falls back to the next available model when encountering 503 (high demand) or 404 errors.
    """
    last_error = None
    for model_name in CANDIDATE_MODELS:
        for attempt in range(2):
            try:
                return client.models.generate_content(
                    model=model_name,
                    contents=contents,
                    config=config,
                )
            except ServerError as e:
                err_str = str(e)
                last_error = e
                if "503" in err_str or "UNAVAILABLE" in err_str:
                    delay = 1.0 + random.uniform(0.3, 0.7)
                    print(f"⚠️ {model_name} congested (503). Retrying in {delay:.2f}s...")
                    time.sleep(delay)
                    continue
                break
            except Exception as e:
                err_str = str(e)
                last_error = e
                if "404" in err_str or "NOT_FOUND" in err_str:
                    print(f"⚠️ {model_name} not found (404), shifting to next candidate...")
                    break
                break

    raise last_error


def handle_user_chat(
    message: str,
    history: List[Dict[str, str]],
    active_file: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Evaluates user prompt with Gemini.
    Safe tools auto-execute; sensitive tools pause and yield an approval request.
    """
    contents = []
    last_role = None

    # Map previous frontend chat messages into Gemini Content objects
    for msg in history:
        role = "model" if msg.get("role") in ["assistant", "model"] else "user"
        content_text = msg.get("content") or msg.get("text", "")
        if content_text:
            contents.append(types.Content(role=role, parts=[types.Part.from_text(text=content_text)]))

    # Inject active file context if provided
    user_prompt = message
    if active_file:
        file_data = read_workspace_file(active_file)
        if "content" in file_data:
            user_prompt = (
                f"[Context: User is viewing '{active_file}']\n"
                f"```{active_file}\n{file_data['content']}\n```\n\n"
                f"{message}"
            )

    contents.append(types.Content(role="user", parts=[types.Part.from_text(text=user_prompt)]))

    # Request completion from Gemini
    response = generate_with_fallback(
        contents=contents,
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_INSTRUCTION,
            tools=SANDBOX_TOOLS,
            temperature=0.2,
            automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
        ),
    )

    # Check if Gemini issued a function call
    if response.function_calls:
        call = response.function_calls[0]
        tool_name = call.name
        tool_args = dict(call.args) if call.args else {}

        # 1. Safe tool (e.g., read_workspace_file): execute immediately and feed back
        if tool_name not in SENSITIVE_TOOLS:
            tool_result = dispatch_tool_call(tool_name, tool_args)

            contents.append(response.candidates[0].content)
            contents.append(
                types.Content(
                    role="user",
                    parts=[types.Part.from_function_response(name=tool_name, response=tool_result)],
                )
            )

            followup = generate_with_fallback(
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_INSTRUCTION,
                    tools=SANDBOX_TOOLS,
                    automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
                ),
            )
            return {"type": "message", "content": _safe_get_text(followup, default="I have updated the file for you.")}

        # 2. Sensitive tool (e.g., execute_sandbox_command): Pause and yield approval
        approval_id = str(uuid.uuid4())
        command_desc = tool_args.get("command", "") or tool_args.get("filename", "")
        extracted_text = _safe_get_text(response)

        PENDING_APPROVALS[approval_id] = {
            "tool_name": tool_name,
            "tool_args": tool_args,
            "contents": contents,
            "candidate_content": response.candidates[0].content,
        }

        return {
            "type": "tool_approval_request",
            "approval_id": approval_id,
            "tool_name": tool_name,
            "command": command_desc,
            "message": extracted_text or "I need your approval to execute the following command inside Docker:",
        }

    return {"type": "message", "content": _safe_get_text(response, default="I have processed your request.")}


def resolve_tool_approval(approval_id: str, approved: bool) -> Dict[str, Any]:
    """
    Called when the user clicks 'Approve' or 'Reject' on the approval card.
    """
    pending = PENDING_APPROVALS.pop(approval_id, None)
    if not pending:
        return {"type": "error", "message": "Approval session expired or not found."}

    tool_name = pending["tool_name"]
    tool_args = pending["tool_args"]
    contents = list(pending["contents"])

    # 1. Append the model's function call turn (role='model')
    contents.append(pending["candidate_content"])

    if not approved:
        # User rejected the execution - send as role="user"
        rejection_payload = {"error": "User rejected the execution of this command."}
        contents.append(
            types.Content(
                role="user",
                parts=[
                    types.Part.from_function_response(
                        name=tool_name,
                        response=rejection_payload,
                    )
                ],
            )
        )
        try:
            followup = generate_with_fallback(
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_INSTRUCTION,
                    tools=SANDBOX_TOOLS,
                    automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
                ),
            )
            msg = _safe_get_text(followup) or "Command execution was rejected."
        except Exception as e:
            print(f"Followup rejection error: {e}")
            msg = "Command execution was rejected by user."

        return {"type": "rejected", "message": msg}

    # 2. Approved: Execute the command in the Docker container
    exec_result = dispatch_tool_call(tool_name, tool_args)

    # 3. Append function response with role="user"
    contents.append(
        types.Content(
            role="user",
            parts=[
                types.Part.from_function_response(
                    name=tool_name,
                    response=exec_result,
                )
            ],
        )
    )

    # 4. Request the final follow-up answer from Gemini
    try:
        followup = generate_with_fallback(
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_INSTRUCTION,
                tools=SANDBOX_TOOLS,
                automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
            ),
        )
        followup_text = _safe_get_text(followup)
    except Exception as e:
        print(f"Followup generation error: {e}")
        followup_text = ""

    return {
        "type": "executed",
        "command": tool_args.get("command", "") or tool_args.get("filename", ""),
        "execution_output": exec_result.get("output", "") or exec_result.get("status", "Done"),
        "exit_code": exec_result.get("exit_code", 0),
        "message": followup_text or "Command executed successfully in Docker sandbox.",
    }