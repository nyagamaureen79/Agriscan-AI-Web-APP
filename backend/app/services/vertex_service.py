import os
from dotenv import load_dotenv

load_dotenv()

from google.oauth2 import service_account
from google.cloud import aiplatform_v1
from google.cloud.aiplatform_v1.types import IndexDatapoint


PROJECT_ID        = os.getenv("GCP_PROJECT_ID")
LOCATION          = os.getenv("GCP_REGION", "us-central1")
INDEX_ID          = os.getenv("VERTEX_INDEX_ID")
INDEX_ENDPOINT_ID = os.getenv("VERTEX_ENDPOINT_ID")
DEPLOYED_INDEX_ID = os.getenv("VERTEX_DEPLOYED_INDEX_ID")
CREDENTIALS_PATH  = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
PUBLIC_DOMAIN     = os.getenv("VERTEX_PUBLIC_DOMAIN")




# ---------------------------------------------------
# PATHS
# ---------------------------------------------------
def get_index_path() -> str:
    return f"projects/{PROJECT_ID}/locations/{LOCATION}/indexes/{INDEX_ID}"


def get_endpoint_path() -> str:
    return f"projects/{PROJECT_ID}/locations/{LOCATION}/indexEndpoints/{INDEX_ENDPOINT_ID}"


# ---------------------------------------------------
# CREDENTIALS
# ---------------------------------------------------
def get_credentials():
    if not CREDENTIALS_PATH:
        raise ValueError("GOOGLE_APPLICATION_CREDENTIALS is not set")
    if not os.path.exists(CREDENTIALS_PATH):
        raise FileNotFoundError(f"Credentials file not found at: {CREDENTIALS_PATH}")
    return service_account.Credentials.from_service_account_file(
        CREDENTIALS_PATH,
        scopes=["https://www.googleapis.com/auth/cloud-platform"]
    )


# ---------------------------------------------------
# CLIENTS
# ---------------------------------------------------
def get_index_client() -> aiplatform_v1.IndexServiceClient:
    """For upsert and delete."""
    return aiplatform_v1.IndexServiceClient(
        credentials=get_credentials(),
        client_options={"api_endpoint": f"{LOCATION}-aiplatform.googleapis.com"}
    )

def get_match_client() -> aiplatform_v1.MatchServiceClient:
    """For search — must point to the public endpoint domain."""
    if not PUBLIC_DOMAIN:
        raise ValueError("VERTEX_PUBLIC_DOMAIN is not set in .env")
    return aiplatform_v1.MatchServiceClient(
        credentials=get_credentials(),
        client_options={"api_endpoint": PUBLIC_DOMAIN}
    )


# ---------------------------------------------------
# UPSERT
# ---------------------------------------------------
def upsert_vector(datapoint_id: str, embedding: list, metadata: dict):
    client = get_index_client()

    datapoint = IndexDatapoint(
        datapoint_id=datapoint_id,
        feature_vector=embedding,
        restricts=[
            IndexDatapoint.Restriction(
                namespace="tenant_id",
                allow_list=[str(metadata["tenant_id"])]
            )
        ]
    )

    request = aiplatform_v1.UpsertDatapointsRequest(
        index=get_index_path(),
        datapoints=[datapoint],
    )

    return client.upsert_datapoints(request=request)


# ---------------------------------------------------
# SEARCH
# ---------------------------------------------------
def search_similar(embedding: list, tenant_id: int, k: int = 5):
    client = get_match_client()

    # MatchServiceClient requires the full endpoint resource name
    endpoint_path = get_endpoint_path()

    print(f"[VERTEX] Searching via endpoint: {endpoint_path}", flush=True)
    print(f"[VERTEX] Deployed index ID: {DEPLOYED_INDEX_ID}", flush=True)

    request = aiplatform_v1.FindNeighborsRequest(
        index_endpoint=endpoint_path,
        deployed_index_id=DEPLOYED_INDEX_ID,
        queries=[
            aiplatform_v1.FindNeighborsRequest.Query(
                datapoint=IndexDatapoint(
                    feature_vector=embedding,
                    restricts=[
                        IndexDatapoint.Restriction(
                            namespace="tenant_id",
                            allow_list=[str(tenant_id)]
                        )
                    ]
                ),
                neighbor_count=k,
            )
        ],
    )

    response = client.find_neighbors(request=request)

    results = []
    for q in response.nearest_neighbors:
        for n in q.neighbors:
            results.append({
                "datapoint_id": n.datapoint.datapoint_id,
                "distance": n.distance,
            })

    print(f"[VERTEX] Search returned {len(results)} results", flush=True)
    return results


# ---------------------------------------------------
# DELETE
# ---------------------------------------------------
def delete_datapoints(datapoint_ids: list):
    client = get_index_client()

    request = aiplatform_v1.RemoveDatapointsRequest(
        index=get_index_path(),
        datapoint_ids=datapoint_ids,
    )

    return client.remove_datapoints(request=request)