import time
import requests
from typing import List, Dict, Any
import sys
import os

# Add the current directory to Python path for direct execution
if __name__ == "__main__":
    sys.path.insert(0, os.path.dirname(__file__))

try:
    from .config import cfg, token_cache
except ImportError:
    # Fallback for direct execution
    from config import cfg, token_cache

TOKEN_URL = "https://outpost.mappls.com/api/security/oauth/token"
BASE_V1 = "https://apis.mappls.com/advancedmaps/v1"

class MapplsError(Exception):
    pass

def _get_mock_nearby_data(lat: float, lng: float, query: str | None = None) -> Dict[str, Any]:
    """
    Return mock nearby data for development when Mappls API is not available.
    """
    # Mock POIs around Jaipur
    mock_pois = [
        {
            "placeName": "Amber Fort",
            "latitude": lat + 0.01,
            "longitude": lng + 0.01,
            "eLoc": "AMBERFORT",
            "category": "heritage"
        },
        {
            "placeName": "City Palace",
            "latitude": lat - 0.005,
            "longitude": lng + 0.005,
            "eLoc": "CITYPALACE",
            "category": "heritage"
        },
        {
            "placeName": "Hawa Mahal",
            "latitude": lat + 0.002,
            "longitude": lng - 0.003,
            "eLoc": "HAWAMAHAL",
            "category": "heritage"
        },
        {
            "placeName": "Jantar Mantar",
            "latitude": lat - 0.001,
            "longitude": lng + 0.002,
            "eLoc": "JANTARMAN",
            "category": "heritage"
        },
        {
            "placeName": "Nahargarh Fort",
            "latitude": lat + 0.015,
            "longitude": lng + 0.008,
            "eLoc": "NAHARGARH",
            "category": "heritage"
        }
    ]
    
    return {
        "suggestedLocations": mock_pois,
        "results": [],
        "status": "OK",
        "message": "Mock data for development"
    }

def _get_mock_route_data(start: dict, end: dict, mode: str = "walk") -> Dict[str, Any]:
    """
    Return mock route data for development when Mappls API is not available.
    """
    # Calculate rough distance and time
    import math
    lat1, lng1 = start['lat'], start['lng']
    lat2, lng2 = end['lat'], end['lng']
    
    # Simple distance calculation
    distance_km = math.sqrt((lat2 - lat1)**2 + (lng2 - lng1)**2) * 111  # Rough conversion
    duration_sec = int(distance_km * 3600 / (5 if mode == "walk" else 20))  # 5 km/h walk, 20 km/h drive
    
    return {
        "routes": [
            {
                "distance": distance_km * 1000,  # Convert to meters
                "duration": duration_sec,
                "geometry": "mock_geometry",
                "legs": [
                    {
                        "distance": distance_km * 1000,
                        "duration": duration_sec,
                        "steps": []
                    }
                ]
            }
        ],
        "status": "OK",
        "message": "Mock route data for development"
    }

def _get_token() -> str:
    now = int(time.time() * 1000)
    if token_cache.access_token and now < token_cache.expires_at_ms - 60_000:
        return token_cache.access_token

    # Debug: Print what credentials we're using
    print(f"[DEBUG] Using CLIENT_ID: {cfg.MAPPLS_CLIENT_ID[:10]}...")
    print(f"[DEBUG] Using CLIENT_SECRET: {cfg.MAPPLS_CLIENT_SECRET[:10]}...")

    form = {
        "grant_type": "client_credentials",
        "client_id": cfg.MAPPLS_CLIENT_ID,
        "client_secret": cfg.MAPPLS_CLIENT_SECRET
    }
    resp = requests.post(TOKEN_URL, data=form, timeout=20)
    print(f"[DEBUG] Token request status: {resp.status_code}")
    print(f"[DEBUG] Token response: {resp.text[:200]}...")
    
    if resp.status_code != 200:
        raise MapplsError(f"Token error: {resp.status_code} {resp.text}")
    
    data = resp.json()
    token_cache.access_token = data.get("access_token")
    print(f"[DEBUG] Got access token: {token_cache.access_token[:20] if token_cache.access_token else 'None'}...")
    
    # Mappls returns expires_in (seconds). Default to 24h if missing.
    expires_in = int(data.get("expires_in", 86400))
    token_cache.expires_at_ms = now + expires_in * 1000
    return token_cache.access_token

def _auth_headers() -> Dict[str, str]:
    return {"Authorization": f"Bearer {_get_token()}"}

