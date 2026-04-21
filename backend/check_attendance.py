from database import get_db

def check_attendance():
    conn = get_db()
    
    # Check attendance table schema
    attendance_schema = conn.execute("PRAGMA table_info(attendance)").fetchall()
    print("Attendance table schema:")
    for row in attendance_schema:
        print(f"  {dict(row)}")
    
    # Check sample attendance data
    sample_attendance = conn.execute("SELECT * FROM attendance LIMIT 5").fetchall()
    print("\nSample attendance:")
    for att in sample_attendance:
        print(f"  {dict(att)}")
    
    conn.close()

if __name__ == "__main__":
    check_attendance()
