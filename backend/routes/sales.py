from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import get_db
from datetime import date

sales_bp = Blueprint("sales", __name__)

@sales_bp.route("/", methods=["GET"])
@jwt_required()
def get_sales():
    uid = int(get_jwt_identity())
    conn = get_db()
    rows = conn.execute(
        """SELECT s.*, c.name as customer_name,
           COALESCE((SELECT SUM(cr2.harvest_quantity) FROM crops cr2 
                     WHERE cr2.user_id=? AND cr2.name=s.crop_name 
                     AND (cr2.variety = (SELECT variety FROM crops cr3 WHERE cr3.id=s.crop_id) OR 
                          (cr2.variety IS NULL AND (SELECT variety FROM crops cr3 WHERE cr3.id=s.crop_id) IS NULL))
                     AND (cr2.status='completed' OR cr2.status='harvested')), 0) as crop_stock,
           COALESCE((SELECT cr4.harvest_unit FROM crops cr4 WHERE cr4.id=s.crop_id), s.unit) as crop_unit
           FROM sales s 
           LEFT JOIN customers c ON s.customer_id = c.id 
           WHERE s.user_id=? 
           ORDER BY s.sale_date DESC""",
        (uid, uid)
    ).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@sales_bp.route("/customer/<int:customer_id>", methods=["GET"])
@jwt_required()
def get_sales_by_customer(customer_id):
    uid = int(get_jwt_identity())
    conn = get_db()
    rows = conn.execute(
        """SELECT s.*, c.name as customer_name,
           COALESCE((SELECT SUM(cr2.harvest_quantity) FROM crops cr2 
                     WHERE cr2.user_id=? AND cr2.name=s.crop_name 
                     AND (cr2.variety = (SELECT variety FROM crops cr3 WHERE cr3.id=s.crop_id) OR 
                          (cr2.variety IS NULL AND (SELECT variety FROM crops cr3 WHERE cr3.id=s.crop_id) IS NULL))
                     AND (cr2.status='completed' OR cr2.status='harvested')), 0) as crop_stock,
           COALESCE((SELECT cr4.harvest_unit FROM crops cr4 WHERE cr4.id=s.crop_id), s.unit) as crop_unit
           FROM sales s 
           LEFT JOIN customers c ON s.customer_id = c.id 
           WHERE s.user_id=? AND s.customer_id=?
           ORDER BY s.sale_date DESC""",
        (uid, uid, customer_id)
    ).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@sales_bp.route("/summary", methods=["GET"])
@jwt_required()
def get_sales_summary():
    uid = int(get_jwt_identity())
    conn = get_db()
    
    # Get monthly sales summary
    current_month = str(date.today())[:7]  # YYYY-MM
    
    summary = conn.execute(
        """SELECT 
           COUNT(*) as total_sales,
           SUM(total_price) as total_revenue,
           SUM(paid_amount) as paid_amount,
           SUM(remaining_amount) as pending_amount
           FROM sales 
           WHERE user_id=? AND substr(sale_date,1,7)=?""",
        (uid, current_month)
    ).fetchone()
    
    conn.close()
    return jsonify(dict(summary))

