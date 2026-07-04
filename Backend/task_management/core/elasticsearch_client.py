import requests
import logging
import time
from django.conf import settings
from requests.auth import HTTPBasicAuth

logger = logging.getLogger(__name__)

ES_HOST = getattr(settings, "ELASTICSEARCH_HOST", "http://localhost:9200")
ES_USER = getattr(settings, "ELASTICSEARCH_USER", "")
ES_PASSWORD = getattr(settings, "ELASTICSEARCH_PASSWORD", "")
ES_TIMEOUT = getattr(settings, "ELASTICSEARCH_TIMEOUT", 0.2)
ES_CHECK_TIMEOUT = getattr(settings, "ELASTICSEARCH_CHECK_TIMEOUT", 0.03)
ES_ENABLED = getattr(settings, "ELASTICSEARCH_ENABLED", False)

# Cached ES availability state to prevent blocking network attempts when ES is offline
_es_active = None
_last_checked = 0
CHECK_INTERVAL = getattr(settings, "ELASTICSEARCH_CHECK_INTERVAL", 60)

# Global requests.Session to enable connection pooling
_session = requests.Session()

def _get_auth():
    """Returns requests HTTPBasicAuth if credentials are provided in settings/env."""
    if ES_USER and ES_PASSWORD:
        return HTTPBasicAuth(ES_USER, ES_PASSWORD)
    return None

def check_es_availability():
    global _es_active, _last_checked
    if not ES_ENABLED:
        _es_active = False
        return False

    now = time.time()
    if _es_active is None or (now - _last_checked > CHECK_INTERVAL):
        _last_checked = now
        try:
            res = _session.get(ES_HOST, timeout=ES_CHECK_TIMEOUT, auth=_get_auth())
            _es_active = res.status_code == 200
        except requests.RequestException as exc:
            logger.debug("Elasticsearch availability check failed: %s", exc)
            _es_active = False
    return _es_active

def is_es_available():
    """Verify if the Elasticsearch server is up and reachable."""
    return check_es_availability()

def index_document(index_name, doc_id, doc_body):
    """Index a document in Elasticsearch. Fails gracefully if offline."""
    if not check_es_availability():
        return False
    url = f"{ES_HOST}/{index_name}/_doc/{doc_id}"
    try:
        res = _session.put(url, json=doc_body, timeout=ES_TIMEOUT, auth=_get_auth())
        if res.status_code not in [200, 201]:
            logger.warning(
                f"ES index failed: status {res.status_code} for doc {doc_id} in {index_name}"
            )
            return False
        return True
    except Exception as e:
        logger.warning(
            f"ES index connection warning for {index_name}/{doc_id}: {str(e)}"
        )
        return False

def delete_document(index_name, doc_id):
    """Delete a document from Elasticsearch. Fails gracefully if offline."""
    if not check_es_availability():
        return False
    url = f"{ES_HOST}/{index_name}/_doc/{doc_id}"
    try:
        res = _session.delete(url, timeout=ES_TIMEOUT, auth=_get_auth())
        if res.status_code not in [200, 204, 404]:
            logger.warning(
                f"ES delete failed: status {res.status_code} for doc {doc_id} in {index_name}"
            )
            return False
        return True
    except Exception as e:
        logger.warning(
            f"ES delete connection warning for {index_name}/{doc_id}: {str(e)}"
        )
        return False

def search_index(index_names, search_query_body):
    """Perform a search across Elasticsearch indexes. Fails gracefully by returning None."""
    if not check_es_availability():
        return None
    indices = ",".join(index_names)
    url = f"{ES_HOST}/{indices}/_search"
    try:
        res = _session.post(url, json=search_query_body, timeout=ES_TIMEOUT, auth=_get_auth())
        if res.status_code == 200:
            return res.json()
        logger.warning(f"ES search failed: status {res.status_code}")
        return None
    except Exception as e:
        logger.warning(f"ES search connection warning: {str(e)}")
        return None
