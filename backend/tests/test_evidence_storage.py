import io

from app.core.config import settings
from app.services import evidence_storage


class FakeS3Body:
    def iter_chunks(self, chunk_size):
        yield b"stored evidence"


class FakeS3Client:
    def __init__(self):
        self.objects = {}

    def upload_fileobj(self, file_obj, bucket, key):
        self.objects[(bucket, key)] = file_obj.read()

    def get_object(self, Bucket, Key):
        return {"Body": FakeS3Body()}

    def delete_object(self, Bucket, Key):
        self.objects.pop((Bucket, Key), None)


def test_evidence_storage_uses_s3_when_bucket_is_configured(monkeypatch):
    client = FakeS3Client()
    monkeypatch.setattr(settings, "S3_BUCKET", "private-evidence")
    monkeypatch.setattr(evidence_storage.boto3, "client", lambda service: client)

    file_path, filename = evidence_storage.save_evidence(
        io.BytesIO(b"private evidence"), "png", 42
    )

    assert file_path == f"evidence/{filename}"
    assert filename.startswith("42_")
    assert client.objects[("private-evidence", file_path)] == b"private evidence"
    assert isinstance(evidence_storage.get_evidence(file_path), FakeS3Body)
    evidence_storage.delete_evidence(file_path)
    assert ("private-evidence", file_path) not in client.objects
