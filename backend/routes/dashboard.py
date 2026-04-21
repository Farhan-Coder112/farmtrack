from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import get_db
from datetime import date

dashboard_bp = Blueprint("dashboard", __name__)

@dashboard_bp.route("/", methods=["GET"])
@jwt_required()
def get_dashboard():
    uid = int(get_jwt_identity())
    today = str(date.today())
    month = today[:7]
    conn = get_db()

    # Crops
    total_crops = conn.execute("SELECT COUNT(*) FROM crops WHERE user_id=?", (uid,)).fetchone()[0]
    growing_crops = conn.execute("SELECT COUNT(*) FROM crops WHERE user_id=? AND status='growing'", (uid,)).fetchone()[0]
    completed_crops = conn.execute("SELECT COUNT(*) FROM crops WHERE user_id=? AND status='completed'", (uid,)).fetchone()[0]

    # Workers
    active_workers = conn.execute("SELECT COUNT(*) FROM workers WHERE user_id=? AND status='active'", (uid,)).fetchone()[0]
    present_today = conn.execute(
        "SELECT COUNT(*) FROM attendance WHERE user_id=? AND date=? AND status='present'", (uid, today)
    ).fetchone()[0]

    # Expenses
    month_expenses = conn.execute(
        "SELECT COALESCE(SUM(amount),0) FROM expenses WHERE user_id=? AND substr(date,1,7)=?",
        (uid, month)
    ).fetchone()[0]

    # Inventory alerts
    low_stock = conn.execute(
        "SELECT COUNT(*) FROM inventory WHERE user_id=? AND quantity<=min_quantity", (uid,)
    ).fetchone()[0]

    # Tasks
    pending_tasks = conn.execute(
        "SELECT COUNT(*) FROM tasks WHERE user_id=? AND status='pending'", (uid,)
    ).fetchone()[0]
    today_tasks = conn.execute(
        "SELECT COUNT(*) FROM tasks WHERE user_id=? AND due_date=?", (uid, today)
    ).fetchone()[0]

    # Recent expenses
    recent_expenses = conn.execute(
        "SELECT * FROM expenses WHERE user_id=? ORDER BY date DESC LIMIT 5", (uid,)
    ).fetchall()

    # Recent activity (crops + tasks)
    recent_crops = conn.execute(
        "SELECT 'crop' as type, name, created_at as time FROM crops WHERE user_id=? ORDER BY created_at DESC LIMIT 3",
        (uid,)
    ).fetchall()

    conn.close()
    return jsonify({
        "crops": {"total": total_crops, "growing": growing_crops, "completed": completed_crops},
        "workers": {"active": active_workers, "present_today": present_today},
        "expenses": {"this_month": round(month_expenses, 2)},
        "inventory": {"low_stock_alerts": low_stock},
        "tasks": {"pending": pending_tasks, "today": today_tasks},
        "recent_expenses": [dict(r) for r in recent_expenses],
        "recent_crops": [dict(r) for r in recent_crops],
    })
