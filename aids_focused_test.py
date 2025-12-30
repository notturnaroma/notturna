#!/usr/bin/env python3
"""
Focused test for AIDS (Focalizzazioni) system as requested in the review.
Tests specific scenarios mentioned in the review request.
"""

import requests
import json
from datetime import datetime, timedelta

BASE_URL = "https://cursed-lore.preview.emergentagent.com/api"

def test_aids_system():
    """Test the AIDS system according to the review requirements"""
    
    print("🎯 Testing AIDS (Focalizzazioni) System - Focused Test")
    print("=" * 60)
    
    # Step 1: Register and authenticate users
    timestamp = datetime.now().strftime('%H%M%S')
    
    # Register admin user
    admin_data = {
        "username": f"admin_test_{timestamp}",
        "email": f"admin_test_{timestamp}@example.com", 
        "password": "AdminPass123!"
    }
    
    response = requests.post(f"{BASE_URL}/auth/register", json=admin_data)
    if response.status_code != 200:
        print(f"❌ Admin registration failed: {response.text}")
        return False
    
    admin_token = response.json()['access_token']
    admin_email = admin_data['email']
    
    # Register player user
    player_data = {
        "username": f"player_test_{timestamp}",
        "email": f"player_test_{timestamp}@example.com",
        "password": "PlayerPass123!"
    }
    
    response = requests.post(f"{BASE_URL}/auth/register", json=player_data)
    if response.status_code != 200:
        print(f"❌ Player registration failed: {response.text}")
        return False
    
    player_token = response.json()['access_token']
    
    # Make admin user actually admin
    import subprocess
    result = subprocess.run(
        ["python", "make_admin.py", admin_email],
        cwd="/app/backend",
        capture_output=True,
        text=True
    )
    
    if result.returncode != 0:
        print(f"❌ Failed to make user admin: {result.stderr}")
        return False
    
    print("✅ Users registered and admin promoted")
    
    # Step 2: Test 1 - Creazione Focalizzazione via POST /api/aids
    print("\n📝 Test 1: Creazione Focalizzazione con end_date")
    
    today = datetime.now()
    tomorrow = today + timedelta(days=1)
    
    aid_data = {
        "name": "Focalizzazione Intelligenza Completa",
        "attribute": "Intelligenza",
        "levels": [
            {"level": 2, "level_name": "minore", "text": "Ottieni un bonus minore di Intelligenza per questa prova"},
            {"level": 4, "level_name": "medio", "text": "Ottieni un bonus medio di Intelligenza per questa prova"},
            {"level": 5, "level_name": "maggiore", "text": "Ottieni un bonus maggiore di Intelligenza per questa prova"}
        ],
        "event_date": today.strftime("%Y-%m-%d"),
        "end_date": tomorrow.strftime("%Y-%m-%d"),
        "start_time": "09:00",
        "end_time": "18:00"
    }
    
    response = requests.post(
        f"{BASE_URL}/aids",
        json=aid_data,
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    
    if response.status_code != 200:
        print(f"❌ Failed to create aid: {response.text}")
        return False
    
    aid_response = response.json()
    aid_id = aid_response['id']
    
    # Verify response format
    required_fields = ['id', 'name', 'attribute', 'levels', 'event_date', 'end_date', 'start_time', 'end_time', 'created_at', 'created_by']
    for field in required_fields:
        if field not in aid_response:
            print(f"❌ Missing field in response: {field}")
            return False
    
    if '_id' in aid_response:
        print("❌ Response contains _id field (should not be present)")
        return False
    
    if aid_response['end_date'] != tomorrow.strftime("%Y-%m-%d"):
        print(f"❌ end_date mismatch: expected {tomorrow.strftime('%Y-%m-%d')}, got {aid_response['end_date']}")
        return False
    
    print("✅ Focalizzazione created successfully with correct response format")
    
    # Step 3: Test 2 - GET /api/aids
    print("\n📋 Test 2: GET /api/aids - Verifica campi temporali")
    
    response = requests.get(
        f"{BASE_URL}/aids",
        headers={'Authorization': f'Bearer {player_token}'}
    )
    
    if response.status_code != 200:
        print(f"❌ Failed to get aids: {response.text}")
        return False
    
    aids_list = response.json()
    
    # Find our created aid
    our_aid = None
    for aid in aids_list:
        if aid['id'] == aid_id:
            our_aid = aid
            break
    
    if not our_aid:
        print("❌ Created aid not found in aids list")
        return False
    
    # Verify all required fields are present
    time_fields = ['event_date', 'end_date', 'start_time', 'end_time']
    for field in time_fields:
        if field not in our_aid:
            print(f"❌ Missing time field: {field}")
            return False
    
    print("✅ GET /api/aids returns all required time fields")
    
    # Step 4: Test 3 - GET /api/aids/active con finestre temporali diverse
    print("\n⏰ Test 3: GET /api/aids/active - Filtro finestre temporali")
    
    # Create an inactive aid (yesterday)
    yesterday = today - timedelta(days=1)
    inactive_aid_data = {
        "name": "Focalizzazione Saggezza Inattiva",
        "attribute": "Saggezza", 
        "levels": [{"level": 2, "level_name": "minore", "text": "Test inattivo"}],
        "event_date": yesterday.strftime("%Y-%m-%d"),
        "end_date": yesterday.strftime("%Y-%m-%d"),
        "start_time": "10:00",
        "end_time": "16:00"
    }
    
    response = requests.post(
        f"{BASE_URL}/aids",
        json=inactive_aid_data,
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    
    if response.status_code != 200:
        print(f"❌ Failed to create inactive aid: {response.text}")
        return False
    
    inactive_aid_id = response.json()['id']
    
    # Create aid that crosses midnight (today 23:00 to tomorrow 01:00)
    midnight_aid_data = {
        "name": "Focalizzazione Percezione Mezzanotte",
        "attribute": "Percezione",
        "levels": [{"level": 2, "level_name": "minore", "text": "Test attraversamento mezzanotte"}],
        "event_date": today.strftime("%Y-%m-%d"),
        "end_date": tomorrow.strftime("%Y-%m-%d"),
        "start_time": "23:00",
        "end_time": "01:00"
    }
    
    response = requests.post(
        f"{BASE_URL}/aids",
        json=midnight_aid_data,
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    
    if response.status_code != 200:
        print(f"❌ Failed to create midnight aid: {response.text}")
        return False
    
    midnight_aid_id = response.json()['id']
    
    # Test active filtering
    response = requests.get(
        f"{BASE_URL}/aids/active",
        headers={'Authorization': f'Bearer {player_token}'}
    )
    
    if response.status_code != 200:
        print(f"❌ Failed to get active aids: {response.text}")
        return False
    
    active_aids = response.json()
    active_names = [aid['name'] for aid in active_aids]
    
    # Should contain the active aid (today 09:00-18:00)
    if "Focalizzazione Intelligenza Completa" not in active_names:
        print("❌ Active aid not found in active aids list")
        return False
    
    # Should NOT contain the inactive aid (yesterday)
    if "Focalizzazione Saggezza Inattiva" in active_names:
        print("❌ Inactive aid found in active aids list")
        return False
    
    print("✅ Active aids filtering working correctly")
    
    # Step 5: Test 4 - POST /api/aids/use con validazione finestra temporale
    print("\n🎮 Test 4: POST /api/aids/use - Validazione finestra temporale")
    
    # Test 4a: Try to use aid outside time window (should fail with 403)
    use_inactive_data = {
        "aid_id": inactive_aid_id,
        "level": 2,
        "player_attribute_value": 3
    }
    
    response = requests.post(
        f"{BASE_URL}/aids/use",
        json=use_inactive_data,
        headers={'Authorization': f'Bearer {player_token}'}
    )
    
    if response.status_code != 403:
        print(f"❌ Expected 403 for inactive aid use, got {response.status_code}")
        return False
    
    print("✅ Using aid outside time window correctly returns 403")
    
    # Test 4b: Use aid within time window with sufficient attribute
    use_active_data = {
        "aid_id": aid_id,
        "level": 4,
        "player_attribute_value": 5  # >= level 4
    }
    
    response = requests.post(
        f"{BASE_URL}/aids/use",
        json=use_active_data,
        headers={'Authorization': f'Bearer {player_token}'}
    )
    
    if response.status_code != 200:
        print(f"❌ Failed to use active aid: {response.status_code} - {response.text}")
        return False
    
    use_response = response.json()
    expected_fields = ['aid_name', 'attribute', 'level', 'level_name', 'text', 'message']
    for field in expected_fields:
        if field not in use_response:
            print(f"❌ Missing field in use response: {field}")
            return False
    
    print("✅ Using aid within time window with sufficient attribute works correctly")
    
    # Verify it was saved in aid_uses and chat_history by checking user actions
    response = requests.get(
        f"{BASE_URL}/auth/me",
        headers={'Authorization': f'Bearer {player_token}'}
    )
    
    if response.status_code != 200:
        print(f"❌ Failed to get user info: {response.text}")
        return False
    
    user_info = response.json()
    if user_info['used_actions'] == 0:
        print("❌ used_actions not incremented after aid use")
        return False
    
    print("✅ Aid use correctly incremented used_actions")
    
    # Test 4c: Try to use same aid/level again (should fail)
    response = requests.post(
        f"{BASE_URL}/aids/use",
        json=use_active_data,
        headers={'Authorization': f'Bearer {player_token}'}
    )
    
    if response.status_code != 403:
        print(f"❌ Expected 403 for duplicate aid use, got {response.status_code}")
        return False
    
    print("✅ Duplicate aid use correctly returns 403")
    
    # Cleanup
    print("\n🧹 Cleaning up test data...")
    for aid_id_to_delete in [aid_id, inactive_aid_id, midnight_aid_id]:
        requests.delete(
            f"{BASE_URL}/aids/{aid_id_to_delete}",
            headers={'Authorization': f'Bearer {admin_token}'}
        )
    
    print("✅ All AIDS system tests passed!")
    return True

if __name__ == "__main__":
    success = test_aids_system()
    if success:
        print("\n🎉 All tests completed successfully!")
        exit(0)
    else:
        print("\n❌ Some tests failed!")
        exit(1)