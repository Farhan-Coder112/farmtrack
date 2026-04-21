from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import get_db

customers_bp = Blueprint("customers", __name__)

@customers_bp.route("/", methods=["GET"])
@jwt_required()
def get_customers():
    uid = int(get_jwt_identity())
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM customers WHERE user_id=? ORDER BY created_at DESC",
        (uid,)
    ).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@customers_bp.route("/", methods=["POST"])
@jwt_required()
def create_customer():
    uid = int(get_jwt_identity())
    data = request.get_json()
    required = ["name"]
    for field in required:
        if not data.get(field):
            return jsonify({"error": f"{field} is required"}), 400

    conn = get_db()
    try:
        conn.execute(
            "INSERT INTO customers (user_id, name, phone, email, address, business_name, notes) VALUES (?,?,?,?,?,?,?)",
            (uid, data["name"], data.get("phone"), data.get("email"), data.get("address"), data.get("business_name"), data.get("notes"))
        )
        conn.commit()
        customer = conn.execute("SELECT * FROM customers WHERE user_id=? ORDER BY id DESC LIMIT 1", (uid,)).fetchone()
        conn.close()
        return jsonify(dict(customer)), 201
    except Exception as e:
        conn.close()
        return jsonify({"error": str(e)}), 500

@customers_bp.route("/<int:customer_id>", methods=["PUT"])
@jwt_required()
def update_customer(customer_id):
    uid = int(get_jwt_identity())
    data = request.get_json()
    conn = get_db()
    
    # Verify ownership
    customer = conn.execute("SELECT * FROM customers WHERE id=? AND user_id=?", (customer_id, uid)).fetchone()
    if not customer:
        conn.close()
        return jsonify({"error": "Customer not found"}), 404
    
    try:
        conn.execute(
            "UPDATE customers SET name=?, phone=?, email=?, address=?, business_name=?, notes=? WHERE id=?",
            (data.get("name"), data.get("phone"), data.get("email"), data.get("address"), data.get("business_name"), data.get("notes"), customer_id)
        )
        conn.commit()
        updated = conn.execute("SELECT * FROM customers WHERE id=?", (customer_id,)).fetchone()
        conn.close()
        return jsonify(dict(updated))
    except Exception as e:
        conn.close()
        return jsonify({"error": str(e)}), 500

@customers_bp.route("/<int:customer_id>", methods=["DELETE"])
@jwt_required()
def delete_customer(customer_id):
    uid = int(get_jwt_identity())
    conn = get_db()
    
    # Verify ownership
    customer = conn.execute("SELECT * FROM customers WHERE id=? AND user_id=?", (customer_id, uid)).fetchone()
    if not customer:
        conn.close()
        return jsonify({"error": "Customer not found"}), 404
    
    try:
        conn.execute("DELETE FROM customers WHERE id=?", (customer_id,))
        conn.commit()
        conn.close()
        return jsonify({"message": "Customer deleted successfully"})
    except Exception as e:
        conn.close()
        return jsonify({"error": str(e)}), 500