def nearby(lat: float, lng: float, radius_m: int, query: str | None = None, categories: list[str] | None = None) -> Dict[str, Any]:
    """
    Try different Mappls endpoints to find one that works.
    If all fail, return mock data for development/testing.
    """
    # Validate input parameters
    if not isinstance(lat, (int, float)) or not isinstance(lng, (int, float)):
        raise ValueError(f"Invalid coordinates: lat={lat}, lng={lng}")
    
    if radius_m <= 0 or radius_m > 50000:  # Max 50km
        raise ValueError(f"Invalid radius: {radius_m}m")
    
    # Try different endpoint variations
    endpoints_to_try = [
        f"{BASE_V1}/{cfg.MAPPLS_API_KEY}/places/nearby/json",
        f"{BASE_V1}/{cfg.MAPPLS_API_KEY}/places/nearby",
        f"{BASE_V1}/{cfg.MAPPLS_API_KEY}/search",
        f"{BASE_V1}/{cfg.MAPPLS_API_KEY}/places"
    ]
    
    for endpoint in endpoints_to_try:
        print(f"[DEBUG] Trying endpoint: {endpoint}")
        
        params = {
            "lat": str(lat),
            "lng": str(lng),
            "radius": str(min(radius_m, 5000)),
        }
        
        # Try different parameter combinations
        if query and query.strip():
            params["keyword"] = query.strip()
            params["q"] = query.strip()
        
        if categories:
            params["category"] = ",".join(categories)
        
        # Add common parameters
        params["type"] = "json"
        params["region"] = "IN"
        
        print(f"[DEBUG] Endpoint: {endpoint}")
        print(f"[DEBUG] Params: {params}")
        print(f"[DEBUG] Auth headers: {_auth_headers()}")
        
        try:
            r = requests.get(endpoint, headers=_auth_headers(), params=params, timeout=20)
            print(f"[DEBUG] Status: {r.status_code}")
            print(f"[DEBUG] Response: {r.text[:500]}")
            
            if r.status_code == 200:
                print(f"[SUCCESS] Endpoint {endpoint} worked!")
                return r.json()
            elif r.status_code != 412:  # If it's not 412, we might be on the right track
                print(f"[INFO] Endpoint {endpoint} returned {r.status_code}, trying next...")
                continue
            else:
                print(f"[DEBUG] Endpoint {endpoint} returned 412, trying next...")
                continue
                
        except Exception as e:
            print(f"[ERROR] Endpoint {endpoint} failed: {e}")
            continue
    
    # If all endpoints fail, return mock data for development
    print("[WARNING] All Mappls endpoints failed. Using mock data for development.")
    return _get_mock_nearby_data(lat, lng, query)

def distance_matrix(points: List[dict], mode: str = "walk") -> Dict[str, Any]:
    """
    Minimal Distance Matrix. Some Mappls variants accept 'centers' or src/dst arrays.
    Here we use a compact 'centers' list; adjust to your plan.
    """
    coord_str = "|".join([f"{p['lat']},{p['lng']}" for p in points])
    # rtype: pedestrian/biking/distance (driving). Verify on your subscription.
    rtype = "pedestrian" if mode == "walk" else ("biking" if mode == "two-wheeler" else "distance")
    params = {"rtype": rtype, "centers": coord_str}

    url = f"{BASE_V1}/{cfg.MAPPLS_API_KEY}/distance_matrix/json"
    r = requests.get(url, headers=_auth_headers(), params=params, timeout=25)
    if r.status_code != 200:
        raise MapplsError(f"DM error: {r.status_code} {r.text}")
    return r.json()

def search_places(query: str) -> List[Dict[str, Any]]:
    """
    Search for places using Mappls Place Search API
    """
    try:
        url = f"{BASE_V1}/{cfg.MAPPLS_API_KEY}/places/search/json"
        params = {
            "query": query,
            "region": "IN",
            "type": "json"
        }
        
        r = requests.get(url, headers=_auth_headers(), params=params, timeout=20)
        if r.status_code == 200:
            data = r.json()
            return _extract_pois(data)
        else:
            print(f"[WARNING] Place search failed with {r.status_code}. Using mock data.")
            return _get_mock_search_data(query)
    except Exception as e:
        print(f"[WARNING] Place search error: {e}. Using mock data.")
        return _get_mock_search_data(query)

