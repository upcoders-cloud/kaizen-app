#!/usr/bin/env python3
"""Niedestrukcyjny smoke kontraktu API z docs/team/PLAN.md (sekcja 4)."""

import argparse
import http.client
import json
import sys
import time
import urllib.error
import urllib.request
from dataclasses import dataclass


ACCOUNTS = {
    "user1234": "EMPLOYEE",
    "lead1": "TEAM_LEAD",
    "manager1": "MANAGER",
    "director1": "DIRECTOR",
    "admin": "ADMIN",
}
ALL = frozenset(ACCOUNTS)
APPROVERS = ALL - {"user1234"}
MANAGEMENT = ALL - {"user1234", "lead1"}
ADMIN = frozenset({"admin"})


@dataclass(frozen=True)
class Case:
    path: str
    allowed: frozenset = ALL
    method: str = "GET"
    payload: dict | None = None
    fixture: str | None = None


CASES = [
    Case("users/me/"), Case("users/{user}/", fixture="user"),
    Case("users/?search=&role=EMPLOYEE"), Case("users/approvers/"),
    Case("posts/?search=&ordering=newest"), Case("posts/?mine=1"),
    Case("posts/?status=TO_VERIFY"), Case("posts/{post}/", fixture="post"),
    Case("posts/approvals_queue/"),
    Case("posts/approvals_queue/count/"),
    Case("posts/approvals_queue/?stage=TEAM_LEAD"),
    Case("posts/pipeline/", MANAGEMENT), Case("posts/trending/?limit=5"),
    Case("posts/bookmarked/"), Case("posts/my_cases/"),
    Case("categories/"), Case("comments/"), Case("notifications/"),
    Case("gamification/leaderboard/?period=month&scope=users"),
    Case("gamification/leaderboard/?period=all&scope=departments"),
    Case("gamification/leaderboard/?period=quarter&scope=categories"),
    Case("gamification/badges/"), Case("gamification/users/{user}/", fixture="user"),
    Case("gamification/me/"), Case("gamification/transactions/"),
    Case("gamification/rewards/"),
    Case("gamification/rewards/{reward}/", fixture="reward"),
    Case("gamification/rewards/my-redemptions/"),
    Case("analytics/overview/", MANAGEMENT), Case("analytics/departments/", MANAGEMENT),
    Case("analytics/categories/", MANAGEMENT), Case("analytics/trends/", MANAGEMENT),
    Case("analytics/heatmap/"),
    Case("analytics/heatmap/?user={admin_user}", MANAGEMENT, fixture="admin_user"),
    Case("analytics/me/impact/"),
    Case("analytics/export/", MANAGEMENT), Case("analytics/approvals/", MANAGEMENT),
    Case("analytics/top-ideas/?by=savings&limit=10", MANAGEMENT),
    Case("analytics/team/", APPROVERS), Case("analytics/participation/", MANAGEMENT),
    Case("admin/stats/", ADMIN),
]

ADMIN_RESOURCES = ("users", "departments", "categories", "rewards", "badges", "levels")
for resource in ADMIN_RESOURCES:
    CASES.append(Case(f"admin/{resource}/", ADMIN))
    CASES.append(Case(f"admin/{resource}/{{{resource}}}/", ADMIN, fixture=resource))
CASES += [Case("admin/redemptions/?status=PENDING", ADMIN),
          Case("admin/point-rules/", ADMIN),
          Case("admin/point-rules/{point-rules}/", ADMIN, fixture="point-rules")]

# POST z pustymi polami ma być odrzucony walidacją (400), a dla osób bez dostępu 403.
# Nie wykonujemy operacji mogących zmienić dane: użyj scenariuszy ręcznych na osobnej bazie.
WRITE_CASES = [
    Case("posts/", ALL, "POST", {}),
    Case("admin/users/", ADMIN, "POST", {}),
    Case("admin/departments/", ADMIN, "POST", {}),
    Case("admin/categories/", ADMIN, "POST", {}),
    Case("admin/rewards/", ADMIN, "POST", {}),
    Case("admin/badges/", ADMIN, "POST", {}),
    Case("admin/levels/", ADMIN, "POST", {}),
    Case("admin/users/{user}/set_password/", ADMIN, "POST", {}, "user"),
    Case("admin/users/{user}/adjust_points/", ADMIN, "POST", {}, "user"),
    Case("admin/redemptions/{redemptions}/approve/", ADMIN, "POST", {}, "redemptions"),
    Case("admin/redemptions/{redemptions}/deliver/", ADMIN, "POST", {}, "redemptions"),
    Case("admin/redemptions/{redemptions}/reject/", ADMIN, "POST", {}, "redemptions"),
]


