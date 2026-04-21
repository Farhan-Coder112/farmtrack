from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import get_db
from datetime import date

expenses_bp = Blueprint("expenses", __name__)

CATEGORIES = ["seeds", "fertilizer", "pesticide", "labor", "equipment", "irrigation", "transport", "other"]

@expenses_bp.route("/", methods=["GET"])
@jwt_required()
def get_expenses():
    uid = int(get_jwt_identity())
    category = request.args.get("category")
    month = request.args.get("month")
    conn = get_db()
    query = "SELECT * FROM expenses WHERE user_id=?"
    params = [uid]
    if category:
        query += " AND category=?"
        params.append(category)
    if month:
        query += " AND substr(date,1,7)=?"
        params.append(month)
    query += " ORDER BY date DESC"
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@expenses_bp.route("/", methods=["POST"])
@jwt_required()
def add_expense():
    uid = int(get_jwt_identity())
    data = request.get_json()
    if not data.get("title") or not data.get("amount") or not data.get("category"):
        return jsonify({"error": "title, amount, and category are required"}), 400
    conn = get_db()
    cur = conn.execute(
        "INSERT INTO expenses (user_id,title,category,amount,date,description,payment_method) VALUES (?,?,?,?,?,?,?)",
        (uid, data["title"], data["category"], data["amount"],
         data.get("date", str(date.today())), data.get("description"),
         data.get("payment_method", "cash"))
    )
    conn.commit()
    row = conn.execute("SELECT * FROM expenses WHERE id=?", (cur.lastrowid,)).fetchone()
    conn.close()
    return jsonify(dict(row)), 201

@expenses_bp.route("/<int:eid>", methods=["PUT"])
@jwt_required()
def update_expense(eid):
    uid = int(get_jwt_identity())
    data = request.get_json()
    conn = get_db()
    conn.execute(
        "UPDATE expenses SET title=?,category=?,amount=?,date=?,description=?,payment_method=? WHERE id=? AND user_id=?",
        (data.get("title"), data.get("category"), data.get("amount"),
         data.get("date"), data.get("description"), data.get("payment_method"), eid, uid)
    )
    conn.commit()
    row = conn.execute("SELECT * FROM expenses WHERE id=?", (eid,)).fetchone()
    conn.close()
    return jsonify(dict(row))

@expenses_bp.route("/<int:eid>", methods=["DELETE"])
@jwt_required()
def delete_expense(eid):
    uid = int(get_jwt_identity())
    conn = get_db()
    conn.execute("DELETE FROM expenses WHERE id=? AND user_id=?", (eid, uid))
    conn.commit()
    conn.close()
    return jsonify({"message": "Expense deleted"})

@expenses_bp.route("/summary", methods=["GET"])
@jwt_required()
def expense_summary():
    uid = int(get_jwt_identity())
    month = request.args.get("month", str(date.today())[:7])
    conn = get_db()
    total = conn.execute(
        "SELECT COALESCE(SUM(amount),0) FROM expenses WHERE user_id=? AND substr(date,1,7)=?",
        (uid, month)
    ).fetchone()[0]
    by_cat = conn.execute(
        "SELECT category, SUM(amount) as total FROM expenses WHERE user_id=? AND substr(date,1,7)=? GROUP BY category",
        (uid, month)
    ).fetchall()
    monthly = conn.execute(
        "SELECT substr(date,1,7) as month, SUM(amount) as total FROM expenses WHERE user_id=? GROUP BY month ORDER BY month DESC LIMIT 6",
        (uid,)
    ).fetchall()
    conn.close()
    return jsonify({
        "month": month,
        "total": total,
        "by_category": [dict(r) for r in by_cat],
        "monthly_trend": [dict(r) for r in monthly]
    })

@expenses_bp.route("/categories", methods=["GET"])
def get_categories():
    return jsonify(CATEGORIES)
