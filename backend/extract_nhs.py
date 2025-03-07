import pandas as pd

def nhs_excel_to_json():
    data = pd.read_excel('data\\nhs.xlsx', sheet_name='Provider', header=13, usecols=['Provider Name', 'Provider Code', 'Total number of incomplete pathways'])
    data_json = data.to_json(orient='records', lines=False)
    with open('data\\nhs_data.json', 'w') as json_file:
        json_file.write(data_json)
    return data_json

nhs_excel_to_json()

