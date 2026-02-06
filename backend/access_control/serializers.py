from rest_framework import serializers

from .services import is_valid_access_code_format, normalize_access_code


class AccessCodeLoginSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=9)

    def validate_code(self, value):
        normalized_code = normalize_access_code(value)
        if not is_valid_access_code_format(normalized_code):
            raise serializers.ValidationError('Kod dostępu musi mieć format XXXX-XXXX.')
        return normalized_code
