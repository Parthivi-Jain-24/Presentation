from celery import Celery

from app.config import get_settings

settings = get_settings()
celery_app = Celery("classroom_studio", broker=settings.redis_url, backend=settings.redis_url)
celery_app.conf.update(
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    worker_prefetch_multiplier=1,
    task_track_started=True,
    # A local CPU model may take several minutes per chapter section. Avoid
    # killing the whole lesson (and redelivering it from page one) mid-draft.
    task_time_limit=2460,
    task_soft_time_limit=2400,
    result_expires=3600,
    task_routes={"app.tasks.*": {"queue": "documents"}},
    broker_transport_options={"visibility_timeout": 2700},
    beat_schedule={"purge-expired-pdf-uploads": {"task": "app.tasks.purge_expired_uploads", "schedule": 86400.0}},
)
celery_app.autodiscover_tasks(["app"])
