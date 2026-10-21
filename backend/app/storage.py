import shutil
from pathlib import Path

import boto3
from botocore.config import Config

from app.config import get_settings

settings = get_settings()


def _s3():
    return boto3.client(
        "s3", endpoint_url=settings.s3_endpoint_url or None,
        aws_access_key_id=settings.s3_access_key or None,
        aws_secret_access_key=settings.s3_secret_key or None,
        region_name=settings.s3_region,
        config=Config(s3={"addressing_style": "path" if settings.s3_force_path_style else "virtual"}),
    )


def put_bytes(key: str, body: bytes, content_type: str) -> None:
    if settings.storage_backend == "local":
        path = Path(settings.storage_path, key)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(body)
        return
    _s3().put_object(Bucket=settings.s3_bucket, Key=key, Body=body, ContentType=content_type, ServerSideEncryption="AES256")


def put_stream(key: str, stream, content_type: str) -> None:
    if settings.storage_backend == "local":
        path = Path(settings.storage_path, key)
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("wb") as target:
            shutil.copyfileobj(stream, target, length=1024 * 1024)
        return
    _s3().upload_fileobj(stream, settings.s3_bucket, key, ExtraArgs={"ContentType": content_type, "ServerSideEncryption": "AES256"})


def get_bytes(key: str) -> bytes:
    if settings.storage_backend == "local":
        return Path(settings.storage_path, key).read_bytes()
    return _s3().get_object(Bucket=settings.s3_bucket, Key=key)["Body"].read()


def delete_object(key: str) -> None:
    if settings.storage_backend == "local":
        Path(settings.storage_path, key).unlink(missing_ok=True)
    else:
        _s3().delete_object(Bucket=settings.s3_bucket, Key=key)


def ensure_bucket() -> None:
    if settings.storage_backend == "s3":
        client = _s3()
        try:
            client.head_bucket(Bucket=settings.s3_bucket)
        except Exception:
            if settings.app_env == "production":
                raise RuntimeError("Configured object-storage bucket is not reachable")
            client.create_bucket(Bucket=settings.s3_bucket)
