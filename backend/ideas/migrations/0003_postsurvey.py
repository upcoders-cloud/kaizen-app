from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("ideas", "0002_kaizenpost_status"),
    ]

    operations = [
        migrations.CreateModel(
            name="PostSurvey",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("frequency_value", models.PositiveIntegerField(verbose_name="Częstotliwość")),
                (
                    "frequency_unit",
                    models.CharField(
                        choices=[("DAY", "Dzień"), ("WEEK", "Tydzień"), ("MONTH", "Miesiąc")],
                        max_length=10,
                        verbose_name="Jednostka częstotliwości",
                    ),
                ),
                ("affected_people", models.PositiveIntegerField(verbose_name="Liczba osób")),
                ("time_lost_minutes", models.PositiveIntegerField(verbose_name="Strata czasu (min)")),
                (
                    "estimated_time_savings_hours",
                    models.FloatField(verbose_name="Szacowane oszczędności czasu (h)"),
                ),
                (
                    "estimated_financial_savings",
                    models.DecimalField(decimal_places=2, max_digits=12, verbose_name="Szacowane oszczędności finansowe"),
                ),
                (
                    "post",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="survey",
                        to="ideas.kaizenpost",
                    ),
                ),
            ],
            options={
                "verbose_name": "Ankieta do postu",
                "verbose_name_plural": "Ankiety do postów",
            },
        ),
    ]
