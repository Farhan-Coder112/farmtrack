from flask import Flask, send_from_directory, jsonify
from flask_cors import CORS
from database import get_db
import os

# Resolve paths
FRONTEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "web-app"))

app = Flask(__name__, static_folder=FRONTEND_DIR, static_url_path="")
CORS(app)

@app.route("/")
def index():
    return send_from_directory(FRONTEND_DIR, "simple_test.html")

@app.route("/main")
def main():
    return send_from_directory(FRONTEND_DIR, "index.html")

@app.route("/api")
def api_info():
    return {"message": "Farm Management API is running!", "version": "1.0.0"}

@app.route("/api/workers/")
def get_workers():
    try:
        conn = get_db()
        rows = conn.execute("SELECT * FROM workers ORDER BY name").fetchall()
        conn.close()
        return jsonify([dict(r) for r in rows])
    except Exception as e:
        return jsonify({"error": str(e), "workers": []})

@app.route("/api/tasks/")
def get_tasks():
    try:
        conn = get_db()
        rows = conn.execute("SELECT * FROM tasks ORDER BY due_date").fetchall()
        conn.close()
        return jsonify([dict(r) for r in rows])
    except Exception as e:
        return jsonify({"error": str(e), "tasks": []})

@app.route("/api/expenses/")
def get_expenses():
    try:
        conn = get_db()
        rows = conn.execute("SELECT * FROM expenses ORDER BY date DESC").fetchall()
        conn.close()
        return jsonify([dict(r) for r in rows])
    except Exception as e:
        return jsonify({"error": str(e), "expenses": []})

@app.route("/api/inventory/")
def get_inventory():
    try:
        conn = get_db()
        rows = conn.execute("SELECT * FROM inventory ORDER BY name").fetchall()
        conn.close()
        return jsonify([dict(r) for r in rows])
    except Exception as e:
        return jsonify({"error": str(e), "inventory": []})

@app.route("/api/dashboard/summary/")
def dashboard_summary():
    conn = get_db()
    
    # Get counts
    worker_count = conn.execute("SELECT COUNT(*) as count FROM workers").fetchone()['count']
    task_count = conn.execute("SELECT COUNT(*) as count FROM tasks").fetchone()['count']
    expense_count = conn.execute("SELECT COUNT(*) as count FROM expenses").fetchone()['count']
    inventory_count = conn.execute("SELECT COUNT(*) as count FROM inventory").fetchone()['count']
    
    conn.close()
    
    return jsonify({
        "workers": worker_count,
        "tasks": task_count,
        "expenses": expense_count,
        "inventory": inventory_count,
        "total_items": worker_count + task_count + expense_count + inventory_count
    })

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