def request(base, path, token=None, method="GET", payload=None):
    url = base.rstrip("/") + "/api/" + path
    headers = {"Accept": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
    data = None
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=15) as response:
                code, raw = response.status, response.read()
            break
        except urllib.error.HTTPError as exc:
            code, raw = exc.code, exc.read()
            break
        except (urllib.error.URLError, TimeoutError, OSError, http.client.HTTPException) as exc:
            if attempt == 2:
                raise RuntimeError(f"{method} {url}: {exc}") from exc
            time.sleep(0.5)
    try:
        body = json.loads(raw)
    except (ValueError, UnicodeDecodeError):
        body = None
    return code, body


def rows(body):
    if isinstance(body, list):
        return body
    if isinstance(body, dict):
        return body.get("results", [])
    return []


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default="http://127.0.0.1:8000")
    parser.add_argument("--validation-posts", action="store_true",
                        help="Sprawdź POST z pustym JSON; wyłącznie na testowej bazie")
    args = parser.parse_args()
    tokens = {}
    try:
        for account in ACCOUNTS:
            code, body = request(args.base_url, "access/token/", method="POST",
                                 payload={"username": account, "password": account})
            if code != 200 or not isinstance(body, dict) or not body.get("access"):
                print(f"BŁĄD logowania: {account} -> {code} (oczekiwano 200)")
                return 1
            tokens[account] = body["access"]
    except RuntimeError as exc:
        print(f"BŁĄD połączenia: {exc}")
        return 1

    fixtures = {"user": None, "post": None, "reward": None, "admin_user": None}
    code, admin_profile = request(args.base_url, "users/me/", tokens["admin"])
    if code == 200 and isinstance(admin_profile, dict):
        fixtures["admin_user"] = admin_profile.get("id")
    for key, path in (("user", "users/"), ("post", "posts/"),
                      ("reward", "gamification/rewards/")):
        code, body = request(args.base_url, path, tokens["admin"])
        found = rows(body)
        if code == 200 and found:
            fixtures[key] = found[0].get("id")
    for key in (*ADMIN_RESOURCES, "redemptions", "point-rules"):
        code, body = request(args.base_url, f"admin/{key}/", tokens["admin"])
        found = rows(body)
        fixtures[key] = found[0].get("id") if code == 200 and found else None

    totals = {"OK": 0, "BŁĄD": 0, "brak": 0, "pominięto": 0}
    cases = CASES + (WRITE_CASES if args.validation_posts else [])
    print(f"Adres: {args.base_url} | konta: {', '.join(ACCOUNTS)} | przypadki: {len(cases)}")
    for case in cases:
        if case.fixture and not fixtures.get(case.fixture):
            print(f"pominięto {case.method} /api/{case.path}: brak danych testowych ({case.fixture})")
            totals["pominięto"] += len(ACCOUNTS)
            continue
        path = case.path.format(**fixtures)
        for account in ACCOUNTS:
            try:
                code, body = request(args.base_url, path, tokens[account], case.method, case.payload)
            except RuntimeError as exc:
                print(f"BŁĄD {account} {exc}")
                totals["BŁĄD"] += 1
                continue
            expected = "200" if account in case.allowed else "403"
            if code == 404:
                outcome = "brak"
            elif account not in case.allowed and code == 403:
                outcome = "OK"
            elif account in case.allowed and code == 200:
                outcome = "OK"
                if account == "user1234" and case.path.startswith("posts/approvals_queue/"):
                    if "/count/" in case.path:
                        empty = isinstance(body, dict) and body.get("count") == 0
                    else:
                        empty = rows(body) == [] and isinstance(body, (dict, list))
                    if not empty:
                        outcome = "BŁĄD"
                        expected = "200 i pusta kolejka"
            elif account in case.allowed and case.method == "POST" and code == 400:
                outcome = "OK"  # autoryzacja przeszła, walidacja pustego JSON zadziałała
                expected = "400 (walidacja)"
            else:
                outcome = "BŁĄD"
            totals[outcome] += 1
            print(f"{outcome:9} {account:9} {case.method:4} /api/{path} -> {code} (oczekiwano {expected})")
    print("Podsumowanie: " + ", ".join(f"{key}={value}" for key, value in totals.items()))
    return 1 if totals["BŁĄD"] else 0


if __name__ == "__main__":
    sys.exit(main())
