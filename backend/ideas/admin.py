from django.contrib import admin
from django.utils.html import format_html
from .models import KaizenPost, Comment, Like, PostImage, PostSurvey, Notification, Category

class PostImageInline(admin.TabularInline):
    model = PostImage
    extra = 1
    readonly_fields = ['image_preview']

    def image_preview(self, obj):
        if obj.image:
            return format_html('<img src="{}" style="max-height: 100px;"/>', obj.image.url)
        return "Brak zdjęcia"

    image_preview.short_description = "Podgląd"


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'is_active')
    list_editable = ('is_active',)
    search_fields = ('name',)


@admin.register(KaizenPost)
class KaizenPostAdmin(admin.ModelAdmin):
    list_select_related = ('author', 'category')
    list_display = ('id', 'title', 'author', 'category', 'created_at', 'image_count')
    list_filter = ('category', 'created_at', 'status')
    search_fields = ('title', 'content', 'author__username', 'author__first_name', 'author__last_name')
    inlines = [PostImageInline]

    def image_count(self, obj):
        return obj.images.count()

    image_count.short_description = "Liczba zdjęć"


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ('author', 'post', 'created_at')
    search_fields = ('author__username', 'content', 'post__title')


@admin.register(PostImage)
class PostImageAdmin(admin.ModelAdmin):
    list_display = ('id', 'post', 'image_preview', 'uploaded_at')
    search_fields = ('post__title',)

    def image_preview(self, obj):
        if obj.image:
            return format_html('<img src="{}" style="max-height: 50px;"/>', obj.image.url)
        return "Brak"


@admin.register(Like)
class LikeAdmin(admin.ModelAdmin):
    list_display = ('user', 'post')
    search_fields = ('user__username', 'post__title')


@admin.register(PostSurvey)
class PostSurveyAdmin(admin.ModelAdmin):
    list_display = ('post', 'frequency_value', 'frequency_unit', 'affected_people', 'time_lost_minutes')
    search_fields = ('post__title', 'post__content')


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('type', 'recipient', 'actor', 'post', 'created_at', 'read_at')
    list_filter = ('type', 'created_at', 'read_at')
    search_fields = ('recipient__username', 'actor__username', 'post__title', 'type')