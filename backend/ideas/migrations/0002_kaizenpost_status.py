from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("ideas", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="kaizenpost",
            name="status",
            field=models.CharField(
                choices=[
                    ("TO_VERIFY", "Do weryfikacji"),
                    ("SUBMITTED", "Zgłoszony"),
                    ("IN_PROGRESS", "W trakcie wdrożenia"),
                    ("IMPLEMENTED", "Wdrożone"),
                ],
                default="TO_VERIFY",
                max_length=20,
                verbose_name="Status",
            ),
        ),
    ]
