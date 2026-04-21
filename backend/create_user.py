from database import get_db
from werkzeug.security import generate_password_hash

def create_test_user():
    conn = get_db()
    
    # Check if user exists
    existing = conn.execute("SELECT * FROM users WHERE email = ?", ("admin@farmtrack.com",)).fetchone()
    
    if not existing:
        # Create test user with correct password hashing
        hashed_password = generate_password_hash("admin123")
        conn.execute("""
            INSERT INTO users (name, email, phone, farm_name, password, created_at) 
            VALUES (?, ?, ?, ?, ?, ?)
        """, ("Admin User", "admin@farmtrack.com", "1234567890", "Test Farm", hashed_password, "2024-01-01"))
        conn.commit()
        print("✅ Test user created: admin@farmtrack.com / admin123")
    else:
        print("ℹ️  Test user already exists")
    
    conn.close()

if __name__ == "__main__":
    create_test_user()
