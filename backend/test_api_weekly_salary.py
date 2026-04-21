import requests
import json

def test_api_weekly_salary():
    """Test the weekly salary API endpoint"""
    
    # First login to get token
    login_data = {
        "email": "admin@farmtrack.com",
        "password": "admin123"
    }
    
    try:
        # Login
        login_response = requests.post("http://localhost:5000/api/auth/login", json=login_data)
        if login_response.status_code == 200:
            token = login_response.json()["token"]
            print("Login successful!")
            
            # Test weekly salary API
            headers = {"Authorization": f"Bearer {token}"}
            salary_response = requests.get("http://localhost:5000/api/workers/salary/weekly", headers=headers)
            
            if salary_response.status_code == 200:
                data = salary_response.json()
                print("Weekly salary API response:")
                for worker in data:
                    print(f"  {worker['name']}:")
                    print(f"    Days worked: {worker['days_worked']}")
                    print(f"    Present days: {worker['present_days']}")
                    print(f"    Weekly salary: {worker['weekly_salary']}")
                    print()
            else:
                print(f"API Error: {salary_response.status_code}")
                print(salary_response.text)
        else:
            print(f"Login failed: {login_response.status_code}")
            print(login_response.text)
            
    except requests.exceptions.ConnectionError:
        print("Cannot connect to server. Make sure it's running on localhost:5000")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_api_weekly_salary()
