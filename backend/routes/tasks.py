from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import get_db
from datetime import date, datetime

tasks_bp = Blueprint("tasks", __name__)

@tasks_bp.route("/", methods=["GET"])
@jwt_required()
def get_tasks():
    uid = int(get_jwt_identity())
    status = request.args.get("status")
    priority = request.args.get("priority")
    conn = get_db()
    query = """SELECT t.*, w.name as worker_name FROM tasks t
               LEFT JOIN workers w ON t.worker_id=w.id
               WHERE t.user_id=?"""
    params = [uid]
    if status:
        query += " AND t.status=?"
        params.append(status)
    if priority:
        query += " AND t.priority=?"
        params.append(priority)
    query += " ORDER BY t.due_date ASC, t.due_time ASC"
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@tasks_bp.route("/", methods=["POST"])
@jwt_required()
def add_task():
    uid = int(get_jwt_identity())
    data = request.get_json()
    if not data.get("title"):
        return jsonify({"error": "Task title is required"}), 400
    conn = get_db()
    cur = conn.execute(
        """INSERT INTO tasks (user_id,worker_id,title,description,category,priority,status,due_date,due_time)
           VALUES (?,?,?,?,?,?,?,?,?)""",
        (uid, data.get("worker_id"), data["title"], data.get("description"),
         data.get("category", "general"), data.get("priority", "medium"),
         data.get("status", "pending"), data.get("due_date"), data.get("due_time"))
    )
    conn.commit()
    row = conn.execute(
        "SELECT t.*,w.name as worker_name FROM tasks t LEFT JOIN workers w ON t.worker_id=w.id WHERE t.id=?",
        (cur.lastrowid,)
    ).fetchone()
    conn.close()
    return jsonify(dict(row)), 201

@tasks_bp.route("/<int:tid>", methods=["PUT"])
@jwt_required()
def update_task(tid):
    uid = int(get_jwt_identity())
    data = request.get_json()
    completed_at = None
    if data.get("status") == "completed":
        completed_at = str(datetime.now())
    conn = get_db()
    conn.execute(
        """UPDATE tasks SET worker_id=?,title=?,description=?,category=?,priority=?,
           status=?,due_date=?,due_time=?,completed_at=COALESCE(?,completed_at) WHERE id=? AND user_id=?""",
        (data.get("worker_id"), data.get("title"), data.get("description"),
         data.get("category"), data.get("priority"), data.get("status"),
         data.get("due_date"), data.get("due_time"), completed_at, tid, uid)
    )
    conn.commit()
    row = conn.execute(
        "SELECT t.*,w.name as worker_name FROM tasks t LEFT JOIN workers w ON t.worker_id=w.id WHERE t.id=?",
        (tid,)
    ).fetchone()
    conn.close()
    return jsonify(dict(row))

@tasks_bp.route("/<int:tid>", methods=["DELETE"])
@jwt_required()
def delete_task(tid):
    uid = int(get_jwt_identity())
    conn = get_db()
    conn.execute("DELETE FROM tasks WHERE id=? AND user_id=?", (tid, uid))
    conn.commit()
    conn.close()
    return jsonify({"message": "Task deleted"})

@tasks_bp.route("/today", methods=["GET"])
@jwt_required()
def today_tasks():
    uid = int(get_jwt_identity())
    today = str(date.today())
    conn = get_db()
    rows = conn.execute(
        """SELECT t.*,w.name as worker_name FROM tasks t
           LEFT JOIN workers w ON t.worker_id=w.id
           WHERE t.user_id=? AND t.due_date=? ORDER BY t.due_time""",
        (uid, today)
    ).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@tasks_bp.route("/upcoming", methods=["GET"])
@jwt_required()
def upcoming_tasks():
    uid = int(get_jwt_identity())
    today = str(date.today())
    conn = get_db()
    rows = conn.execute(
        """SELECT t.*,w.name as worker_name FROM tasks t
           LEFT JOIN workers w ON t.worker_id=w.id
           WHERE t.user_id=? AND t.due_date>=? AND t.status!='completed'
           ORDER BY t.due_date, t.due_time LIMIT 10""",
        (uid, today)
    ).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])
