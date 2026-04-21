from database import get_db
from werkzeug.security import generate_password_hash

def debug_weekly_salary():
    conn = get_db()
    
    # Get a sample worker to check data
    worker = conn.execute("SELECT * FROM workers WHERE email = ?", ("admin@farmtrack.com",)).fetchone()
    
    if worker:
        print(f"Worker data: {dict(worker)}")
        print(f"Daily wage: {worker['daily_wage']}")
        print(f"Weekly wages: {worker['weekly_wages']}")
        
        # Test calculation
        weekly_calc = worker['daily_wage'] * 7 if worker['daily_wage'] else 0
        print(f"Calculated weekly: {weekly_calc}")
        
        # Check attendance for current week
        from datetime import date
        today = date.today()
        week = str(today.isocalendar()[:2]) + str(today.isocalendar()[1])
        print(f"Current week: {week}")
        
        attendance = conn.execute("""
            SELECT COUNT(*) as count, 
                   SUM(CASE WHEN status='present' THEN 1 ELSE 0 END) as present_days
            FROM attendance 
            WHERE worker_id=? AND strftime('%Y-%W', date)=?
        """, (worker['id'], week)).fetchone()
        
        print(f"Attendance data: {dict(attendance)}")
    
    conn.close()

if __name__ == "__main__":
    debug_weekly_salary()
