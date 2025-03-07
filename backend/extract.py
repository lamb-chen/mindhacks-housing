import pandas as pd
import json

# Function to convert CSV data to JSON format
def csv_to_json(csv_file):
    # Read the CSV file
    df = pd.read_csv(csv_file)

    # Initialize an empty list to hold the results
    results = []

    # Group by both the year and county
    key = 'DCLG Planning Decisions Major and Minor Developments by category.'
    df['Year'] = df['DateCode'].str.split('-').str[0].str.split(' ').str[2]  # Extract year
    for (year, county_name), group in df.groupby(['Year', 'FeatureCode']):
        applied_major = group[group[key] == 'All-->Major']['Value'].sum()
        applied_minor = group[group[key] == 'All-->Minor']['Value'].sum()
        accepted_major = group[group[key] == 'Major-->Granted']['Value'].sum()
        accepted_minor = group[group[key] == 'Minor-->Granted']['Value'].sum()

        # Create a dictionary for each year and county
        year_data = {
            'county': str(county_name),
            'year': int(year),
            'appliedMajor': int(applied_major),
            'appliedMinor': int(applied_minor),
            'acceptedMajor': int(accepted_major),
            'acceptedMinor': int(accepted_minor)
        }

        # Append the year data to results
        results.append(year_data)

    return json.dumps(results, indent=2)

# Example usage
csv_file_path = 'download.csv'  # Replace with your CSV file path
json_output = csv_to_json(csv_file_path)
print(json_output)

# Save to file
with open('output.json', 'w') as f:
    f.write(json_output)
