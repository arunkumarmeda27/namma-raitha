from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import numpy as np
import torch
import torch.nn as nn
from torchvision import transforms, models
from PIL import Image
import io
import base64

app = Flask(__name__)
CORS(app)

# ── MODEL 1: CROP PREDICTION (.pkl) ───────────────────────────────────────────
try:
    crop_model = joblib.load("crop_model.pkl")
    print("Crop Prediction Model loaded successfully.")
except Exception as e:
    print(f"Error loading crop model: {e}")
    crop_model = None

# ── MODEL 2: MULTI-CLASS IMAGE ANALYSIS (MobileNetV2 .pth) ───────────────────
image_model = None
CLASSES = []

try:
    checkpoint = torch.load("multi_class_crop_model.pth", weights_only=True)
    CLASSES = checkpoint['classes']
    num_classes = checkpoint['num_classes']
    
    # Reconstruct exact architecture from training
    image_model = models.mobilenet_v2(weights=None)
    num_ftrs = image_model.classifier[1].in_features
    image_model.classifier[1] = nn.Linear(num_ftrs, num_classes)
    
    image_model.load_state_dict(checkpoint['model_state_dict'])
    image_model.eval()
    print(f"Professional Image AI Model loaded successfully with {len(CLASSES)} classes.")
except Exception as e:
    print(f"Error loading image model: {e}")
    image_model = None

# ── ENDPOINTS ─────────────────────────────────────────────────────────────────

@app.route("/predict", methods=["POST"])
def predict():
    if not crop_model: return jsonify({"error": "Model not loaded"}), 500
    data = request.json
    try:
        features = np.array([[float(data.get(k, 0)) for k in ["N","P","K","temperature","humidity","ph","rainfall"]]])
        prediction = crop_model.predict(features)[0]
        return jsonify({"crop": prediction})
    except Exception as e: return jsonify({"error": str(e)}), 400

@app.route("/predict-image", methods=["POST"])
def predict_image():
    if not image_model: return jsonify({"error": "Image model not loaded"}), 500
    data = request.json
    img_b64 = data.get("image")
    if not img_b64: return jsonify({"error": "No image provided"}), 400

    try:
        if "," in img_b64: img_b64 = img_b64.split(",")[1]
        img_data = base64.b64decode(img_b64)
        img = Image.open(io.BytesIO(img_data)).convert('RGB')

        transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
        ])
        img_tensor = transform(img).unsqueeze(0)

        with torch.no_grad():
            outputs = image_model(img_tensor)
            probs = torch.nn.functional.softmax(outputs, dim=1)
            conf, pred = torch.max(probs, 1)
            
        result = CLASSES[pred.item()]
        confidence = f"{conf.item()*100:.1f}%"
        
        # Smart Logic for Recommendations
        status = "Healthy" if "healthy" in result.lower() else "Requires Attention"
        
        # Pretty-print names like 'American_Bollworm_on_Cotton' -> 'American Bollworm On Cotton'
        pretty_name = result.replace('_', ' ').replace('___', ' : ').title()
        
        # Basic Agriculture Rules Library
        recommendations = ["Maintain regular irrigation."]
        issues = []
        
        if status == "Requires Attention":
            issues = [f"{pretty_name} identified on the sample."]
            if "blight" in result.lower():
                recommendations = ["Apply 0.2% Carbendazim spray.", "Remove infected leaves immediately.", "Avoid overhead irrigation."]
            elif "rust" in result.lower():
                recommendations = ["Apply sulphur-based fungicide.", "Improve air circulation around plants."]
            elif "worm" in result.lower() or "caterpillar" in result.lower() or "pest" in result.lower():
                recommendations = ["Spray Neem Oil (5ml/L).", "Install pheromone traps (5 per acre)."]
            else:
                recommendations = ["Consult your local RSK center.", "Apply organic balanced nutrients."]

        return jsonify({
            "diagnosis": f"Detected: {pretty_name}. {('The sample is healthy.' if status == 'Healthy' else 'Symptoms detected.')}",
            "status": status,
            "confidence": confidence,
            "recommendation": recommendations[0] if recommendations else "Maintain standard care.",
            "detailed_recommendations": recommendations,
            "detected_issues": issues,
            "cropIdentified": pretty_name.split(':')[0].strip()
        })
    except Exception as e: return jsonify({"error": str(e)}), 400

import os

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
