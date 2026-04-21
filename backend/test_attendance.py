from database import get_db
from datetime import date, timedelta

def test_attendance():
    conn = get_db()
    
    # Get current week
    today = date.today()
    week = str(today.isocalendar()[:2]) + str(today.isocalendar()[1])
    print(f"Current week: {week}")
    
    # Check attendance for worker 1 (Test Farm Worker)
    attendance = conn.execute("""
        SELECT date, status FROM attendance 
        WHERE worker_id=? AND strftime('%Y-%W', date)=?
        ORDER BY date
    """, (1, week)).fetchall()
    
    print(f"Attendance for worker 1:")
    for att in attendance:
        print(f"  {dict(att)}")
    
    # Add some test attendance for this week if none exists
    if not attendance:
        print("No attendance found, adding test data...")
        for i in range(5):  # Add 5 days of attendance
            att_date = today - timedelta(days=today.weekday() - i)
            if att_date.weekday() < 5:  # Only weekdays
                conn.execute("""
                    INSERT INTO attendance (worker_id, date, status) 
                    VALUES (?, ?, ?)
                """, (1, att_date.strftime('%Y-%m-%d'), 'present'))
        
        conn.commit()
        print("Added test attendance data")
    
    conn.close()

if __name__ == "__main__":
    test_attendance()
