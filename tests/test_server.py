import json
from pathlib import Path
import subprocess
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import server


class ServerTests(unittest.TestCase):
    def test_protocol_and_schema(self):
        response = server.handle({"id": 1, "method": "initialize", "params": {"protocolVersion": "2024-11-05"}})
        self.assertEqual(response["result"]["protocolVersion"], "2024-11-05")
        tools = server.handle({"id": 2, "method": "tools/list"})["result"]["tools"]
        self.assertEqual(len(tools), 11)
        self.assertIsNone(server.handle({"method": "notifications/initialized"}))

    @patch("server.subprocess.run")
    def test_invalid_input_never_reaches_mail(self, run):
        for name, args in (
            ("mail_read", {"account": "test", "mailbox": ["Inbox"], "id": True}),
            ("mail_selection", {"limit": 1000}),
            ("mail_search", {"account": "test", "mailbox": []}),
            ("mail_accounts", {"extra": "unsupported"}),
            ("unknown_tool", {}),
        ):
            with self.subTest(name=name):
                with self.assertRaises(ValueError):
                    server.call(name, args)
        run.assert_not_called()

    @patch("server.subprocess.run")
    def test_user_text_is_data_not_shell_code(self, run):
        run.return_value = subprocess.CompletedProcess([], 0, stdout="{}", stderr="")
        text = 'quote " newline\n$(invalid_command); `invalid_command`'
        server.call("mail_search", {"account": "test", "mailbox": ["Inbox"], "subject": text})
        argv = run.call_args.args[0]
        self.assertIsInstance(argv, list)
        self.assertEqual(json.loads(argv[-1])["subject"], text)
        self.assertNotIn("shell", run.call_args.kwargs)

    @patch("server.subprocess.run")
    def test_bridge_failure_is_tool_error(self, run):
        run.return_value = subprocess.CompletedProcess([], 1, stdout="", stderr="Automation denied")
        result = server.handle({"id": 3, "method": "tools/call", "params": {"name": "mail_accounts", "arguments": {}}})
        self.assertTrue(result["result"]["isError"])
        self.assertIn("Automation denied", result["result"]["content"][0]["text"])


if __name__ == "__main__":
    unittest.main()
