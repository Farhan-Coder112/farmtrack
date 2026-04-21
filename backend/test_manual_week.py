import requests
import json

def test_manual_week():
    """Test weekly salary with specific week"""
    
    # Login
    login_data = {"email": "admin@farmtrack.com", "password": "admin123"}
    
    try:
        login_response = requests.post("http://localhost:5000/api/auth/login", json=login_data)
        if login_response.status_code == 200:
            token = login_response.json()["token"]
            headers = {"Authorization": f"Bearer {token}"}
            
            # Test with week 2026-15 (the week with attendance data)
            weeks_to_test = ["2026-15", "2026-16"]
            
            for week in weeks_to_test:
                print(f"\nTesting week {week}:")
                salary_response = requests.get(f"http://localhost:5000/api/workers/salary/weekly?week={week}", headers=headers)
                
                if salary_response.status_code == 200:
                    data = salary_response.json()
                    print(f"  Found {len(data)} workers")
                    for worker in data:
                        print(f"    {worker['name']}: {worker['present_days']} present, salary: {worker['weekly_salary']}")
                else:
                    print(f"  Error: {salary_response.status_code}")
                    print(f"  Response: {salary_response.text}")
                    
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_manual_week()
