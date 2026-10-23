# backend/tools.py
from pathlib import Path
from typing import Dict, Any
import docker

# Workspace mount directory
WORKSPACE_DIR = Path(__file__).resolve().parent.parent / "workspace"
WORKSPACE_DIR.mkdir(parents=True, exist_ok=True)

# Tool functions that require explicit human approval before running
SENSITIVE_TOOLS = {"execute_sandbox_command", "write_workspace_file"}


def read_workspace_file(filename: str) -> Dict[str, Any]:
    """
    Read the text contents of a file inside the user's workspace directory.
    Args:
        filename: Name or relative path of the file to inspect.
    """
    file_path = WORKSPACE_DIR / filename
    if not file_path.exists():
        return {"error": f"File '{filename}' does not exist in workspace."}
    try:
        content = file_path.read_text(encoding="utf-8")
        return {"filename": filename, "content": content}
    except Exception as e:
        return {"error": f"Failed to read file: {str(e)}"}


def write_workspace_file(filename: str, content: str) -> Dict[str, Any]:
    """
    Create or overwrite a file in the workspace directory with the given content.
    Args:
        filename: The name of the file to write.
        content: The complete text or code to write to disk.
    """
    file_path = WORKSPACE_DIR / filename
    try:
        file_path.write_text(content, encoding="utf-8")
        return {
            "status": "success",
            "filename": filename,
            "bytes_written": len(content.encode("utf-8")),
        }
    except Exception as e:
        return {"error": f"Failed to write file: {str(e)}"}


def execute_sandbox_command(command: str) -> Dict[str, Any]:
    """
    Execute a shell, build, or test command inside the isolated Ubuntu Docker sandbox container.
    Args:
        command: The bash command to execute inside /workspace.
    """
    container_name = "codepilot-runner"
    try:
        client = docker.from_env()
        container = client.containers.get(container_name)
    except docker.errors.NotFound:
        return {"error": f"Sandbox container '{container_name}' is not running."}
    except Exception as e:
        return {"error": f"Docker connection error: {str(e)}"}

    try:
        # Wrap command with bash -c to support piping, flags, and chaining (&&, ||)
        exec_res = container.exec_run(
            cmd=f"bash -c '{command}'",
            workdir="/workspace",
            demux=True,
        )

        stdout_bytes, stderr_bytes = exec_res.output
        stdout_str = stdout_bytes.decode("utf-8", errors="replace") if stdout_bytes else ""
        stderr_str = stderr_bytes.decode("utf-8", errors="replace") if stderr_bytes else ""
        full_output = stdout_str + (("\n" + stderr_str) if stderr_str else "")

        return {
            "exit_code": exec_res.exit_code,
            "output": full_output.strip() or "[Process exited with no output]",
            "error": stderr_str.strip() if exec_res.exit_code != 0 else None,
        }
    except Exception as e:
        return {"error": f"Execution failed: {str(e)}"}


def dispatch_tool_call(tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
    """Dispatches tool calls to their respective functions dynamically."""
    if tool_name == "read_workspace_file":
        return read_workspace_file(arguments.get("filename", ""))
    elif tool_name == "write_workspace_file":
        return write_workspace_file(
            arguments.get("filename", ""),
            arguments.get("content", ""),
        )
    elif tool_name == "execute_sandbox_command":
        return execute_sandbox_command(arguments.get("command", ""))
    else:
        return {"error": f"Unknown tool: '{tool_name}'"}