def generate_multi_point_route(places: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Generate route between multiple places
    """
    if len(places) < 2:
        raise ValueError("At least 2 places required")
    
    try:
        # Create waypoints string
        waypoints = ";".join([f"{place['longitude']},{place['latitude']}" for place in places])
        
        url = f"{BASE_V1}/{cfg.MAPPLS_API_KEY}/route_adv/driving/json"
        params = {
            "geometries": "polyline",
            "overview": "full",
            "alternatives": "false",
            "steps": "true",
            "waypoints": waypoints
        }
        
        r = requests.get(url, headers=_auth_headers(), params=params, timeout=30)
        if r.status_code == 200:
            return r.json()
        else:
            print(f"[WARNING] Multi-point route failed with {r.status_code}. Using mock data.")
            return _get_mock_multi_route_data(places)
    except Exception as e:
        print(f"[WARNING] Multi-point route error: {e}. Using mock data.")
        return _get_mock_multi_route_data(places)

def get_place_details(eloc: str = None, lat: float = None, lng: float = None) -> Dict[str, Any]:
    """
    Get detailed information about a specific place
    """
    try:
        if eloc:
            url = f"{BASE_V1}/{cfg.MAPPLS_API_KEY}/places/details/{eloc}/json"
        else:
            url = f"{BASE_V1}/{cfg.MAPPLS_API_KEY}/places/details/json"
            params = {"lat": lat, "lng": lng}
        
        r = requests.get(url, headers=_auth_headers(), params=params if not eloc else {}, timeout=20)
        if r.status_code == 200:
            return r.json()
        else:
            print(f"[WARNING] Place details failed with {r.status_code}. Using mock data.")
            return _get_mock_place_details(eloc, lat, lng)
    except Exception as e:
        print(f"[WARNING] Place details error: {e}. Using mock data.")
        return _get_mock_place_details(eloc, lat, lng)

def _get_mock_search_data(query: str) -> List[Dict[str, Any]]:
    """Mock search results for development"""
    mock_results = [
        {
            "placeName": f"Search Result 1 for {query}",
            "latitude": 28.6139,
            "longitude": 77.2090,
            "eLoc": "MOCK1",
            "category": "general"
        },
        {
            "placeName": f"Search Result 2 for {query}",
            "latitude": 28.6139,
            "longitude": 77.2090,
            "eLoc": "MOCK2",
            "category": "general"
        }
    ]
    return mock_results

def _get_mock_multi_route_data(places: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Mock multi-point route data for development"""
    total_distance = 0
    total_duration = 0
    
    for i in range(len(places) - 1):
        # Calculate rough distance between consecutive places
        import math
        lat1, lng1 = places[i]['latitude'], places[i]['longitude']
        lat2, lng2 = places[i+1]['latitude'], places[i+1]['longitude']
        distance = math.sqrt((lat2 - lat1)**2 + (lng2 - lng1)**2) * 111 * 1000  # meters
        duration = int(distance / 1000 * 60)  # 1 minute per km
        
        total_distance += distance
        total_duration += duration
    
    return {
        "routes": [
            {
                "distance": total_distance,
                "duration": total_duration,
                "geometry": "mock_geometry",
                "legs": [
                    {
                        "distance": total_distance,
                        "duration": total_duration,
                        "steps": []
                    }
                ]
            }
        ],
        "status": "OK",
        "message": "Mock multi-point route data"
    }

def _get_mock_place_details(eloc: str = None, lat: float = None, lng: float = None) -> Dict[str, Any]:
    """Mock place details for development"""
    return {
        "placeName": f"Mock Place {eloc or f'{lat},{lng}'}",
        "address": "Mock Address, Mock City, Mock State",
        "phone": "+91-1234567890",
        "rating": 4.5,
        "openingHours": "9:00 AM - 10:00 PM",
        "category": "general",
        "latitude": lat or 28.6139,
        "longitude": lng or 77.2090,
        "eLoc": eloc or "MOCKPLACE"
    }

def route(start: dict, end: dict, mode: str = "walk") -> Dict[str, Any]:
    """
    Advanced route API variant with 'route_adv/{profile}/json'.
    """
    profile = "pedestrian" if mode == "walk" else ("biking" if mode == "two-wheeler" else "driving")
    points = f"{start['lng']},{start['lat']};{end['lng']},{end['lat']}"
    url = f"{BASE_V1}/{cfg.MAPPLS_API_KEY}/route_adv/{profile}/json"
    params = {
        "geometries": "polyline",
        "overview": "full",
        "alternatives": "false",
        "steps": "true",
        "points": points
    }
    
    try:
        r = requests.get(url, headers=_auth_headers(), params=params, timeout=25)
        if r.status_code == 200:
            return r.json()
        else:
            print(f"[WARNING] Route API failed with {r.status_code}. Using mock data.")
            return _get_mock_route_data(start, end, mode)
    except Exception as e:
        print(f"[WARNING] Route API error: {e}. Using mock data.")
        return _get_mock_route_data(start, end, mode)
