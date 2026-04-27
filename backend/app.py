from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from dotenv import load_dotenv
import os

load_dotenv()

from database import init_db, auto_migrate
from routes.auth import auth_bp
from routes.crops import crops_bp
from routes.workers import workers_bp
from routes.expenses import expenses_bp
from routes.inventory import inventory_bp
from routes.tasks import tasks_bp
from routes.dashboard import dashboard_bp
from routes.weather import weather_bp
from routes.customers import customers_bp
from routes.sales import sales_bp

app = Flask(__name__)
CORS(app)

app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "farm-secret-key-2024")
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = False

jwt = JWTManager(app)

# Register blueprints
app.register_blueprint(auth_bp, url_prefix="/api/auth")
app.register_blueprint(crops_bp, url_prefix="/api/crops")
app.register_blueprint(workers_bp, url_prefix="/api/workers")
app.register_blueprint(expenses_bp, url_prefix="/api/expenses")
app.register_blueprint(inventory_bp, url_prefix="/api/inventory")
app.register_blueprint(tasks_bp, url_prefix="/api/tasks")
app.register_blueprint(dashboard_bp, url_prefix="/api/dashboard")
app.register_blueprint(weather_bp, url_prefix="/api/weather")
app.register_blueprint(customers_bp, url_prefix="/api/customers")
app.register_blueprint(sales_bp, url_prefix="/api/sales")

# Run DB init + migrations on every startup (works with WSGI too)
init_db()
auto_migrate()

@app.route("/")
def index():
    return {"message": "🌾 Farm Management API is running!", "version": "1.0.0"}

@app.route("/api")
def api_info():
    return {"message": "🌾 Farm Management API is running!", "version": "1.0.0"}

import traceback
@app.errorhandler(Exception)
def handle_exception(e):
    # return JSON with the error traceback
    return {"error": str(e), "traceback": traceback.format_exc()}, 500

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
