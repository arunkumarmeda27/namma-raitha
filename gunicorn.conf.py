import os


# Render requires web services to listen on 0.0.0.0:$PORT.
bind = f"0.0.0.0:{os.getenv('PORT', '10000')}"

# Keep defaults conservative for small instances.
workers = int(os.getenv("WEB_CONCURRENCY", "1"))
threads = int(os.getenv("GUNICORN_THREADS", "1"))
timeout = int(os.getenv("GUNICORN_TIMEOUT", "120"))

accesslog = "-"
errorlog = "-"
