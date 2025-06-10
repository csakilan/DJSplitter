# celery_config.py
# ---------------------------------------------------------------------------
# 1)  Force *spawn* everywhere (avoids macOS fork‑safety SIGABRT with PyTorch)
import multiprocessing as mp
mp.set_start_method("spawn", force=True)

# 2)  Pre‑import libraries that don't like forking
import torch  # optional but recommended for stability

# 3)  Build the Celery application
from celery import Celery

celery_app = Celery(
    "demucs_tasks",
    broker="redis://localhost:6379/0",
    backend="redis://localhost:6379/1",
    include=["demucsRunner"],          # <-- no direct import → no circular ref
)

# (optional) baseline config tweaks
celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
)
