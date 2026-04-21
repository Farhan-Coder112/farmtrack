from database import get_db

def debug_user_auth():
    conn = get_db()
    
    # Check users
    users = conn.execute("SELECT * FROM users").fetchall()
    print("Users in database:")
    for user in users:
        print(f"  {dict(user)}")
    
    # Check workers for each user
    for user in users:
        workers = conn.execute("SELECT * FROM workers WHERE user_id=?", (user['id'],)).fetchall()
        print(f"\nWorkers for user {user['id']} ({user['name']}):")
        for worker in workers:
            print(f"  {dict(worker)}")
    
    # Check attendance for user 2
    attendance = conn.execute("SELECT * FROM attendance WHERE user_id=2").fetchall()
    print(f"\nAttendance for user 2:")
    for att in attendance:
        print(f"  {dict(att)}")
    
    conn.close()

if __name__ == "__main__":
    debug_user_auth()
