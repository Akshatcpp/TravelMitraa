# test_plan_api.py
import os, json, sys, requests

BASE_URL = os.getenv("BASE_URL", "http://localhost:3000")

def check_health():
    url = f"{BASE_URL}/api/health"
    r = requests.get(url, timeout=10)
    ok = (r.status_code == 200 and r.json().get("ok") is True)
    print(f"[health] {r.status_code} -> {'PASS' if ok else 'FAIL'}")
    if not ok:
        print("Body:", r.text)
    return ok

def check_plan():
    url = f"{BASE_URL}/api/plan-with-ai"
    payload = {
        "city": "Jaipur",
        "startDate": "2025-10-10",
        "endDate": "2025-10-10",
        "interests": ["heritage"],
        "pace": "moderate",
        "mobility": "walk-first",
        # Use a real start location (hotel/city center). Jaipur MI Road:
        "startLat": 26.9124,
        "startLng": 75.7873,
        "timeWindows": {"dayStart": "09:30", "dayEnd": "20:30"},
        "group": {"adults": 2, "kids": 0, "seniors": 0},
        "budget": "mid"
    }
    r = requests.post(url, json=payload, timeout=60)
    ok = r.status_code == 200
    print(f"[plan-with-ai] HTTP {r.status_code}")

    # Soft schema checks so you get a clear reason if it fails
    try:
        data = r.json()
    except Exception:
        print("[plan-with-ai] FAIL: response is not JSON")
        print(r.text[:500])
        return False

    if not ok:
        print("[plan-with-ai] FAIL: non-200 response")
        print(json.dumps(data, indent=2))
        return False

    # Minimal structure checks
    if "city" not in data or "days" not in data or not isinstance(data["days"], list):
        print("[plan-with-ai] FAIL: missing city/days")
        print(json.dumps(data, indent=2))
        return False

    if len(data["days"]) == 0:
        print("[plan-with-ai] WARN: days is empty (no POIs found?)")
        print(json.dumps(data, indent=2))
        return True  # Treat as pass, but warn

    day0 = data["days"][0]
    if "stops" not in day0 or not isinstance(day0["stops"], list):
        print("[plan-with-ai] FAIL: day[0].stops missing or not a list")
        print(json.dumps(day0, indent=2))
        return False

    if len(day0["stops"]) == 0:
        print("[plan-with-ai] WARN: stops empty")
        print(json.dumps(day0, indent=2))
        return True

    stop0 = day0["stops"][0]
    required_stop_keys = {"name", "lat", "lng"}
    missing = required_stop_keys - set(stop0.keys())
    if missing:
        print(f"[plan-with-ai] FAIL: first stop missing keys: {missing}")
        print(json.dumps(stop0, indent=2))
        return False

    print("[plan-with-ai] PASS")
    return True

if __name__ == "__main__":
    overall = True
    try:
        overall &= check_health()
        overall &= check_plan()
    except requests.RequestException as e:
        print("[ERROR] Request failed:", e)
        overall = False
    except Exception as e:
        print("[ERROR] Unexpected:", e)
        overall = False

    if not overall:
        # Common hints when it fails
        print("\nTroubleshooting tips:")
        print("- Ensure server is running: python app.py")
        print("- Verify .env has MAPPLS_CLIENT_ID / MAPPLS_CLIENT_SECRET / MAPPLS_API_KEY (no quotes).")
        print("- If you see 401 invalid_client, test token directly:\n"
              "  curl -X POST https://outpost.mappls.com/api/security/oauth/token "
              "-H 'Content-Type: application/x-www-form-urlencoded' "
              "-d 'grant_type=client_credentials&client_id=YOUR_ID&client_secret=YOUR_SECRET'")
        print("- For UI testing without real creds, set MAPPLS_MOCK=1 and stub mappls.nearby/route.")
        sys.exit(1)

    sys.exit(0)
