from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
import os, requests

weather_bp = Blueprint("weather", __name__)

OWM_KEY = os.getenv("WEATHER_API_KEY", "")

@weather_bp.route("/", methods=["GET"])
@jwt_required()
def get_weather():
    city = request.args.get("city", "Mumbai")
    if not OWM_KEY:
        # Return mock weather when no API key is set
        return jsonify({
            "city": city, "temperature": 28, "feels_like": 31,
            "humidity": 65, "wind_speed": 12, "description": "Partly cloudy",
            "icon": "02d", "uv_index": 5,
            "forecast": [
                {"day": "Today", "high": 30, "low": 22, "description": "Sunny", "icon": "01d"},
                {"day": "Tomorrow", "high": 28, "low": 20, "description": "Cloudy", "icon": "02d"},
                {"day": "Day 3", "high": 25, "low": 19, "description": "Rainy", "icon": "10d"},
                {"day": "Day 4", "high": 27, "low": 21, "description": "Partly cloudy", "icon": "03d"},
                {"day": "Day 5", "high": 29, "low": 22, "description": "Sunny", "icon": "01d"},
            ],
            "mock": True
        })
    try:
        url = f"https://api.openweathermap.org/data/2.5/weather?q={city}&appid={OWM_KEY}&units=metric"
        r = requests.get(url, timeout=5)
        d = r.json()
        return jsonify({
            "city": d["name"], "temperature": d["main"]["temp"],
            "feels_like": d["main"]["feels_like"],
            "humidity": d["main"]["humidity"],
            "wind_speed": d["wind"]["speed"],
            "description": d["weather"][0]["description"].title(),
            "icon": d["weather"][0]["icon"],
            "mock": False
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
