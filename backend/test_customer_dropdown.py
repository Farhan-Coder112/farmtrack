import requests
import json

def test_customer_dropdown():
    """Test that customers are properly loaded for sales dropdown"""
    
    # Login
    login_data = {"email": "farhanakhtersayyed@gmail.com", "password": "admin123"}
    
    try:
        login_response = requests.post("http://localhost:5000/api/auth/login", json=login_data)
        if login_response.status_code == 200:
            token = login_response.json()["token"]
            headers = {"Authorization": f"Bearer {token}"}
            
            print("✅ Login successful!")
            
            # Get customers to verify they exist
            customers_response = requests.get("http://localhost:5000/api/customers/", headers=headers)
            if customers_response.status_code == 200:
                customers = customers_response.json()
                print(f"✅ Found {len(customers)} customers available for dropdown:")
                for customer in customers:
                    print(f"   - ID: {customer['id']}, Name: {customer['name']}, Business: {customer.get('business_name', 'N/A')}")
                
                # Test that we can use these customers in a sale
                if customers:
                    test_customer = customers[0]
                    sale_data = {
                        "customer_id": test_customer['id'],
                        "crop_name": "Test Crop",
                        "quantity": 50,
                        "unit": "kg",
                        "price_per_unit": 30,
                        "sale_date": "2026-04-16",
                        "payment_status": "pending",
                        "payment_method": "cash"
                    }
                    
                    sale_response = requests.post("http://localhost:5000/api/sales/", json=sale_data, headers=headers)
                    if sale_response.status_code == 201:
                        sale = sale_response.json()
                        print(f"✅ Successfully created sale with customer: {test_customer['name']}")
                        print(f"   Sale ID: {sale['id']}, Total: ₹{sale['total_price']}")
                    else:
                        print(f"❌ Sale creation failed: {sale_response.text}")
                else:
                    print("❌ No customers available for testing")
            else:
                print(f"❌ Failed to get customers: {customers_response.text}")
                
        else:
            print(f"❌ Login failed: {login_response.status_code}")
            print(login_response.text)
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_customer_dropdown()
