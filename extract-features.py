#!/usr/bin/env python3
"""
Extract features from event descriptions using the extract-features-from-description.sh script
Processes all description files and outputs JSON feature files
"""

import json
import subprocess
from pathlib import Path


def extract_features_from_text(description_text: str) -> dict:
    """Extract features from description text using the shell script."""
    try:
        result = subprocess.run(
            ['./extract-features-from-description.sh'],
            input=description_text,
            text=True,
            capture_output=True,
            timeout=30
        )
        
        if result.returncode == 0:
            # Parse JSON output
            try:
                features = json.loads(result.stdout.strip())
                return features
            except json.JSONDecodeError as e:
                print(f"Failed to parse JSON output: {e}")
                print(f"Raw output: {result.stdout}")
                return None
        else:
            print(f"Script failed with return code {result.returncode}: {result.stderr}")
            return None
    
    except subprocess.TimeoutExpired:
        print("Feature extraction timed out")
        return None
    except Exception as e:
        print(f"Error running feature extraction: {e}")
        return None


def extract_features_for_all_descriptions(descriptions_dir: str, features_dir: str) -> None:
    """Extract features for all description files."""
    descriptions_path = Path(descriptions_dir)
    features_path = Path(features_dir)
    
    if not descriptions_path.exists():
        print(f"Descriptions directory not found: {descriptions_dir}")
        return
    
    # Create features directory if it doesn't exist
    features_path.mkdir(exist_ok=True)
    print(f"Created/verified directory: {features_dir}")
    
    # Get all description files
    description_files = list(descriptions_path.glob("*.txt"))
    print(f"Found {len(description_files)} description files to process")
    
    processed = 0
    skipped = 0
    errors = []
    
    for desc_file in description_files:
        # Extract event ID from filename (remove .txt extension)
        event_id = desc_file.stem
        
        # Check if features file already exists
        features_file = features_path / f"{event_id}.json"
        if features_file.exists():
            skipped += 1
            continue
        
        print(f"Processing event ID: {event_id}")
        
        # Read description
        try:
            with open(desc_file, 'r', encoding='utf-8') as f:
                description_text = f.read().strip()
        except Exception as e:
            error_msg = f"Failed to read description file {desc_file}: {e}"
            errors.append(error_msg)
            continue
        
        if not description_text:
            error_msg = f"Empty description file: {desc_file}"
            errors.append(error_msg)
            continue
        
        # Extract features
        features = extract_features_from_text(description_text)
        if features is None:
            error_msg = f"Failed to extract features for event ID: {event_id}"
            errors.append(error_msg)
            continue
        
        # Validate features structure
        if not isinstance(features, dict) or 'distances' not in features or 'type' not in features:
            error_msg = f"Invalid features format for event ID: {event_id}. Got: {features}"
            errors.append(error_msg)
            continue
        
        # Save features to JSON file
        try:
            with open(features_file, 'w', encoding='utf-8') as f:
                json.dump(features, f, indent=2, ensure_ascii=False)
            processed += 1
        except Exception as e:
            error_msg = f"Failed to save features for event ID: {event_id}: {e}"
            errors.append(error_msg)
            continue
    
    # Summary
    print(f"\nFeature Extraction Summary:")
    print(f"- Processed: {processed} events")
    print(f"- Skipped (already exist): {skipped} events")
    print(f"- Errors: {len(errors)} events")
    
    # Output errors at the end
    if errors:
        print(f"\n{len(errors)} FEATURE EXTRACTION ERRORS:")
        print("=" * 60)
        for error in errors:
            print(f"ERROR: {error}")
    
    print("Done!")


if __name__ == "__main__":
    descriptions_dir = "descriptions"
    features_dir = "features"
    
    extract_features_for_all_descriptions(descriptions_dir, features_dir)