# Gunicorn configuration for FloorPlanTo3D API
import multiprocessing
import os

# Load environment variables
try:
    from dotenv import load_dotenv
    load_dotenv()  # Load .env file if it exists
except ImportError:
    pass  # python-dotenv not installed, use system env vars only

# Server socket
host = os.getenv('HOST', '0.0.0.0')
port = os.getenv('PORT', '5000')
bind = f"{host}:{port}"
backlog = int(os.getenv('BACKLOG', 2048))

# Worker processes
workers = int(os.getenv('WORKERS', min(4, multiprocessing.cpu_count())))
worker_class = "sync"
worker_connections = int(os.getenv('WORKER_CONNECTIONS', 1000))
timeout = int(os.getenv('WORKER_TIMEOUT', 300))  # 5 minutes timeout for ML inference
keepalive = 2

# Memory and performance
max_requests = int(os.getenv('MAX_REQUESTS', 100))  # Restart workers after N requests
max_requests_jitter = int(os.getenv('MAX_REQUESTS_JITTER', 20))
preload_app = True  # Load model once and share across workers

# Logging
accesslog = os.getenv('ACCESS_LOG', 'access.log')
errorlog = os.getenv('ERROR_LOG', 'error.log')
loglevel = os.getenv('LOG_LEVEL', 'info').lower()
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Process naming
proc_name = "floorplan_api"

# Server mechanics
daemon = False
pidfile = "gunicorn.pid"
user = None
group = None
tmp_upload_dir = None

# SSL configuration (set via environment variables)
ssl_keyfile = os.getenv('SSL_KEYFILE')
ssl_certfile = os.getenv('SSL_CERTFILE')
if ssl_keyfile and ssl_certfile:
    keyfile = ssl_keyfile
    certfile = ssl_certfile

# Resource limits
limit_request_line = 4096
limit_request_fields = 100
limit_request_field_size = 8190

def when_ready(server):
    server.log.info("FloorPlanTo3D API server is ready. Listening on: %s", server.address)

def worker_int(worker):
    worker.log.info("Worker received INT or QUIT signal")

def on_exit(server):
    server.log.info("FloorPlanTo3D API server is shutting down") 