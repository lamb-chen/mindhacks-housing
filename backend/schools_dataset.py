import pandas as pd
import numpy as np

# Load dataset
df = pd.read_csv('data/schools_dataset.csv')

# Select relevant columns, including la_name
df_capacity = df[['la_name', 'region_name', 'school_phase', 'nc_year_admission',
                  'admission_numbers', 'schools_in_la_offer', 'schools_in_another_la_offer']].copy()

# Convert columns to numeric, coercing errors into NaN
df_capacity[['admission_numbers', 'schools_in_la_offer', 'schools_in_another_la_offer']] = df_capacity[
    ['admission_numbers', 'schools_in_la_offer', 'schools_in_another_la_offer']
].apply(pd.to_numeric, errors='coerce')

# Drop rows with NaN values in critical columns
df_capacity.dropna(subset=['admission_numbers', 'schools_in_la_offer', 'schools_in_another_la_offer'], inplace=True)

# Calculate total offers
df_capacity['total_offers'] = df_capacity['schools_in_la_offer'] + df_capacity['schools_in_another_la_offer']

# Calculate percentage of used capacity
df_capacity['used_capacity_percent'] = (df_capacity['total_offers'] / df_capacity['admission_numbers']) * 100

# Handle division by zero or infinite percentages
df_capacity.replace([np.inf, -np.inf], np.nan, inplace=True)
df_capacity.dropna(subset=['used_capacity_percent'], inplace=True)

# Group by local authority, region, school phase, and admission year
la_capacity_summary = df_capacity.groupby(['la_name', 'region_name', 'school_phase', 'nc_year_admission']).agg({
    'admission_numbers': 'sum',
    'total_offers': 'sum'
}).reset_index()

# Recalculate capacity percentages after grouping
la_capacity_summary['used_capacity_percent'] = (
    la_capacity_summary['total_offers'] / la_capacity_summary['admission_numbers']
) * 100

# Sort by highest used capacity
la_capacity_summary_sorted = la_capacity_summary.sort_values(
    by='used_capacity_percent', ascending=False
)

# Save detailed local authority-level results to CSV
la_capacity_summary_sorted.to_csv('data/school_capacity_by_local_authority.csv', index=False)

print("Output saved to school_capacity_by_la.csv")
