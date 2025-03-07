import csv
import json


# Convert CSV data to JSON
data = []

csv_reader = csv.reader(open('homeownership.csv', 'r'))

# Define the headers
headers = [
    "Area code",
    "Area name",
    "Owned: Owns outright (number)",
    "Owned: Owns with a mortgage or loan or shared ownership (number)",
    "Rented: Social rented (number)",
    "Private rented or lives rent free (number)",
    "Owned: Owns outright (percent)",
    "Owned: Owns with a mortgage or loan or shared ownership (percent)",
    "Rented: Social rented (percent)",
    "Private rented or lives rent free (percent)"
]

# Process each row in the CSV
for row in csv_reader:
    # Create a dictionary for the row
    entry = {headers[i]: row[i].strip().strip('"') for i in range(len(headers))}
    # Convert numerical values from strings to appropriate types
    for key in entry:
        if key.endswith('(number)'):
            entry[key] = int(entry[key].replace(',', ''))
        elif key.endswith('(percent)'):
            entry[key] = float(entry[key])
    # Append the entry to the data list
    data.append(entry)

# Convert to JSON
json_output = json.dumps(data, indent=4)

# Save to a JSON file
with open('home_ownership.json', 'w') as f:
    f.write(json_output)