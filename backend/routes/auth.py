from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from database import get_db

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    required = ["name", "email", "password"]
    for field in required:
        if not data.get(field):
            return jsonify({"error": f"{field} is required"}), 400

    hashed = generate_password_hash(data["password"])
    conn = get_db()
    try:
        conn.execute(
            "INSERT INTO users (name, email, password, role, phone, farm_name) VALUES (?,?,?,?,?,?)",
            (data["name"], data["email"], hashed,
             data.get("role", "manager"), data.get("phone"), data.get("farm_name"))
        )
        conn.commit()
        user = conn.execute("SELECT * FROM users WHERE email=?", (data["email"],)).fetchone()
        token = create_access_token(identity=str(user["id"]))
        return jsonify({
            "message": "Registration successful",
            "token": token,
            "user": {
                "id": user["id"], "name": user["name"],
                "email": user["email"], "role": user["role"],
                "farm_name": user["farm_name"]
            }
        }), 201
    except Exception as e:
        return jsonify({"error": "Email already registered"}), 409
    finally:
        conn.close()

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    if not data.get("email") or not data.get("password"):
        return jsonify({"error": "Email and password required"}), 400

    conn = get_db()
    user = conn.execute("SELECT * FROM users WHERE email=?", (data["email"],)).fetchone()
    conn.close()

    if not user or not check_password_hash(user["password"], data["password"]):
        return jsonify({"error": "Invalid credentials"}), 401

    token = create_access_token(identity=str(user["id"]))
    return jsonify({
        "message": "Login successful",
        "token": token,
        "user": {
            "id": user["id"], "name": user["name"],
            "email": user["email"], "role": user["role"],
            "farm_name": user["farm_name"], "phone": user["phone"]
        }
    })

@auth_bp.route("/profile", methods=["GET"])
@jwt_required()
def profile():
    uid = int(get_jwt_identity())
    conn = get_db()
    user = conn.execute("SELECT * FROM users WHERE id=?", (uid,)).fetchone()
    conn.close()
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify({
        "id": user["id"], "name": user["name"], "email": user["email"],
        "role": user["role"], "phone": user["phone"],
        "farm_name": user["farm_name"], "created_at": user["created_at"]
    })

@auth_bp.route("/profile", methods=["PUT"])
@jwt_required()
def update_profile():
    uid = int(get_jwt_identity())
    data = request.get_json()
    conn = get_db()
    conn.execute(
        "UPDATE users SET name=?, phone=?, farm_name=? WHERE id=?",
        (data.get("name"), data.get("phone"), data.get("farm_name"), uid)
    )
    conn.commit()
    conn.close()
    return jsonify({"message": "Profile updated successfully"})
