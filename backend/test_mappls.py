#!/usr/bin/env python3
"""
Test script to debug Mappls API issues
"""
import os
import sys
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', '.env'))

CLIENT_ID = os.getenv("MAPPLS_CLIENT_ID")
CLIENT_SECRET = os.getenv("MAPPLS_CLIENT_SECRET")
API_KEY = os.getenv("MAPPLS_API_KEY")

print(f"CLIENT_ID: {CLIENT_ID[:10] if CLIENT_ID else 'NOT_SET'}...")
print(f"CLIENT_SECRET: {CLIENT_SECRET[:10] if CLIENT_SECRET else 'NOT_SET'}...")
print(f"API_KEY: {API_KEY[:10] if API_KEY else 'NOT_SET'}...")

# Test token request
TOKEN_URL = "https://outpost.mappls.com/api/security/oauth/token"
token_data = {
    "grant_type": "client_credentials",
    "client_id": CLIENT_ID,
    "client_secret": CLIENT_SECRET,
}

print("\n=== Testing Token Request ===")
token_resp = requests.post(TOKEN_URL, data=token_data, timeout=20)
print(f"Token Status: {token_resp.status_code}")
print(f"Token Response: {token_resp.text}")

if token_resp.status_code == 200:
    token = token_resp.json().get("access_token")
    print(f"Got token: {token[:20] if token else 'None'}...")
    
    # Test nearby API
    print("\n=== Testing Nearby API ===")
    BASE_V1 = "https://apis.mappls.com/advancedmaps/v1"
    
    # Test different endpoints
    endpoints = [
        f"{BASE_V1}/{API_KEY}/places/nearby/json",
        f"{BASE_V1}/{API_KEY}/places/nearby",
        f"{BASE_V1}/{API_KEY}/search",
        f"{BASE_V1}/{API_KEY}/places"
    ]
    
    headers = {"Authorization": f"Bearer {token}"}
    params = {
        "lat": "26.9124",
        "lng": "75.7873", 
        "radius": "1500",
        "type": "json"
    }
    
    for endpoint in endpoints:
        print(f"\nTrying: {endpoint}")
        try:
            resp = requests.get(endpoint, headers=headers, params=params, timeout=20)
            print(f"Status: {resp.status_code}")
            print(f"Response: {resp.text[:500]}")
            print(f"Headers: {dict(resp.headers)}")
            
            if resp.status_code == 200:
                print("SUCCESS! This endpoint works!")
                break
            elif resp.status_code != 412:
                print(f"Different error: {resp.status_code}")
            else:
                print("412 error - trying next endpoint")
                
        except Exception as e:
            print(f"Error: {e}")
else:
    print("Token request failed!")

