import os
import google.auth
from google.auth.transport.requests import AuthorizedSession
from google.oauth2 import service_account


def get_authorized_session(scopes=None):
    """Return AuthorizedSession and project_id using default credentials."""
    scopes = scopes or ["https://www.googleapis.com/auth/datastore"]
    creds = None
    project_id = None
    cred_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    if cred_path:
        try:
            creds = service_account.Credentials.from_service_account_file(
                cred_path, scopes=scopes
            )
            project_id = creds.project_id
        except Exception as e:
            print("⚠️  Failed to load service account file:", e)
    if not creds:
        creds, project_id = google.auth.default(scopes=scopes)
    return AuthorizedSession(creds), project_id
