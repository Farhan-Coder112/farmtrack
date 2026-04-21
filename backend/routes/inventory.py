from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import get_db

inventory_bp = Blueprint("inventory", __name__)

@inventory_bp.route("/", methods=["GET"])
@jwt_required()
def get_inventory():
    uid = int(get_jwt_identity())
    category = request.args.get("category")
    low_stock = request.args.get("low_stock") == "true"
    conn = get_db()
    query = "SELECT * FROM inventory WHERE user_id=?"
    params = [uid]
    if category:
        query += " AND category=?"
        params.append(category)
    if low_stock:
        query += " AND quantity <= min_quantity"
    query += " ORDER BY name"
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@inventory_bp.route("/", methods=["POST"])
@jwt_required()
def add_item():
    uid = int(get_jwt_identity())
    data = request.get_json()
    if not data.get("name") or not data.get("category"):
        return jsonify({"error": "name and category are required"}), 400
    conn = get_db()
    cur = conn.execute(
        """INSERT INTO inventory (user_id,name,category,quantity,unit,min_quantity,unit_price,supplier,location,expiry_date,quantity_used)
           VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
        (uid, data["name"], data["category"], data.get("quantity", 0),
         data.get("unit", "kg"), data.get("min_quantity", 0),
         data.get("unit_price", 0), data.get("supplier"),
         data.get("location"), data.get("expiry_date"), data.get("quantity_used", 0))
    )
    conn.commit()
    row = conn.execute("SELECT * FROM inventory WHERE id=?", (cur.lastrowid,)).fetchone()
    conn.close()
    return jsonify(dict(row)), 201

@inventory_bp.route("/<int:iid>", methods=["GET"])
@jwt_required()
def get_item(iid):
    uid = int(get_jwt_identity())
    conn = get_db()
    row = conn.execute("SELECT * FROM inventory WHERE id=? AND user_id=?", (iid, uid)).fetchone()
    conn.close()
    if not row:
        return jsonify({"error": "Item not found"}), 404
    return jsonify(dict(row))

@inventory_bp.route("/<int:iid>", methods=["PUT"])
@jwt_required()
def update_item(iid):
    uid = int(get_jwt_identity())
    data = request.get_json()
    conn = get_db()
    conn.execute(
        """UPDATE inventory SET name=?,category=?,quantity=?,unit=?,min_quantity=?,
           unit_price=?,supplier=?,location=?,expiry_date=?,quantity_used=?,updated_at=CURRENT_TIMESTAMP
           WHERE id=? AND user_id=?""",
        (data.get("name"), data.get("category"), data.get("quantity"),
         data.get("unit"), data.get("min_quantity"), data.get("unit_price"),
         data.get("supplier"), data.get("location"), data.get("expiry_date"), 
         data.get("quantity_used"), iid, uid)
    )
    conn.commit()
    row = conn.execute("SELECT * FROM inventory WHERE id=?", (iid,)).fetchone()
    conn.close()
    return jsonify(dict(row))

@inventory_bp.route("/<int:iid>", methods=["DELETE"])
@jwt_required()
def delete_item(iid):
    uid = int(get_jwt_identity())
    conn = get_db()
    conn.execute("DELETE FROM inventory WHERE id=? AND user_id=?", (iid, uid))
    conn.commit()
    conn.close()
    return jsonify({"message": "Item deleted"})

@inventory_bp.route("/alerts", methods=["GET"])
@jwt_required()
def low_stock_alerts():
    uid = int(get_jwt_identity())
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM inventory WHERE user_id=? AND (quantity - COALESCE(quantity_used, 0)) <= min_quantity ORDER BY (quantity - COALESCE(quantity_used, 0))",
        (uid,)
    ).fetchall()
    conn.close()
    return jsonify({"alerts": [dict(r) for r in rows], "count": len(rows)})

@inventory_bp.route("/summary", methods=["GET"])
@jwt_required()
def inventory_summary():
    uid = int(get_jwt_identity())
    conn = get_db()
    total = conn.execute("SELECT COUNT(*) FROM inventory WHERE user_id=?", (uid,)).fetchone()[0]
    low = conn.execute("SELECT COUNT(*) FROM inventory WHERE user_id=? AND (quantity - COALESCE(quantity_used, 0))<=min_quantity", (uid,)).fetchone()[0]
    value = conn.execute("SELECT COALESCE(SUM((quantity - COALESCE(quantity_used, 0))*unit_price),0) FROM inventory WHERE user_id=?", (uid,)).fetchone()[0]
    by_cat = conn.execute(
        "SELECT category, COUNT(*) as count FROM inventory WHERE user_id=? GROUP BY category",
        (uid,)
    ).fetchall()
    conn.close()
    return jsonify({"total_items": total, "low_stock_count": low,
                    "total_value": round(value, 2), "by_category": [dict(r) for r in by_cat]})
