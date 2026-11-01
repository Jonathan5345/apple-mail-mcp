import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import unittest
import server
from unittest.mock import patch
class Tests(unittest.TestCase):
 def test_scopes(self):
  for name in ['mail_unread_counts','mail_mark_all_read']:
   with patch('server.subprocess.run') as run:
    with self.assertRaises(ValueError): server.call(name,{'mailbox':['Inbox']})
    run.assert_not_called()
 def test_paging(self):
  s=next(t['inputSchema'] for t in server.TOOLS if t['name']=='mail_search')
  server.validate({'account':'test','mailbox':['Inbox'],'offset':2000},s)
  with self.assertRaises(ValueError): server.validate({'account':'test','mailbox':['Inbox'],'offset':-1},s)
if __name__=='__main__': unittest.main()
