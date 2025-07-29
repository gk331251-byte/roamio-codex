import os
import json
from google.auth.transport.requests import AuthorizedSession
from google.cloud import secretmanager
from google.oauth2 import service_account


def get_authorized_session(scopes=None):
    """Return AuthorizedSession and project_id using Secret Manager credentials."""
    scopes = scopes or ["https://www.googleapis.com/auth/datastore"]

    try:
        secret_name = "firestore-key"
        project_id = os.environ.get("GOOGLE_CLOUD_PROJECT") or "real-world-quest-app"
        client = secretmanager.SecretManagerServiceClient()
        name = f"projects/{project_id}/secrets/{secret_name}/versions/latest"

        response = client.access_secret_version(request={"name": name})
        secret_json_str = response.payload.data.decode("UTF-8")
        service_account_info = json.loads(secret_json_str)

        creds = service_account.Credentials.from_service_account_info(
            service_account_info,
            scopes=scopes,
        )

        return AuthorizedSession(creds), creds.project_id

    except Exception as e:
        print("AUTH INIT FAILED in get_authorized_session()")
        print(f"❌ Could not initialize session. Exiting.\n{e}")
        raise e