@sales_bp.route("/", methods=["POST"])
@jwt_required()
def create_sale():
    uid = int(get_jwt_identity())
    data = request.get_json()
    required = ["customer_id", "crop_name", "quantity", "price_per_unit"]
    for field in required:
        if not data.get(field):
            return jsonify({"error": f"{field} is required"}), 400

    # Calculate total price
    total_price = float(data["quantity"]) * float(data["price_per_unit"])
    
    conn = get_db()
    try:
        cur = conn.execute(
            """INSERT INTO sales (user_id, customer_id, crop_id, crop_name, quantity, unit,
               price_per_unit, total_price, paid_amount, remaining_amount, sale_date, 
               payment_status, payment_method, notes)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (uid, data["customer_id"], data.get("crop_id"), data["crop_name"], data["quantity"],
             data.get("unit", "kg"), data["price_per_unit"], total_price, 
             data.get("paid_amount", 0), data.get("remaining_amount", 0), data.get("sale_date", str(date.today())),
             data.get("payment_status", "pending"), data.get("payment_method", "cash"),
             data.get("notes"))
        )
        
        # Reduce crop harvest quantity if crop_id is provided
        crop_id = data.get("crop_id")
        if crop_id:
            crop = conn.execute("SELECT harvest_quantity FROM crops WHERE id=? AND user_id=?", (crop_id, uid)).fetchone()
            if crop and crop["harvest_quantity"]:
                new_quantity = crop["harvest_quantity"] - float(data["quantity"])
                if new_quantity < 0:
                    new_quantity = 0
                conn.execute("UPDATE crops SET harvest_quantity=? WHERE id=? AND user_id=?", (new_quantity, crop_id, uid))
        
        conn.commit()
        sale = conn.execute("SELECT * FROM sales WHERE user_id=? ORDER BY id DESC LIMIT 1", (uid,)).fetchone()
        conn.close()
        return jsonify(dict(sale)), 201
    except Exception as e:
        conn.close()
        return jsonify({"error": str(e)}), 500

@sales_bp.route("/<int:sale_id>", methods=["PUT"])
@jwt_required()
def update_sale(sale_id):
    uid = int(get_jwt_identity())
    data = request.get_json()
    conn = get_db()
    
    # Verify ownership
    sale = conn.execute("SELECT * FROM sales WHERE id=? AND user_id=?", (sale_id, uid)).fetchone()
    if not sale:
        conn.close()
        return jsonify({"error": "Sale not found"}), 404
    
    # Convert to dictionary for easier access
    sale = dict(sale)
    
    # Recalculate total if quantity or price changed
    old_quantity = float(sale["quantity"])
    new_quantity = float(data.get("quantity", sale["quantity"]))
    old_crop_id = sale.get("crop_id")
    new_crop_id = data.get("crop_id")
    
    if "quantity" in data or "price_per_unit" in data:
        price_per_unit = float(data.get("price_per_unit", sale["price_per_unit"]))
        data["total_price"] = new_quantity * price_per_unit
    
    try:
        conn.execute(
            """UPDATE sales SET customer_id=?, crop_name=?, quantity=?, unit=?, price_per_unit=?, total_price=?, paid_amount=?, remaining_amount=?, sale_date=?, payment_status=?, payment_method=?, notes=? 
               WHERE id=?""",
            (data.get("customer_id"), data.get("crop_name"), data.get("quantity"), data.get("unit"), data.get("price_per_unit"), data.get("total_price"), data.get("paid_amount", 0), data.get("remaining_amount", 0), data.get("sale_date"), data.get("payment_status"), data.get("payment_method"), data.get("notes"), sale_id)
        )
        
        # Adjust crop harvest quantity
        # First, restore old quantity if crop was linked
        if old_crop_id:
            crop = conn.execute("SELECT harvest_quantity FROM crops WHERE id=? AND user_id=?", (old_crop_id, uid)).fetchone()
            if crop and crop["harvest_quantity"] is not None:
                restored_quantity = crop["harvest_quantity"] + old_quantity
                conn.execute("UPDATE crops SET harvest_quantity=? WHERE id=? AND user_id=?", (restored_quantity, old_crop_id, uid))
        
        # Then, deduct new quantity if crop is linked
        if new_crop_id:
            crop = conn.execute("SELECT harvest_quantity FROM crops WHERE id=? AND user_id=?", (new_crop_id, uid)).fetchone()
            if crop and crop["harvest_quantity"] is not None:
                new_crop_quantity = crop["harvest_quantity"] - new_quantity
                if new_crop_quantity < 0:
                    new_crop_quantity = 0
                conn.execute("UPDATE crops SET harvest_quantity=? WHERE id=? AND user_id=?", (new_crop_quantity, new_crop_id, uid))
        
        conn.commit()
        updated = conn.execute("SELECT * FROM sales WHERE id=?", (sale_id,)).fetchone()
        conn.close()
        return jsonify(dict(updated))
    except Exception as e:
        conn.close()
        return jsonify({"error": str(e)}), 500

@sales_bp.route("/<int:sale_id>", methods=["DELETE"])
@jwt_required()
def delete_sale(sale_id):
    uid = int(get_jwt_identity())
    conn = get_db()
    
    # Verify ownership
    sale = conn.execute("SELECT * FROM sales WHERE id=? AND user_id=?", (sale_id, uid)).fetchone()
    if not sale:
        conn.close()
        return jsonify({"error": "Sale not found"}), 404
    
    # Convert to dictionary for easier access
    sale = dict(sale)
    
    try:
        # Restore crop harvest quantity if sale was linked to a crop
        crop_id = sale.get("crop_id")
        if crop_id:
            crop = conn.execute("SELECT harvest_quantity FROM crops WHERE id=? AND user_id=?", (crop_id, uid)).fetchone()
            if crop and crop["harvest_quantity"] is not None:
                restored_quantity = crop["harvest_quantity"] + float(sale["quantity"])
                conn.execute("UPDATE crops SET harvest_quantity=? WHERE id=? AND user_id=?", (restored_quantity, crop_id, uid))
        
        conn.execute("DELETE FROM sales WHERE id=?", (sale_id,))
        conn.commit()
        conn.close()
        return jsonify({"message": "Sale deleted"}), 200
    except Exception as e:
        print(f"Delete sale error: {e}")
        conn.close()
        return jsonify({"error": str(e)}), 500
