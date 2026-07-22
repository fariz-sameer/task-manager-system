import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "TaskManagementSystem.settings")

django.setup()

from django.contrib.auth.models import User

users_to_delete = ["nsiripurapu123", "swigga4eva", "farizsLeftKundi"]


for username in users_to_delete:
    try:
        user = User.objects.get(username=username)
        user.delete()
        print(f"Deleted {username}")
    except User.DoesNotExist:
        print(f"{username} not found")
