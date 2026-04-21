from database import get_db
from datetime import date

def debug_attendance_week():
    conn = get_db()
    
    # Get current week
    today = date.today()
    week = f"{today.year}-{today.isocalendar()[1]:02d}"
    print(f"Current week: {week}")
    
    # Check attendance dates and their week formats
    attendance = conn.execute("""
        SELECT worker_id, date, status, strftime('%Y-%W', date) as week_format
        FROM attendance 
        WHERE user_id=2
        ORDER BY date DESC
        LIMIT 10
    """).fetchall()
    
    print("Recent attendance:")
    for att in attendance:
        data = dict(att)
        print(f"  Worker {data['worker_id']}: {data['date']} -> Week {data['week_format']} ({data['status']})")
    
    # Test the weekly salary query with debugging
    uid = 2
    print(f"\nTesting weekly salary query for user {uid}:")
    
    rows = conn.execute(
        """SELECT w.id, w.name, w.role, w.daily_wage, w.weekly_wages,
           COUNT(a.id) as days_worked,
           SUM(CASE WHEN a.status='present' THEN 1 ELSE 0 END) as present_days,
           strftime('%Y-%W', a.date) as att_week
           FROM workers w
           LEFT JOIN attendance a ON w.id=a.worker_id AND a.user_id=?
           WHERE w.user_id=? AND w.status='active'
           GROUP BY w.id, a.date
           ORDER BY w.id, a.date""",
        (uid, uid)
    ).fetchall()
    
    print("Worker-Attendance breakdown:")
    for row in rows:
        data = dict(row)
        if data['att_week']:
            print(f"  Worker {data['id']} ({data['name']}): {data['att_week']} - {data.get('status', 'N/A')}")
    
    conn.close()

if __name__ == "__main__":
    debug_attendance_week()
