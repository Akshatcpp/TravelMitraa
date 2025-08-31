from math import radians, sin, cos, asin, sqrt

def haversine_km(a_lat, a_lng, b_lat, b_lng) -> float:
    # Quick fallback for ordering if Distance Matrix isn’t used
    R = 6371
    dlat = radians(b_lat - a_lat)
    dlng = radians(b_lng - a_lng)
    lat1 = radians(a_lat)
    lat2 = radians(b_lat)
    h = sin(dlat/2)**2 + cos(lat1)*cos(lat2)*sin(dlng/2)**2
    return 2 * R * asin(sqrt(h))
