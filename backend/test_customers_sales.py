import requests
import json

def test_customers_sales():
    """Test the new customers and sales API endpoints"""
    
    # Login
    login_data = {"email": "farhanakhtersayyed@gmail.com", "password": "admin123"}
    
    try:
        login_response = requests.post("http://localhost:5000/api/auth/login", json=login_data)
        if login_response.status_code == 200:
            token = login_response.json()["token"]
            headers = {"Authorization": f"Bearer {token}"}
            
            print("Login successful!")
            
            # Test Customers API
            print("\n--- Testing Customers API ---")
            
            # Add a customer
            customer_data = {
                "name": "Test Buyer",
                "phone": "9876543210",
                "email": "buyer@test.com",
                "business_name": "Test Agro Trading",
                "address": "123 Market Road",
                "notes": "Regular customer"
            }
            
            customer_response = requests.post("http://localhost:5000/api/customers/", json=customer_data, headers=headers)
            if customer_response.status_code == 201:
                print("✅ Customer created successfully")
                customer = customer_response.json()
                print(f"   Customer ID: {customer['id']}")
                
                # Get customers
                get_customers = requests.get("http://localhost:5000/api/customers/", headers=headers)
                if get_customers.status_code == 200:
                    customers = get_customers.json()
                    print(f"✅ Found {len(customers)} customers")
            else:
                print(f"❌ Customer creation failed: {customer_response.text}")
            
            # Test Sales API
            print("\n--- Testing Sales API ---")
            
            # Add a sale (using the customer we just created)
            sale_data = {
                "customer_id": 1,  # Assuming customer ID 1 exists
                "crop_name": "Wheat",
                "quantity": 100,
                "unit": "kg",
                "price_per_unit": 25,
                "sale_date": "2026-04-16",
                "payment_status": "paid",
                "payment_method": "cash",
                "notes": "Test sale"
            }
            
            sale_response = requests.post("http://localhost:5000/api/sales/", json=sale_data, headers=headers)
            if sale_response.status_code == 201:
                print("✅ Sale created successfully")
                sale = sale_response.json()
                print(f"   Sale ID: {sale['id']}")
                print(f"   Total: ₹{sale['total_price']}")
                
                # Get sales summary
                summary = requests.get("http://localhost:5000/api/sales/summary", headers=headers)
                if summary.status_code == 200:
                    summary_data = summary.json()
                    print(f"✅ Sales summary: Total Revenue ₹{summary_data['total_revenue']}")
                    
                # Get all sales
                get_sales = requests.get("http://localhost:5000/api/sales/", headers=headers)
                if get_sales.status_code == 200:
                    sales = get_sales.json()
                    print(f"✅ Found {len(sales)} sales")
            else:
                print(f"❌ Sale creation failed: {sale_response.text}")
                
        else:
            print(f"Login failed: {login_response.status_code}")
            print(login_response.text)
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_customers_sales()
