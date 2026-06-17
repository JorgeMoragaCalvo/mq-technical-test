from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path


def health_check(_: object) -> JsonResponse:
    return JsonResponse({"status": "ok"})


urlpatterns = [
    path("admin/", admin.site.urls),
    path("health/", health_check, name="health-check"),
    path("api/", include("tasks.urls")),
]
