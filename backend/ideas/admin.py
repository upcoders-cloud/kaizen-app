from django.contrib import admin
from .models import KaizenPost, Comment, Like

@admin.register(KaizenPost)
class KaizenPostAdmin(admin.ModelAdmin):
    list_display = ('id', 'author', 'category', 'created_at') # To zobaczysz w tabelce
    list_filter = ('category', 'created_at') # Pasek filtrów po prawej stronie
    search_fields = ('content', 'author__nickname') # Pasek wyszukiwania

@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ('author', 'post', 'created_at')

# Rejestracja polubienia
admin.site.register(Like)
