import os
import tempfile
import logging
from pathlib import Path

logger = logging.getLogger(__name__)


async def convert_to_cog(raw_key: str, output_key: str, field_id: str) -> None:
    """
    Download GeoTIFF dari R2, convert ke COG, upload kembali ke R2.

    Alur:
    1. Download raw GeoTIFF dari R2 via GDAL /vsis3/ (GDAL env vars sudah diset)
    2. Convert ke COG menggunakan rio-cogeo
    3. Upload COG ke R2
    4. Cleanup temp files

    Note: GDAL menggunakan env vars AWS_S3_ENDPOINT, AWS_ACCESS_KEY_ID, dll
    untuk autentikasi ke Cloudflare R2 secara transparan.
    """
    try:
        import boto3
        from botocore.client import Config
        from rio_cogeo.cogeo import cog_translate
        from rio_cogeo.profiles import cog_profiles

        bucket = os.getenv("R2_BUCKET_NAME", "awd-orthomosaic")
        endpoint = os.getenv("AWS_S3_ENDPOINT", "")
        access_key = os.getenv("AWS_ACCESS_KEY_ID", "")
        secret_key = os.getenv("AWS_SECRET_ACCESS_KEY", "")

        # Setup S3 client (boto3 kompatibel dengan R2)
        s3 = boto3.client(
            "s3",
            endpoint_url=endpoint,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            config=Config(signature_version="s3v4"),
        )

        with tempfile.TemporaryDirectory() as tmpdir:
            raw_path = Path(tmpdir) / "raw.tif"
            cog_path = Path(tmpdir) / "cog.tif"

            # 1. Download raw GeoTIFF
            logger.info(f"[{field_id}] Downloading {raw_key} from R2...")
            s3.download_file(bucket, raw_key, str(raw_path))

            # 2. Convert ke COG
            logger.info(f"[{field_id}] Converting to COG...")
            output_profile = cog_profiles.get("deflate")
            output_profile.update({"blockxsize": 512, "blockysize": 512})

            cog_translate(
                input=str(raw_path),
                output=str(cog_path),
                profile=output_profile,
                in_memory=False,
                quiet=True,
                overview_resampling="average",
            )

            # 3. Upload COG ke R2
            logger.info(f"[{field_id}] Uploading COG to {output_key}...")
            s3.upload_file(
                str(cog_path),
                bucket,
                output_key,
                ExtraArgs={"ContentType": "image/tiff"},
            )

            logger.info(f"[{field_id}] COG conversion complete: {output_key}")

    except Exception as e:
        logger.error(f"[{field_id}] COG conversion failed for {raw_key}: {e}", exc_info=True)
        # TODO: callback ke Server 1 untuk update upload status ke 'failed'
        raise
