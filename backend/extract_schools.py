import pandas as pd
import json
import numpy as np

def school_capacity_csv_to_json(csv_file):
    df = pd.read_csv(csv_file)

    # Drop rows with missing nc_year_admission or admission_numbers
    df.dropna(subset=['nc_year_admission', 'admission_numbers', 'total_offers', 'used_capacity_percent'], inplace=True)

    results = []

    for _, row in df.iterrows():
        try:
            entry = {
                'localAuthority': row['la_name'],
                'region': row['region_name'],
                'schoolPhase': row['school_phase'],
                'yearAdmission': int(row['nc_year_admission']),
                'admissionNumbers': int(row['admission_numbers']),
                'totalOffers': int(row['total_offers']),
                'usedCapacityPercent': round(float(row['used_capacity_percent']), 2)
            }
            results.append(entry)
        except (ValueError, TypeError) as e:
            # Handle potential conversion issues
            print(f"Skipping row due to error: {e}, data: {row}")

    return json.dumps(results, indent=2)

# Example usage
csv_file_path = 'data/school_capacity_by_local_authority.csv'
json_output = school_capacity_csv_to_json(csv_file_path)

print(json_output)

with open('school_capacity_output.json', 'w') as f:
    f.write(json_output)
