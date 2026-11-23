import os
import json
import tempfile

from google.cloud import storage
from google.oauth2 import service_account

from datetime import timedelta

bucket_name = os.getenv("GCS_BUCKET")

credentials = service_account.Credentials.from_service_account_file(
    "app/credentials/google.json"
)

client = storage.Client(
    credentials=credentials,
    project="agriscanaidiseasescanningmodel"
)

bucket = client.bucket(bucket_name)


def upload_file_to_gcs(file_content: bytes, destination_blob_name: str):
    print("[DEBUG] Uploading to:", destination_blob_name)

    blob = bucket.blob(destination_blob_name)

    blob.upload_from_string(
        file_content,
        content_type="application/octet-stream"
    )

    print("[DEBUG] Upload SUCCESS")

    return f"gs://{bucket_name}/{destination_blob_name}"


def download_gcs_file(gcs_path: str):
    """
    Downloads GCS file temporarily
    and returns local temp path
    """

    blob = bucket.blob(gcs_path)

    suffix = os.path.splitext(gcs_path)[1]

    temp_file = tempfile.NamedTemporaryFile(
        delete=False,
        suffix=suffix
    )

    blob.download_to_filename(temp_file.name)

    print("[DEBUG] Downloaded temp file:", temp_file.name)

    return temp_file.name



def generate_signed_url(gcs_uri: str, expiry_minutes: int = 15) -> str:
    """Convert gs://bucket/path to a temporary signed HTTPS URL."""
    
    # Strip gs://bucket/ prefix to get the blob path
    bucket_name = os.getenv("GCS_BUCKET")
    blob_path = gcs_uri.replace(f"gs://{bucket_name}/", "")

    credentials = service_account.Credentials.from_service_account_file(
        os.getenv("GOOGLE_APPLICATION_CREDENTIALS"),
        scopes=["https://www.googleapis.com/auth/cloud-platform"]
    )

    client = storage.Client(credentials=credentials)
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(blob_path)

    signed_url = blob.generate_signed_url(
        version="v4",
        expiration=timedelta(minutes=expiry_minutes),
        method="GET",
        credentials=credentials
    )

    return signed_url