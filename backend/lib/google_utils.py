import os
import google.auth
from google.auth.transport.requests import AuthorizedSession
from google.oauth2 import service_account
from google.auth import default as google_auth_default


def get_authorized_session(scopes=None):
    """Return AuthorizedSession and project_id using default credentials."""
    scopes = scopes or ["https://www.googleapis.com/auth/datastore"]
    cred_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")

    if cred_path:
        try:
            creds = service_account.Credentials.from_service_account_file(
                cred_path, scopes=scopes
            )
            project_id = creds.project_id
            print("✅ Loaded service account from local file.")
        except Exception as e:
            print("⚠️  Failed to load service account file:", e)
            creds, project_id = google_auth_default(scopes=scopes)
            print("✅ Loaded default application credentials from metadata.")
    else:
        creds, project_id = google_auth_default(scopes=scopes)
        print("✅ Loaded default application credentials from metadata.")

    return AuthorizedSession(creds), project_id
