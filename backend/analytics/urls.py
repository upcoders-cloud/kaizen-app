from django.urls import path

from .views import (
    ApprovalsView,
    CategoriesView,
    DepartmentsView,
    ExportView,
    HeatmapView,
    MyImpactView,
    OverviewView,
    ParticipationView,
    TeamView,
    TopIdeasView,
    TrendsView,
)

urlpatterns = [
    path('overview/', OverviewView.as_view(), name='analytics-overview'),
    path('departments/', DepartmentsView.as_view(), name='analytics-departments'),
    path('categories/', CategoriesView.as_view(), name='analytics-categories'),
    path('trends/', TrendsView.as_view(), name='analytics-trends'),
    path('approvals/', ApprovalsView.as_view(), name='analytics-approvals'),
    path('top-ideas/', TopIdeasView.as_view(), name='analytics-top-ideas'),
    path('team/', TeamView.as_view(), name='analytics-team'),
    path('participation/', ParticipationView.as_view(), name='analytics-participation'),
    path('heatmap/', HeatmapView.as_view(), name='analytics-heatmap'),
    path('me/impact/', MyImpactView.as_view(), name='analytics-me-impact'),
    path('export/', ExportView.as_view(), name='analytics-export'),
]
