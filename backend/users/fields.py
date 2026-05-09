import base64
import io
import uuid

from django.core.files.base import ContentFile
from PIL import Image
from rest_framework import serializers

try:
    from pillow_heif import register_heif_opener
    register_heif_opener()
except ImportError:
    pass


class Base64ImageField(serializers.ImageField):
    """Akceptuje obraz jako string base64 (z lub bez prefixu data:...) lub natywny upload."""

    def _get_extension(self, decoded):
        try:
            image = Image.open(io.BytesIO(decoded))
            image_format = image.format
            if not image_format:
                return 'jpg'
            image_format = image_format.lower()
            return 'jpg' if image_format == 'jpeg' else image_format
        except Exception:
            return 'jpg'

    def to_internal_value(self, data):
        if isinstance(data, str):
            if data.startswith('data:'):
                try:
                    _, data = data.split(';base64,')
                except ValueError:
                    raise serializers.ValidationError('Invalid image data.')
            try:
                decoded = base64.b64decode(data, validate=True)
            except (TypeError, ValueError):
                raise serializers.ValidationError('Invalid image data.')

            file_name = uuid.uuid4().hex[:12]
            file_extension = self._get_extension(decoded)
            data = ContentFile(decoded, name=f'{file_name}.{file_extension}')

        return super().to_internal_value(data)
