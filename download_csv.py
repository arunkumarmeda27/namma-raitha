import kagglehub
import shutil
import os

print("Downloading dataset via kagglehub...")
path = kagglehub.dataset_download("atharvaingle/crop-recommendation-dataset")
csv_path = os.path.join(path, "Crop_recommendation.csv")

if os.path.exists(csv_path):
    print(f"File found at: {csv_path}")
    shutil.copy(csv_path, "Crop_recommendation.csv")
    print("✅ Successfully copied Crop_recommendation.csv to project root.")
else:
    print("❌ Could not find Crop_recommendation.csv in the downloaded package.")
