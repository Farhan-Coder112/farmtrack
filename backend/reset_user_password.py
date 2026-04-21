from database import get_db
from werkzeug.security import generate_password_hash

def reset_user_password():
    conn = get_db()
    
    # Reset password for user_id=2 (farhan sayyed)
    hashed_password = generate_password_hash("admin123")
    conn.execute("UPDATE users SET password=? WHERE id=?", (hashed_password, 2))
    conn.commit()
    
    # Get user info
    user = conn.execute("SELECT name, email FROM users WHERE id=2").fetchone()
    print(f"Password reset for: {dict(user)}")
    print("New password: admin123")
    
    conn.close()

if __name__ == "__main__":
    reset_user_password()
