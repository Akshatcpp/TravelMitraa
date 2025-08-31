# Load .env from the project root (parent of backend directory) BEFORE any other imports
from dotenv import load_dotenv
import os
import sys

env_path = os.path.join(os.path.dirname(__file__), '..', '..', '.env')
print(f"[DEBUG] Loading .env from: {env_path}")
print(f"[DEBUG] File exists: {os.path.exists(env_path)}")
load_dotenv(env_path)

# Debug: Print environment variables
print(f"[DEBUG] MAPPLS_CLIENT_ID: {os.getenv('MAPPLS_CLIENT_ID', 'NOT_SET')[:10]}...")
print(f"[DEBUG] MAPPLS_CLIENT_SECRET: {os.getenv('MAPPLS_CLIENT_SECRET', 'NOT_SET')[:10]}...")
print(f"[DEBUG] MAPPLS_API_KEY: {os.getenv('MAPPLS_API_KEY', 'NOT_SET')[:10]}...")

# Now import Flask and other modules
from flask import Flask, request, jsonify
from flask_cors import CORS

# Add the current directory to Python path for direct execution
if __name__ == "__main__":
    sys.path.insert(0, os.path.dirname(__file__))

try:
    from .schemas import TripPlanRequest
    from .planner import plan_trip
    from . import mappls
except ImportError:
    # Fallback for direct execution
    from schemas import TripPlanRequest
    from planner import plan_trip
    import mappls

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend integration

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"ok": True, "service": "ai-trip-planner"}), 200

@app.route("/api/plan-with-ai", methods=["POST"])
def plan_with_ai():
    try:
        payload = request.get_json(force=True, silent=False)
        req = TripPlanRequest.model_validate(payload)
        plan = plan_trip(req)
        return jsonify(plan), 200
    except Exception as e:
        # In production, log the stacktrace
        return jsonify({"error": "Planning failed", "detail": str(e)}), 500

@app.route("/api/search-places", methods=["POST"])
def search_places():
    """Search for places using Mappls Place Search API"""
    try:
        data = request.get_json()
        query = data.get("query", "")
        
        if not query:
            return jsonify({"error": "Query parameter required"}), 400
        
        # Use Mappls place search
        search_results = mappls.search_places(query)
        return jsonify({"places": search_results}), 200
        
    except Exception as e:
        return jsonify({"error": "Search failed", "detail": str(e)}), 500

@app.route("/api/nearby-search", methods=["POST"])
def nearby_search():
    """Search for nearby places using Mappls Nearby Search API"""
    try:
        data = request.get_json()
        lat = data.get("lat")
        lng = data.get("lng")
        radius = data.get("radius", 2000)
        category = data.get("category")
        query = data.get("query")
        
        if not lat or not lng:
            return jsonify({"error": "Latitude and longitude required"}), 400
        
        # Use Mappls nearby search
        nearby_results = mappls.nearby(
            lat=lat,
            lng=lng,
            radius_m=radius,
            query=query,
            categories=[category] if category else None
        )
        
        # Extract places from response
        places = mappls._extract_pois(nearby_results)
        return jsonify({"places": places}), 200
        
    except Exception as e:
        return jsonify({"error": "Nearby search failed", "detail": str(e)}), 500

@app.route("/api/generate-route", methods=["POST"])
def generate_route():
    """Generate route between multiple places using Mappls Directions API"""
    try:
        data = request.get_json()
        places = data.get("places", [])
        
        if len(places) < 2:
            return jsonify({"error": "At least 2 places required"}), 400
        
        # Generate route between places
        route_data = mappls.generate_multi_point_route(places)
        return jsonify(route_data), 200
        
    except Exception as e:
        return jsonify({"error": "Route generation failed", "detail": str(e)}), 500

@app.route("/api/place-details", methods=["GET"])
def place_details():
    """Get detailed information about a specific place"""
    try:
        eloc = request.args.get("eloc")
        lat = request.args.get("lat")
        lng = request.args.get("lng")
        
        if not eloc and (not lat or not lng):
            return jsonify({"error": "Either eloc or lat/lng required"}), 400
        
        # Get place details
        details = mappls.get_place_details(eloc, lat, lng)
        return jsonify(details), 200
        
    except Exception as e:
        return jsonify({"error": "Failed to get place details", "detail": str(e)}), 500

@app.route("/api/distance-matrix", methods=["POST"])
def distance_matrix():
    """Calculate distance matrix between multiple points"""
    try:
        data = request.get_json()
        points = data.get("points", [])
        mode = data.get("mode", "drive")
        
        if len(points) < 2:
            return jsonify({"error": "At least 2 points required"}), 400
        
        # Calculate distance matrix
        matrix = mappls.distance_matrix(points, mode)
        return jsonify(matrix), 200
        
    except Exception as e:
        return jsonify({"error": "Distance matrix calculation failed", "detail": str(e)}), 500

if __name__ == "__main__":
    port = int(os.getenv("PORT", "3000"))
    app.run(host="0.0.0.0", port=port)
