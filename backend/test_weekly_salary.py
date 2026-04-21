from database import get_db
from datetime import date

def test_weekly_salary():
    conn = get_db()
    
    # Test with user_id=2 (has workers and attendance)
    uid = 2
    today = date.today()
    week = f"{today.year}-{today.isocalendar()[1]:02d}"
    
    print(f"Testing weekly salary for user {uid}, week {week}")
    
    # Run the same query as the API
    rows = conn.execute(
        """SELECT w.id, w.name, w.role, w.daily_wage, w.weekly_wages,
           COUNT(a.id) as days_worked,
           SUM(CASE WHEN a.status='present' THEN 1 ELSE 0 END) as present_days,
           COALESCE(SUM(CASE WHEN a.status='present' THEN w.daily_wage ELSE 0 END), 0) as attendance_salary,
           CASE 
             WHEN w.weekly_wages IS NOT NULL AND w.weekly_wages > 0 THEN w.weekly_wages
             ELSE COALESCE(w.daily_wage * 7, 0)
           END as weekly_salary
           FROM workers w
           LEFT JOIN attendance a ON w.id=a.worker_id AND strftime('%Y-%W', a.date)=? AND a.user_id=?
           WHERE w.user_id=? AND w.status='active'
           GROUP BY w.id""",
        (week, uid, uid)
    ).fetchall()
    
    print("Results:")
    for row in rows:
        data = dict(row)
        print(f"  Worker: {data['name']}")
        print(f"    Daily wage: {data['daily_wage']}")
        print(f"    Weekly wages: {data['weekly_wages']}")
        print(f"    Days worked: {data['days_worked']}")
        print(f"    Present days: {data['present_days']}")
        print(f"    Attendance salary: {data['attendance_salary']}")
        print(f"    Final weekly salary: {data['weekly_salary']}")
        print()
    
    conn.close()

if __name__ == "__main__":
    test_weekly_salary()
