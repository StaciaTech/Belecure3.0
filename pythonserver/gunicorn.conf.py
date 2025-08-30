# Gunicorn configuration for FloorPlanTo3D API
import multiprocessing
import os

# Server socket
bind = "0.0.0.0:5000"
backlog = 2048

# Worker processes
workers = min(4, multiprocessing.cpu_count())  # Max 4 workers for memory efficiency
worker_class = "sync"
worker_connections = 1000
timeout = 300  # 5 minutes timeout for ML inference
keepalive = 2

# Memory and performance
max_requests = 100  # Restart workers after 100 requests to prevent memory leaks
max_requests_jitter = 20
preload_app = True  # Load model once and share across workers

# Logging
accesslog = "access.log"
errorlog = "error.log"
loglevel = "info"
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Process naming
proc_name = "floorplan_api"

# Server mechanics
daemon = False
pidfile = "gunicorn.pid"
user = None
group = None
tmp_upload_dir = None

# SSL (uncomment if using HTTPS)
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