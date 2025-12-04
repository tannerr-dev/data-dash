#!/usr/bin/env python3
"""
Growing Company Sales Data Generator
Replaces sales numbers in item_data.json with realistic dummy data simulating a growing company:
- Overall upward trend across all products (60% growth over timeline)
- Product tier-based growth patterns (flagship to experimental products)
- Strong seasonal trends with enhanced holiday performance
- Natural variations and random noise
- Strategic product portfolios with different growth trajectories
- Random peaks and valleys representing marketing campaigns and market events
"""

import json
import random
import math
from datetime import datetime
from typing import Dict, List, Any


def generate_seasonal_multiplier(date_str: str) -> float:
    """Generate seasonal multiplier based on month"""
    # Parse date string like "2023-06-01T09:00:00"
    date = datetime.fromisoformat(
        date_str.replace("T", " ")[:-3]
    )  # Remove the trailing ":00"
    month = date.month

    # Growing company seasonal patterns - stronger growth periods
    seasonal_factors = {
        1: 1.2,  # January - New Year boost, Q1 planning
        2: 0.9,  # February - brief dip but recovering
        3: 1.1,  # March - Q1 end push
        4: 1.1,  # April - spring growth
        5: 1.2,  # May - spring momentum
        6: 1.4,  # June - summer launch season
        7: 1.5,  # July - peak summer performance
        8: 1.3,  # August - sustained summer
        9: 1.3,  # September - back-to-school/Q3 end
        10: 1.2,  # October - Q4 preparation
        11: 1.6,  # November - Black Friday/holiday prep
        12: 1.8,  # December - holiday peak for growing company
    }

    return seasonal_factors.get(month, 1.0)


def generate_trend_factor(index: int, total_points: int, trend_type: str) -> float:
    """Generate trend factor based on position in timeline"""
    progress = index / total_points

    if trend_type == "strong_growth":
        # Strong upward trend - startup/high-growth phase
        return 0.3 + (progress * 2.5) + (0.15 * math.sin(progress * 3 * math.pi))
    elif trend_type == "steady_growth":
        # Steady upward trend - mature growing company
        return 0.6 + (progress * 1.8) + (0.2 * math.sin(progress * 4 * math.pi))
    elif trend_type == "moderate_growth":
        # Moderate growth with some volatility
        return 0.8 + (progress * 1.2) + (0.25 * math.sin(progress * 5 * math.pi))
    elif trend_type == "stable":
        # Stable with slight upward bias
        return 1.0 + (progress * 0.4) + (0.3 * math.sin(progress * 6 * math.pi))
    elif trend_type == "declining":
        # Gradual downward trend (only for a few legacy products)
        return 1.4 - (progress * 0.8) + (0.15 * math.sin(progress * 3 * math.pi))
    elif trend_type == "volatile_growth":
        # High volatility but with overall growth trend
        return (
            0.7
            + (progress * 1.5)
            + (0.6 * math.sin(progress * 8 * math.pi))
            + (0.3 * math.sin(progress * 12 * math.pi))
        )
    else:
        return 1.0


def generate_random_peaks(index: int, total_points: int, num_peaks: int = 2) -> float:
    """Generate random peaks throughout the timeline"""
    peak_multiplier = 1.0

    for _ in range(num_peaks):
        # Random peak position
        peak_center = random.uniform(0.1, 0.9)
        peak_width = random.uniform(0.05, 0.15)
        peak_intensity = random.uniform(1.5, 3.0)

        progress = index / total_points
        distance = abs(progress - peak_center)

        if distance < peak_width:
            # Gaussian-like peak
            peak_factor = peak_intensity * math.exp(-((distance / peak_width) ** 2) * 4)
            peak_multiplier = max(peak_multiplier, peak_factor)

    return peak_multiplier


