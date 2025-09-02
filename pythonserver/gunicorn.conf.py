# Gunicorn configuration for FloorPlanTo3D API
import multiprocessing
import os

# Load environment variables
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# Core server settings with smart defaults
host = os.getenv('HOST', '0.0.0.0')
port = os.getenv('PORT', '5000')
bind = f"{host}:{port}"

# Smart defaults for production
workers = min(4, multiprocessing.cpu_count())
worker_class = "sync"
worker_connections = 1000
timeout = 300  # 5 minutes for ML inference
keepalive = 2
backlog = 2048

# Memory management
max_requests = 100
max_requests_jitter = 20
preload_app = True

# Logging
accesslog = 'access.log'
errorlog = 'error.log'
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

# SSL configuration (uncomment and set paths if needed)
# keyfile = "server.key"
# certfile = "server.crt"

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