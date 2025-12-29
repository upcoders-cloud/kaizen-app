from django.contrib import admin
from django.utils.html import format_html
from .models import KaizenPost, Comment, Like, PostImage, PostSurvey, Notification


# 1. This class allows you to manage images directly inside the KaizenPost form
class PostImageInline(admin.TabularInline):
    model = PostImage
    extra = 1  # Number of empty slots for new images
    readonly_fields = ['image_preview']

    def image_preview(self, obj):
        if obj.image:
            return format_html('<img src="{}" style="max-height: 100px;"/>', obj.image.url)
        return "Brak zdjęcia"

    image_preview.short_description = "Podgląd"


@admin.register(KaizenPost)
class KaizenPostAdmin(admin.ModelAdmin):
    # Added 'title' to the display and 'title' to search fields
    list_display = ('id', 'title', 'author', 'category', 'created_at', 'image_count')
    list_filter = ('category', 'created_at')
    search_fields = ('title', 'content', 'author__username')  # Adjust 'author__nickname' if needed

    # This attaches the image upload rows to the bottom of the Post form
    inlines = [PostImageInline]

    def image_count(self, obj):
        return obj.images.count()

    image_count.short_description = "Liczba zdjęć"


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ('author', 'post', 'created_at')


@admin.register(PostImage)
class PostImageAdmin(admin.ModelAdmin):
    list_display = ('id', 'post', 'image_preview', 'uploaded_at')

    def image_preview(self, obj):
        if obj.image:
            return format_html('<img src="{}" style="max-height: 50px;"/>', obj.image.url)
        return "Brak"


# Keep the Like registration as is
admin.site.register(Like)


@admin.register(PostSurvey)
class PostSurveyAdmin(admin.ModelAdmin):
    list_display = ('post', 'frequency_value', 'frequency_unit', 'affected_people', 'time_lost_minutes')


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('type', 'recipient', 'actor', 'post', 'created_at', 'read_at')
    list_filter = ('type', 'created_at', 'read_at')