def generate_product_sales_data(
    existing_data: List[Dict], product_id: str
) -> List[Dict]:
    """Generate new sales data for a product while keeping existing dates"""

    # Assign different base ranges and growth patterns for a growing company
    product_num = int(product_id.split("_")[1]) if "_" in product_id else 1

    # Define product characteristics based on product tier
    if product_num <= 10:  # Top-tier products (flagship/main revenue drivers)
        product_profiles = {
            "base_range": (1200, 5000),
            "trend": random.choice(
                ["strong_growth", "steady_growth", "steady_growth"]
            ),  # Bias toward growth
            "volatility": random.uniform(
                0.15, 0.4
            ),  # Lower volatility for stable products
            "peak_probability": random.uniform(0.15, 0.35),
        }
    elif product_num <= 25:  # High-performing products
        product_profiles = {
            "base_range": (800, 3500),
            "trend": random.choice(
                ["steady_growth", "moderate_growth", "moderate_growth"]
            ),
            "volatility": random.uniform(0.2, 0.5),
            "peak_probability": random.uniform(0.2, 0.4),
        }
    elif product_num <= 50:  # Mid-tier products
        product_profiles = {
            "base_range": (400, 2000),
            "trend": random.choice(
                ["moderate_growth", "steady_growth", "volatile_growth"]
            ),
            "volatility": random.uniform(0.25, 0.6),
            "peak_probability": random.uniform(0.15, 0.45),
        }
    elif product_num <= 80:  # Growing products
        product_profiles = {
            "base_range": (200, 1200),
            "trend": random.choice(
                ["moderate_growth", "volatile_growth", "steady_growth"]
            ),
            "volatility": random.uniform(0.3, 0.7),
            "peak_probability": random.uniform(0.1, 0.4),
        }
    else:  # Niche/experimental products (some declining legacy products)
        product_profiles = {
            "base_range": (100, 800),
            "trend": random.choice(
                ["moderate_growth", "stable", "declining", "volatile_growth"]
            ),
            "volatility": random.uniform(0.4, 0.8),
            "peak_probability": random.uniform(0.05, 0.3),
        }

    base_min, base_max = product_profiles["base_range"]
    base_sales = random.randint(base_min, base_max)

    new_data = []
    total_points = len(existing_data)

    for i, entry in enumerate(existing_data):
        date_str = entry["date"]

        # Base sales with product-specific multiplier
        sales = base_sales

        # Apply seasonal effects
        seasonal_mult = generate_seasonal_multiplier(date_str)
        sales *= seasonal_mult

        # Apply product-specific trend
        trend_mult = generate_trend_factor(i, total_points, product_profiles["trend"])
        sales *= trend_mult

        # Apply company-wide growth factor (growing business)
        progress = i / total_points
        company_growth = 1.0 + (progress * 0.6)  # 60% overall growth over the timeline
        sales *= company_growth

        # Random peaks
        if random.random() < product_profiles["peak_probability"]:
            peak_mult = generate_random_peaks(i, total_points, random.randint(1, 3))
            sales *= peak_mult

        # Add random variation
        noise = random.uniform(
            1 - product_profiles["volatility"], 1 + product_profiles["volatility"]
        )
        sales *= noise

        # Ensure sales is a positive integer
        sales = max(1, int(sales))

        # Occasionally create dramatic spikes or drops for realism
        if random.random() < 0.03:  # 3% chance
            if random.random() < 0.5:
                sales *= random.uniform(2.0, 5.0)  # Spike
            else:
                sales *= random.uniform(0.1, 0.4)  # Drop

        sales = int(sales)

        new_data.append({"date": date_str, "sales": sales})

    return new_data


def main():
    # Read the original JSON file
    input_file = "data/item_data.json"
    output_file = "data/item_data.json"

    try:
        with open(input_file, "r") as f:
            data = json.load(f)

        print("Original data loaded successfully")
        print(f"Found {len(data)} products")

        # Generate new sales data for each product
        for product_id, product_data in data.items():
            print(f"Generating data for {product_id}...")
            data[product_id] = generate_product_sales_data(product_data, product_id)

        # Write the updated data back to the file
        with open(output_file, "w") as f:
            json.dump(data, f, indent=2)

        print(f"\nSales data successfully updated!")
        print(f"File saved to: {output_file}")

        # Print some statistics
        total_sales = 0
        for product_id, product_data in data.items():
            product_total = sum(entry["sales"] for entry in product_data)
            total_sales += product_total
            print(
                f"{product_id}: {len(product_data)} entries, total sales: {product_total:,}"
            )

        print(f"\nOverall total sales across all products: {total_sales:,}")

    except FileNotFoundError:
        print(f"Error: File '{input_file}' not found.")
        print("Please make sure the file exists in the correct location.")
    except json.JSONDecodeError:
        print(f"Error: Invalid JSON in '{input_file}'.")
    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    main()
