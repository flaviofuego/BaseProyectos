#!/usr/bin/env python3
"""
Test script para verificar el funcionamiento del API de logs
"""

import requests
import json

def test_logs_api():
    print("🔍 Testing logs API...")
    
    # Test 1: Health check
    print("\n1. Testing health endpoint...")
    try:
        response = requests.get("http://localhost:8001/api/logs/health")
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            print(f"   Response: {response.json()}")
        else:
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"   Exception: {e}")
    
    # Test 2: Search logs with authentication
    print("\n2. Testing search endpoint with authentication...")
    try:
        headers = {"Authorization": "Bearer temp-admin-token"}
        response = requests.get("http://localhost:8001/api/logs/search?limit=5", headers=headers)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Found {len(data.get('logs', []))} logs")
            print(f"   Pagination: {data.get('pagination', {})}")
            if data.get('logs'):
                first_log = data['logs'][0]
                print(f"   First log: ID={first_log.get('id')}, Type={first_log.get('transaction_type')}, Status={first_log.get('status')}")
        else:
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"   Exception: {e}")
    
    # Test 3: Search with filters
    print("\n3. Testing search with filters...")
    try:
        headers = {"Authorization": "Bearer temp-admin-token"}
        params = {
            "transaction_type": "LOGIN",
            "status": "SUCCESS",
            "limit": 3
        }
        response = requests.get("http://localhost:8001/api/logs/search", headers=headers, params=params)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Found {len(data.get('logs', []))} login logs")
            print(f"   Total matching: {data.get('pagination', {}).get('total', 0)}")
        else:
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"   Exception: {e}")
    
    # Test 4: Stats endpoint
    print("\n4. Testing stats endpoint...")
    try:
        headers = {"Authorization": "Bearer temp-admin-token"}
        response = requests.get("http://localhost:8001/api/logs/stats", headers=headers)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Stats keys: {list(data.keys())}")
            print(f"   Total transactions: {data.get('total_transactions', 0)}")
            print(f"   By status: {data.get('by_status', {})}")
        else:
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"   Exception: {e}")

if __name__ == "__main__":
    test_logs_api()
