from database import get_db

def check_schema():
    conn = get_db()
    
    # Check users table
    users = conn.execute("PRAGMA table_info(users)").fetchall()
    print("Users table schema:")
    for row in users:
        print(f"  {dict(row)}")
    
    # Check workers table
    workers = conn.execute("PRAGMA table_info(workers)").fetchall()
    print("\nWorkers table schema:")
    for row in workers:
        print(f"  {dict(row)}")
    
    # Check a sample worker
    sample_workers = conn.execute("SELECT * FROM workers LIMIT 3").fetchall()
    print("\nSample workers:")
    for worker in sample_workers:
        print(f"  {dict(worker)}")
    
    conn.close()

if __name__ == "__main__":
    check_schema()
