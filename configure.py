"""Generate machine-specific plugin configuration locally, never for publication."""
import json
from pathlib import Path
import sys


def main():
    root = Path(__file__).resolve().parent
    config = {"mcpServers": {"apple_mail": {
        "command": sys.executable,
        "args": [str(root / "server.py")],
        "tool_timeout_sec": 120,
    }}}
    path = root / ".mcp.json"
    if path.is_symlink():
        raise RuntimeError("Refusing to overwrite a symlink")
    path.write_text(json.dumps(config, indent=2) + "\n")
    path.chmod(0o600)
    print("Generated .mcp.json locally. It is excluded from version control.")


if __name__ == "__main__":
    main()
