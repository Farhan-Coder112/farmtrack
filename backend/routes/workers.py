from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import get_db
from datetime import date

workers_bp = Blueprint("workers", __name__)

@workers_bp.route("/", methods=["GET"])
@jwt_required()
def get_workers():
    uid = int(get_jwt_identity())
    status = request.args.get("status", "active")
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM workers WHERE user_id=? AND status=? ORDER BY name",
        (uid, status)
    ).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@workers_bp.route("/", methods=["POST"])
@jwt_required()
def add_worker():
    uid = int(get_jwt_identity())
    data = request.get_json()
    if not data.get("name"):
        return jsonify({"error": "Worker name is required"}), 400
    conn = get_db()
    daily_wage = data.get("daily_wage", 0)
    weekly_wages = daily_wage * 6  # 6-day work week
    cur = conn.execute(
        "INSERT INTO workers (user_id,name,phone,role,daily_wage,weekly_wages,join_date,address,status) VALUES (?,?,?,?,?,?,?,?,?)",
        (uid, data["name"], data.get("phone"), data.get("role"),
         daily_wage, weekly_wages, data.get("join_date"), data.get("address"), "active")
    )
    conn.commit()
    w = conn.execute("SELECT * FROM workers WHERE id=?", (cur.lastrowid,)).fetchone()
    conn.close()
    return jsonify(dict(w)), 201

@workers_bp.route("/<int:wid>", methods=["GET"])
@jwt_required()
def get_worker(wid):
    uid = int(get_jwt_identity())
    conn = get_db()
    w = conn.execute("SELECT * FROM workers WHERE id=? AND user_id=?", (wid, uid)).fetchone()
    conn.close()
    if not w:
        return jsonify({"error": "Worker not found"}), 404
    return jsonify(dict(w))

@workers_bp.route("/<int:wid>", methods=["PUT"])
@jwt_required()
def update_worker(wid):
    uid = int(get_jwt_identity())
    data = request.get_json()
    conn = get_db()
    daily_wage = data.get("daily_wage", 0)
    weekly_wages = daily_wage * 6  # 6-day work week
    conn.execute(
        "UPDATE workers SET name=?,phone=?,role=?,daily_wage=?,weekly_wages=?,join_date=?,address=?,status=? WHERE id=? AND user_id=?",
        (data.get("name"), data.get("phone"), data.get("role"),
         daily_wage, weekly_wages, data.get("join_date"), data.get("address"),
         data.get("status"), wid, uid)
    )
    conn.commit()
    w = conn.execute("SELECT * FROM workers WHERE id=?", (wid,)).fetchone()
    conn.close()
    return jsonify(dict(w))

@workers_bp.route("/<int:wid>", methods=["DELETE"])
@jwt_required()
def delete_worker(wid):
    uid = int(get_jwt_identity())
    conn = get_db()
    conn.execute("DELETE FROM workers WHERE id=? AND user_id=?", (wid, uid))
    conn.commit()
    conn.close()
    return jsonify({"message": "Worker removed"})

# Attendance routes
@workers_bp.route("/<int:wid>/attendance", methods=["GET"])
@jwt_required()
def get_attendance(wid):
    uid = int(get_jwt_identity())
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM attendance WHERE worker_id=? AND user_id=? ORDER BY date DESC LIMIT 30",
        (wid, uid)
    ).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@workers_bp.route("/<int:wid>/attendance", methods=["POST"])
@jwt_required()
def mark_attendance(wid):
    uid = int(get_jwt_identity())
    data = request.get_json()
    att_date = data.get("date", str(date.today()))
    conn = get_db()
    existing = conn.execute(
        "SELECT id FROM attendance WHERE worker_id=? AND date=?", (wid, att_date)
    ).fetchone()
    if existing:
        conn.execute(
            "UPDATE attendance SET status=?,hours_worked=?,notes=? WHERE worker_id=? AND date=?",
            (data.get("status","present"), data.get("hours_worked",8), data.get("notes"), wid, att_date)
        )
    else:
        conn.execute(
            "INSERT INTO attendance (worker_id,user_id,date,status,hours_worked,notes) VALUES (?,?,?,?,?,?)",
            (wid, uid, att_date, data.get("status","present"), data.get("hours_worked",8), data.get("notes"))
        )
    conn.commit()
    conn.close()
    return jsonify({"message": "Attendance recorded"})

@workers_bp.route("/attendance/today", methods=["GET"])
@jwt_required()
def today_attendance():
    uid = int(get_jwt_identity())
    today = str(date.today())
    conn = get_db()
    rows = conn.execute(
        """SELECT w.name, w.role, a.status, a.hours_worked 
           FROM attendance a JOIN workers w ON a.worker_id=w.id
           WHERE a.user_id=? AND a.date=?""",
        (uid, today)
    ).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@workers_bp.route("/salary/monthly", methods=["GET"])
@jwt_required()
def monthly_salary():
    uid = int(get_jwt_identity())
    month = request.args.get("month", str(date.today())[:7])  # YYYY-MM
    conn = get_db()
    rows = conn.execute(
        """SELECT w.id, w.name, w.role, w.daily_wage,
           COUNT(a.id) as days_worked,
           SUM(CASE WHEN a.status='present' THEN 1 ELSE 0 END) as present_days,
           SUM(CASE WHEN a.status='present' THEN w.daily_wage ELSE 0 END) as total_salary
           FROM workers w
           LEFT JOIN attendance a ON w.id=a.worker_id AND substr(a.date,1,7)=?
           WHERE w.user_id=? AND w.status='active'
           GROUP BY w.id""",
        (month, uid)
    ).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@workers_bp.route("/salary/weekly", methods=["GET"])
@jwt_required()
def weekly_salary():
    uid = int(get_jwt_identity())
    week = request.args.get("week", f"{date.today().year}-{date.today().isocalendar()[1]:02d}")  # YYYY-WW
    
    # If no attendance found for current week, try previous week
    conn = get_db()
    test_week = conn.execute(
        "SELECT COUNT(*) as count FROM attendance WHERE user_id=? AND strftime('%Y-%W', date)=?",
        (uid, week)
    ).fetchone()
    
    if test_week['count'] == 0:
        # Try previous week
        prev_week = f"{date.today().year}-{date.today().isocalendar()[1]-1:02d}"
        test_prev = conn.execute(
            "SELECT COUNT(*) as count FROM attendance WHERE user_id=? AND strftime('%Y-%W', date)=?",
            (uid, prev_week)
        ).fetchone()
        if test_prev['count'] > 0:
            week = prev_week
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
           LEFT JOIN attendance a ON w.id=a.worker_id AND strftime('%Y-%W', a.date)=?
           WHERE w.user_id=? AND w.status='active'
           GROUP BY w.id""",
        (week, uid)
    ).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])
