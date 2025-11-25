import requests

url = "http://localhost:8001/api/nlp/query"
headers = {
    "Content-Type": "application/json",
    "Authorization": "Bearer temp-admin-token"
}
data = {
    "query": "cuantas personas hay"
}

print("\n🧪 Probando endpoint NLP...")
print(f"URL: {url}")
print(f"Query: {data['query']}\n")

try:
    response = requests.post(url, headers=headers, json=data, timeout=60)
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"✅ SUCCESS!")
        print(f"\nRespuesta:")
        if 'data' in result and 'markdown' in result['data']:
            print(result['data']['markdown'][:500])
    else:
        print(f"❌ ERROR: {response.text[:300]}")
except Exception as e:
    print(f"❌ Exception: {str(e)}")
