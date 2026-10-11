import logging
import os
from pathlib import Path
from uuid import uuid4

import boto3
from botocore.exceptions import BotoCoreError, ClientError

from app.core.config import settings

logger = logging.getLogger(__name__)


class EvidenceStorageError(Exception):
    pass


def save_evidence(file_obj, extension: str, complaint_id: int) -> tuple[str, str]:
    """Persist evidence locally for development or in private S3 when configured."""
    filename = f"{complaint_id}_{uuid4().hex}.{extension}"

    if settings.S3_BUCKET:
        try:
            key = f"evidence/{filename}"
            boto3.client("s3").upload_fileobj(file_obj, settings.S3_BUCKET, key)
            return key, filename
        except (BotoCoreError, ClientError) as exc:
            logger.exception("Could not upload evidence to S3")
            raise EvidenceStorageError from exc

    try:
        upload_dir = Path(settings.UPLOAD_DIR)
        upload_dir.mkdir(parents=True, exist_ok=True)
        file_path = upload_dir / filename
        with file_path.open("wb") as output:
            for chunk in iter(lambda: file_obj.read(1024 * 1024), b""):
                output.write(chunk)
        return str(file_path), filename
    except OSError as exc:
        logger.exception("Could not save evidence to local storage")
        raise EvidenceStorageError from exc


def get_evidence(file_path: str):
    """Return a local file path or an S3 streaming body for an evidence record."""
    if settings.S3_BUCKET:
        try:
            return boto3.client("s3").get_object(
                Bucket=settings.S3_BUCKET,
                Key=file_path,
            )["Body"]
        except (BotoCoreError, ClientError) as exc:
            logger.exception("Could not retrieve evidence from S3")
            raise EvidenceStorageError from exc

    try:
        path = Path(file_path)
        if not path.is_absolute():
            path = Path(settings.UPLOAD_DIR) / path.name
        if not path.is_file():
            return None
        return path
    except OSError as exc:
        logger.exception("Could not read evidence from local storage")
        raise EvidenceStorageError from exc


def delete_evidence(file_path: str) -> None:
    """Delete evidence from S3 or local disk after a failed database write."""
    if settings.S3_BUCKET:
        try:
            boto3.client("s3").delete_object(Bucket=settings.S3_BUCKET, Key=file_path)
        except (BotoCoreError, ClientError):
            logger.exception("Could not remove orphaned evidence from S3")
        return

    try:
        os.remove(file_path)
    except FileNotFoundError:
        pass
