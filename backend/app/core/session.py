import uuid
import pandas as pd
from typing import Dict, Any, Optional, List
from datetime import datetime

class DatasetSession:
    def __init__(self, session_id: str, filename: str, file_type: str, file_size: int, raw_df: pd.DataFrame):
        self.session_id = session_id
        self.filename = filename
        self.file_type = file_type
        self.file_size = file_size
        self.raw_df = raw_df.copy()
        self.df = raw_df.copy()
        self.created_at = datetime.utcnow()
        self.audit_log: List[Dict[str, Any]] = []
        self.dashboard_config: Optional[Dict[str, Any]] = None
        self.chat_history: List[Dict[str, Any]] = []
        self.custom_prompt: str = ""

    def reset_to_raw(self):
        """Resets active DataFrame back to the original raw data and logs the reset."""
        rows_before = len(self.df)
        self.df = self.raw_df.copy()
        rows_after = len(self.df)
        self.audit_log.append({
            "operation": "Reset to Raw",
            "description": "Reverted all cleaning transformations to original uploaded data",
            "timestamp": datetime.utcnow().isoformat(),
            "rows_before": rows_before,
            "rows_after": rows_after,
            "details": {"rows_restored": rows_after}
        })

    def add_audit(self, operation: str, description: str, rows_before: int, rows_after: int, details: Optional[Dict[str, Any]] = None):
        self.audit_log.append({
            "operation": operation,
            "description": description,
            "timestamp": datetime.utcnow().isoformat(),
            "rows_before": rows_before,
            "rows_after": rows_after,
            "details": details or {}
        })

class SessionManager:
    def __init__(self):
        self._sessions: Dict[str, DatasetSession] = {}

    def create_session(self, filename: str, file_type: str, file_size: int, df: pd.DataFrame, session_id: Optional[str] = None) -> DatasetSession:
        sid = session_id or str(uuid.uuid4())
        session = DatasetSession(sid, filename, file_type, file_size, df)
        self._sessions[sid] = session
        return session

    def get_session(self, session_id: str) -> Optional[DatasetSession]:
        return self._sessions.get(session_id)

    def delete_session(self, session_id: str) -> bool:
        if session_id in self._sessions:
            del self._sessions[session_id]
            return True
        return False

# Global in-memory singleton session manager
session_manager = SessionManager()
