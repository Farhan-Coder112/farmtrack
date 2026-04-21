import requests
import json

def test_correct_user():
    """Test with the correct user that has data"""
    
    # Login with user that has data (farhan sayyed)
    login_data = {
        "email": "farhanakhtersayyed@gmail.com",
        "password": "admin123"  # Try the same password
    }
    
    try:
        login_response = requests.post("http://localhost:5000/api/auth/login", json=login_data)
        if login_response.status_code == 200:
            token = login_response.json()["token"]
            user = login_response.json()["user"]
            print(f"Login successful! User: {user['name']} (ID: {user['id']})")
            
            headers = {"Authorization": f"Bearer {token}"}
            
            # Test both weeks
            weeks_to_test = ["2026-15", "2026-16"]
            
            for week in weeks_to_test:
                print(f"\nTesting week {week}:")
                salary_response = requests.get(f"http://localhost:5000/api/workers/salary/weekly?week={week}", headers=headers)
                
                if salary_response.status_code == 200:
                    data = salary_response.json()
                    print(f"  Found {len(data)} workers")
                    for worker in data:
                        print(f"    {worker['name']}: {worker['present_days']}/{worker['days_worked']} present, salary: {worker['weekly_salary']}")
                else:
                    print(f"  Error: {salary_response.status_code}")
                    print(f"  Response: {salary_response.text}")
                    
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_correct_user()
