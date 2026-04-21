import requests
import json

# Test delete sale endpoint
BASE_URL = "http://localhost:5000"

# Login
login_data = {"email": "farhanakhtersayyed@gmail.com", "password": "admin123"}
login_response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
print("Login status:", login_response.status_code)

if login_response.status_code == 200:
    token = login_response.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Get sales
    sales_response = requests.get(f"{BASE_URL}/sales/", headers=headers)
    print("Get sales status:", sales_response.status_code)
    
    if sales_response.status_code == 200:
        sales = sales_response.json()
        print(f"Total sales: {len(sales)}")
        
        if sales:
            # Try to delete the first sale
            sale_id = sales[0]["id"]
            print(f"Attempting to delete sale ID: {sale_id}")
            
            delete_response = requests.delete(f"{BASE_URL}/sales/{sale_id}", headers=headers)
            print("Delete status:", delete_response.status_code)
            print("Delete response:", delete_response.text)
        else:
            print("No sales to delete")
else:
    print("Login failed")
