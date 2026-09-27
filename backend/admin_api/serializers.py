from django.contrib.auth import get_user_model
from rest_framework import serializers

from gamification.models import Badge, Level, PointRule, Reward, RewardRedemption
from ideas.models import Category
from users.models import Department, department_lead_error
from users.serializers import UserPublicSerializer

User = get_user_model()

MIN_PASSWORD_LENGTH = 6


def _annotated_count(obj, attr, fallback):
    """Wartość z adnotacji querysetu, a dla świeżo utworzonych obiektów - liczona zapytaniem."""
    value = getattr(obj, attr, None)
    return value if value is not None else fallback()


def validate_password_value(value):
    if not value or len(value) < MIN_PASSWORD_LENGTH:
        raise serializers.ValidationError(
            f'Hasło musi mieć co najmniej {MIN_PASSWORD_LENGTH} znaków.'
        )
    return value


class AdminUserSerializer(serializers.ModelSerializer):
    department = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(), required=False, allow_null=True,
    )
    department_name = serializers.CharField(source='department.name', read_only=True, default=None)
    points = serializers.SerializerMethodField()
    password = serializers.CharField(write_only=True, required=False)
    nickname = serializers.CharField(required=False, max_length=50)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'nickname', 'first_name', 'last_name', 'email',
            'role', 'department', 'department_name',
            'is_active', 'is_staff', 'is_superuser',
            'points', 'date_joined', 'last_login', 'password',
        ]
        read_only_fields = ['id', 'date_joined', 'last_login', 'points']

    def get_points(self, obj):
        profile = getattr(obj, 'gamification', None)
        return profile.total_points if profile else 0

    def validate_nickname(self, value):
        qs = User.objects.filter(nickname=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError('Ten nick jest już zajęty.')
        return value

    def validate(self, attrs):
        request = self.context.get('request')
        actor = getattr(request, 'user', None)
        if self.instance is None and not attrs.get('password'):
            raise serializers.ValidationError({'password': 'Hasło jest wymagane przy tworzeniu konta.'})
        if attrs.get('password'):
            validate_password_value(attrs['password'])
        if 'is_superuser' in attrs and actor and not actor.is_superuser:
            if bool(attrs['is_superuser']) != bool(getattr(self.instance, 'is_superuser', False)):
                raise serializers.ValidationError(
                    {'is_superuser': 'Tylko superużytkownik może nadawać uprawnienia superużytkownika.'}
                )
        if self.instance is not None and actor and self.instance.pk == actor.pk:
            if attrs.get('is_active') is False:
                raise serializers.ValidationError({'is_active': 'Nie możesz dezaktywować własnego konta.'})
            if attrs.get('is_staff') is False and not actor.is_superuser:
                raise serializers.ValidationError({'is_staff': 'Nie możesz odebrać sobie uprawnień administratora.'})
        return attrs

    def create(self, validated_data):
        password = validated_data.pop('password')
        if not validated_data.get('nickname'):
            validated_data['nickname'] = validated_data['username']
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        user = super().update(instance, validated_data)
        if password:
            user.set_password(password)
            user.save(update_fields=['password'])
        return user


class SetPasswordSerializer(serializers.Serializer):
    password = serializers.CharField()

    def validate_password(self, value):
        return validate_password_value(value)


class AdjustPointsSerializer(serializers.Serializer):
    points = serializers.IntegerField()
    reason = serializers.CharField(max_length=255)

    def validate_points(self, value):
        if value == 0:
            raise serializers.ValidationError('Liczba punktów nie może być zerem.')
        if abs(value) > 100000:
            raise serializers.ValidationError('Zbyt duża korekta punktów.')
        return value


class AdminDepartmentSerializer(serializers.ModelSerializer):
    lead = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(is_active=True), required=False, allow_null=True,
    )
    lead_name = serializers.SerializerMethodField()
    member_count = serializers.SerializerMethodField()

    class Meta:
        model = Department
        fields = ['id', 'name', 'is_active', 'lead', 'lead_name', 'member_count']

    def validate_lead(self, lead):
        # Nowy dział nie ma jeszcze członków, więc lidera ustawia się po przypisaniu go do działu.
        if lead is not None:
            error = department_lead_error(lead, self.instance.pk if self.instance else None)
            if error:
                raise serializers.ValidationError(error)
        return lead

    def get_lead_name(self, obj):
        if not obj.lead:
            return None
        return obj.lead.get_full_name() or obj.lead.username

    def get_member_count(self, obj):
        return _annotated_count(obj, 'member_count', lambda: obj.members.filter(is_active=True).count())


class AdminCategorySerializer(serializers.ModelSerializer):
    post_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ['id', 'name', 'is_active', 'post_count']

    def get_post_count(self, obj):
        return _annotated_count(obj, 'post_count', lambda: obj.kaizenpost_set.count())


class AdminRewardSerializer(serializers.ModelSerializer):
    redemption_count = serializers.SerializerMethodField()

    class Meta:
        model = Reward
        fields = [
            'id', 'name', 'description', 'cost_points', 'stock',
            'icon', 'is_active', 'order', 'redemption_count',
        ]

    def get_redemption_count(self, obj):
        counts = self.context.get('reward_redemption_counts')
        if counts is not None:
            return counts.get(obj.id, 0)
        return _annotated_count(obj, 'redemption_count', lambda: obj.redemptions.count())


class AdminRedemptionSerializer(serializers.ModelSerializer):
    user = UserPublicSerializer(read_only=True)
    handled_by = UserPublicSerializer(read_only=True)
    reward = AdminRewardSerializer(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = RewardRedemption
        fields = [
            'id', 'user', 'reward', 'points_spent', 'status', 'status_display',
            'note', 'created_at', 'handled_at', 'handled_by',
        ]
        read_only_fields = fields


class RedemptionActionSerializer(serializers.Serializer):
    note = serializers.CharField(required=False, allow_blank=True, max_length=255)


class AdminPointRuleSerializer(serializers.ModelSerializer):
    action_display = serializers.CharField(source='get_action_display', read_only=True)

    class Meta:
        model = PointRule
        fields = ['id', 'action', 'action_display', 'points', 'daily_cap', 'is_active', 'description']
        read_only_fields = ['id', 'action', 'action_display']


class AdminBadgeSerializer(serializers.ModelSerializer):
    awarded_count = serializers.SerializerMethodField()

    class Meta:
        model = Badge
        fields = [
            'id', 'code', 'name', 'description', 'icon', 'criteria_type',
            'threshold', 'tier', 'is_active', 'order', 'awarded_count',
        ]

    def get_awarded_count(self, obj):
        return _annotated_count(obj, 'awarded_count', lambda: obj.awarded_to.count())


class AdminLevelSerializer(serializers.ModelSerializer):
    class Meta:
        model = Level
        fields = ['id', 'name', 'min_points', 'order', 'color', 'icon']
