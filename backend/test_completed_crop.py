import requests
import json

def test_completed_crop():
    """Test that completed crop status works correctly"""
    
    # Login
    login_data = {"email": "farhanakhtersayyed@gmail.com", "password": "admin123"}
    
    try:
        login_response = requests.post("http://localhost:5000/api/auth/login", json=login_data)
        if login_response.status_code == 200:
            token = login_response.json()["token"]
            headers = {"Authorization": f"Bearer {token}"}
            
            print("✅ Login successful!")
            
            # Create a crop with completed status
            crop_data = {
                "name": "Test Completed Crop",
                "variety": "Test Variety",
                "field_location": "Test Field",
                "area_acres": 5.0,
                "status": "completed",
                "plant_date": "2026-03-01",
                "expected_harvest": "2026-04-15",
                "notes": "This is a test completed crop"
            }
            
            crop_response = requests.post("http://localhost:5000/api/crops/", json=crop_data, headers=headers)
            if crop_response.status_code == 201:
                crop = crop_response.json()
                print(f"✅ Crop created with status: {crop['status']}")
                
                # Get all crops to verify it appears
                crops = requests.get("http://localhost:5000/api/crops/", headers=headers)
                if crops.status_code == 200:
                    all_crops = crops.json()
                    completed_crops = [c for c in all_crops if c['status'] == 'completed']
                    print(f"✅ Found {len(completed_crops)} completed crops")
                    for c in completed_crops:
                        print(f"   - {c['name']} (Status: {c['status']})")
            else:
                print(f"❌ Crop creation failed: {crop_response.text}")
                
        else:
            print(f"❌ Login failed: {login_response.status_code}")
            print(login_response.text)
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_completed_crop()
