from typing import Dict, Any, List
import sys
import os

# Add the current directory to Python path for direct execution
if __name__ == "__main__":
    sys.path.insert(0, os.path.dirname(__file__))

try:
    from .schemas import TripPlanRequest
    from .config import cfg
    from . import mappls
    from .utils import haversine_km
except ImportError:
    # Fallback for direct execution
    from schemas import TripPlanRequest
    from config import cfg
    import mappls
    from utils import haversine_km

def _pick_query(req: TripPlanRequest) -> str:
    # Very simple keyword map; replace with a curated interest→category map
    interests = [i.lower() for i in req.interests]
    if "heritage" in interests or "history" in interests:
        return ""  # Try without keyword first
    if "markets" in interests or "shopping" in interests:
        return "bazaar market handicraft"
    if "food" in interests or "veg" in interests or req.diet == "vegetarian":
        return "vegetarian restaurant"
    return ""  # Try without keyword first

def _order_by_proximity(start_lat, start_lng, pois: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    # Fallback greedy ordering by haversine (use DM in production)
    remaining = pois[:]
    ordered = []
    cur_lat, cur_lng = start_lat, start_lng
    while remaining:
        remaining.sort(key=lambda p: haversine_km(cur_lat, cur_lng, p["lat"], p["lng"]))
        nxt = remaining.pop(0)
        ordered.append(nxt)
        cur_lat, cur_lng = nxt["lat"], nxt["lng"]
    return ordered

def _extract_pois(nearby_json) -> List[Dict[str, Any]]:
    items = []
    # Mappls returns different shapes by endpoint; common fields:
    for poi in nearby_json.get("suggestedLocations", []) + nearby_json.get("results", []):
        name = poi.get("placeName") or poi.get("name") or "POI"
        lat = poi.get("latitude") or poi.get("lat")
        lng = poi.get("longitude") or poi.get("lng")
        eloc = poi.get("eLoc") or poi.get("eloc")
        if lat is None or lng is None:
            continue
        items.append({"name": name, "lat": float(lat), "lng": float(lng), "eloc": eloc})
    return items

def plan_trip(req: TripPlanRequest) -> Dict[str, Any]:
    if req.startLat is None or req.startLng is None:
        # Keep it explicit: front-end should geo-locate hotel to lat/lng (or add a geocode step)
        raise ValueError("startLat/startLng required. Please geocode the hotel/city before planning.")

    # 1) Nearby search for candidates
    query = _pick_query(req)
    nearby_json = mappls.nearby(
        lat=req.startLat,
        lng=req.startLng,
        radius_m=cfg.DEFAULT_RADIUS_METERS,
        query=query
    )
    pois = _extract_pois(nearby_json)

    if not pois:
        return {
            "city": req.city,
            "days": [],
            "notes": ["No POIs found near the start location. Try increasing radius or changing interests."]
        }

    # Limit to 8 for MVP
    pois = pois[:8]

    # 2) Order (quick heuristic by proximity; swap to Distance Matrix for accuracy)
    ordered = _order_by_proximity(req.startLat, req.startLng, pois)

    # 3) Build simple day plan (single day MVP)
    # Compute rough travel time for each leg using route() (walk-first vs drive-first)
    mode = "walk" if req.mobility == "walk-first" else "drive"
    stops = []
    cur_lat, cur_lng = req.startLat, req.startLng
    cur_time = req.timeWindows.dayStart

    for i, poi in enumerate(ordered):
        if i == 0:
            # First stop travel from hotel/start
            leg = mappls.route({"lat": cur_lat, "lng": cur_lng}, {"lat": poi["lat"], "lng": poi["lng"]}, mode=mode)
        else:
            prev = ordered[i-1]
            leg = mappls.route({"lat": prev["lat"], "lng": prev["lng"]}, {"lat": poi["lat"], "lng": poi["lng"]}, mode=mode)

        # Pull ETA (seconds) – adjust path based on the exact response shape
        duration_sec = 0
        try:
            routes = leg.get("routes") or []
            if routes:
                duration_sec = int(routes[0].get("duration", 0))
        except Exception:
            pass

        # naive 60–90 min dwell per POI by pace
        dwell_min = 60 if req.pace == "moderate" else (45 if req.pace == "fast" else 90)
        travel_min = max(1, round(duration_sec / 60)) if duration_sec else max(5, round(haversine_km(cur_lat, cur_lng, poi["lat"], poi["lng"]) / 4 * 60))

        stops.append({
            "name": poi["name"],
            "eloc": poi.get("eloc"),
            "lat": poi["lat"],
            "lng": poi["lng"],
            "arrive": cur_time,
            "depart": None,
            "travel": {"fromPrev": {"mode": mode, "durationMin": travel_min}}
        })

        # advance naive clock (no actual time math; UI can format properly)
        # simple HH:MM adder
        h, m = map(int, cur_time.split(":"))
        m += travel_min + dwell_min
        h += m // 60
        m = m % 60
        cur_time = f"{h:02d}:{m:02d}"
        stops[-1]["depart"] = cur_time
        cur_lat, cur_lng = poi["lat"], poi["lng"]

    day = {
        "date": req.startDate,
        "summary": f"{req.city} highlights ({query})",
        "stops": stops,
        "staticMap": None,  # optional: add a Still Map generator endpoint here
        "notes": ["Prototype plan. Tune categories, radius & dwell durations for better results."]
    }

    return {
        "city": req.city,
        "days": [day]
    }
