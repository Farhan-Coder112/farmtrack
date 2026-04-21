from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import get_db

crops_bp = Blueprint("crops", __name__)

def row_to_dict(row):
    return dict(row) if row else None

@crops_bp.route("/", methods=["GET"])
@jwt_required()
def get_crops():
    uid = int(get_jwt_identity())
    status = request.args.get("status")
    conn = get_db()
    if status:
        rows = conn.execute("SELECT * FROM crops WHERE user_id=? AND status=? ORDER BY created_at DESC", (uid, status)).fetchall()
    else:
        rows = conn.execute("SELECT * FROM crops WHERE user_id=? ORDER BY created_at DESC", (uid,)).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@crops_bp.route("/", methods=["POST"])
@jwt_required()
def add_crop():
    uid = int(get_jwt_identity())
    data = request.get_json()
    if not data.get("name"):
        return jsonify({"error": "Crop name is required"}), 400
    conn = get_db()
    cur = conn.execute(
        """INSERT INTO crops (user_id, name, variety, field_location, area_acres,
           field_quantity, field_unit, status, plant_date, expected_harvest, 
           harvest_quantity, harvest_unit, notes)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        (uid, data["name"], data.get("variety"), data.get("field_location"),
         data.get("area_acres"), data.get("field_quantity", 0), data.get("field_unit", "kg"),
         data.get("status", "growing"), data.get("plant_date"), data.get("expected_harvest"),
         data.get("harvest_quantity", 0), data.get("harvest_unit", "kg"),
         data.get("notes"))
    )
    conn.commit()
    crop = conn.execute("SELECT * FROM crops WHERE id=?", (cur.lastrowid,)).fetchone()
    conn.close()
    return jsonify(dict(crop)), 201

@crops_bp.route("/<int:crop_id>", methods=["GET"])
@jwt_required()
def get_crop(crop_id):
    uid = int(get_jwt_identity())
    conn = get_db()
    row = conn.execute("SELECT * FROM crops WHERE id=? AND user_id=?", (crop_id, uid)).fetchone()
    conn.close()
    if not row:
        return jsonify({"error": "Crop not found"}), 404
    return jsonify(dict(row))

@crops_bp.route("/<int:crop_id>", methods=["PUT"])
@jwt_required()
def update_crop(crop_id):
    uid = int(get_jwt_identity())
    data = request.get_json()
    conn = get_db()
    conn.execute(
        """UPDATE crops SET name=?, variety=?, field_location=?, area_acres=?,
           field_quantity=?, field_unit=?, status=?, plant_date=?, expected_harvest=?, 
           actual_harvest=?, harvest_quantity=?, harvest_unit=?, notes=?
           WHERE id=? AND user_id=?""",
        (data.get("name"), data.get("variety"), data.get("field_location"),
         data.get("area_acres"), data.get("field_quantity", 0), data.get("field_unit", "kg"),
         data.get("status"), data.get("plant_date"), data.get("expected_harvest"),
         data.get("actual_harvest"), data.get("harvest_quantity", 0), data.get("harvest_unit", "kg"),
         data.get("notes"), crop_id, uid)
    )
    conn.commit()
    crop = conn.execute("SELECT * FROM crops WHERE id=?", (crop_id,)).fetchone()
    conn.close()
    return jsonify(dict(crop))

@crops_bp.route("/<int:crop_id>", methods=["DELETE"])
@jwt_required()
def delete_crop(crop_id):
    uid = int(get_jwt_identity())
    conn = get_db()
    conn.execute("DELETE FROM crops WHERE id=? AND user_id=?", (crop_id, uid))
    conn.commit()
    conn.close()
    return jsonify({"message": "Crop deleted successfully"})

@crops_bp.route("/stats", methods=["GET"])
@jwt_required()
def crop_stats():
    uid = int(get_jwt_identity())
    conn = get_db()
    total = conn.execute("SELECT COUNT(*) FROM crops WHERE user_id=?", (uid,)).fetchone()[0]
    growing = conn.execute("SELECT COUNT(*) FROM crops WHERE user_id=? AND status='growing'", (uid,)).fetchone()[0]
    harvested = conn.execute("SELECT COUNT(*) FROM crops WHERE user_id=? AND status='harvested'", (uid,)).fetchone()[0]
    conn.close()
    return jsonify({"total": total, "growing": growing, "harvested": harvested})
