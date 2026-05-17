from django.urls import path

from .views import (
    CategoriesView,
    DepartmentsView,
    ExportView,
    HeatmapView,
    MyImpactView,
    OverviewView,
    TrendsView,
)

urlpatterns = [
    path('overview/', OverviewView.as_view(), name='analytics-overview'),
    path('departments/', DepartmentsView.as_view(), name='analytics-departments'),
    path('categories/', CategoriesView.as_view(), name='analytics-categories'),
    path('trends/', TrendsView.as_view(), name='analytics-trends'),
    path('heatmap/', HeatmapView.as_view(), name='analytics-heatmap'),
    path('me/impact/', MyImpactView.as_view(), name='analytics-me-impact'),
    path('export/', ExportView.as_view(), name='analytics-export'),
]
