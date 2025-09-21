#!/usr/bin/env python3
"""
Test script for advanced_forecasting.py
Tests the integration with the existing portfolio prediction system
"""

import sys
import os
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

# Add the current directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from models.advanced_forecasting import AdvancedForecaster, enhanced_portfolio_forecast, create_forecast_api_response

def test_basic_forecasting():
    """Test basic forecasting functionality"""
    print("Testing basic forecasting functionality...")
    
    # Create sample data
    np.random.seed(42)
    dates = pd.date_range(start='2023-01-01', periods=100, freq='D')
    returns = pd.Series(
        np.random.normal(0.001, 0.02, 100),  # 0.1% daily return, 2% volatility
        index=dates
    )
    
    forecaster = AdvancedForecaster()
    
    try:
        # Test simple trend forecast
        simple_forecast = forecaster.simple_trend_forecast(returns, 30)
        print(f"✓ Simple trend forecast: {len(simple_forecast)} predictions")
        
        # Test ensemble forecast
        ensemble_forecast = forecaster.ensemble_forecast(returns, 30)
        print(f"✓ Ensemble forecast: {len(ensemble_forecast)} predictions")
        
        # Test model availability
        availability = forecaster.get_model_availability()
        print(f"✓ Model availability: {availability}")
        
        return True
        
    except Exception as e:
        print(f"✗ Basic forecasting test failed: {e}")
        return False

def test_portfolio_forecast():
    """Test portfolio-level forecasting"""
    print("\nTesting portfolio-level forecasting...")
    
    # Create sample portfolio data
    portfolio_data = [
        {'stockName': 'RELIANCE', 'quantity': 10, 'buyPrice': 2500},
        {'stockName': 'TCS', 'quantity': 5, 'buyPrice': 3500},
        {'stockName': 'HDFC', 'quantity': 8, 'buyPrice': 1500}
    ]
    
    try:
        # Test API response creation
        response = create_forecast_api_response(portfolio_data, 30, 0.95)
        
        print(f"✓ API response status: {response['status']}")
        print(f"✓ Individual stocks: {len(response['individual_stocks'])}")
        print(f"✓ Portfolio summary keys: {list(response['portfolio_summary'].keys())}")
        
        return True
        
    except Exception as e:
        print(f"✗ Portfolio forecast test failed: {e}")
        return False

def test_data_validation():
    """Test data validation functionality"""
    print("\nTesting data validation...")
    
    forecaster = AdvancedForecaster()
    
    try:
        # Test with valid data
        valid_returns = pd.Series([0.01, 0.02, -0.01, 0.03, 0.005])
        cleaned = forecaster.validate_returns_data(valid_returns)
        print(f"✓ Valid data validation: {len(cleaned)} observations")
        
        # Test with invalid data
        try:
            invalid_returns = pd.Series([])
            forecaster.validate_returns_data(invalid_returns)
            print("✗ Should have failed with empty data")
            return False
        except ValueError:
            print("✓ Correctly rejected empty data")
        
        return True
        
    except Exception as e:
        print(f"✗ Data validation test failed: {e}")
        return False

def test_error_handling():
    """Test error handling and fallbacks"""
    print("\nTesting error handling...")
    
    forecaster = AdvancedForecaster()
    
    try:
        # Test with problematic data
        problematic_returns = pd.Series([np.nan, np.nan, 0.01, np.nan])
        
        # This should not crash and should use fallback
        forecast = forecaster.simple_trend_forecast(problematic_returns, 10)
        print(f"✓ Error handling: {len(forecast)} predictions generated")
        
        return True
        
    except Exception as e:
        print(f"✗ Error handling test failed: {e}")
        return False

def main():
    """Run all tests"""
    print("=" * 50)
    print("RISKOS Advanced Forecasting Test Suite")
    print("=" * 50)
    
    tests = [
        test_basic_forecasting,
        test_portfolio_forecast,
        test_data_validation,
        test_error_handling
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        if test():
            passed += 1
    
    print("\n" + "=" * 50)
    print(f"Test Results: {passed}/{total} tests passed")
    print("=" * 50)
    
    if passed == total:
        print("🎉 All tests passed! The advanced forecasting module is working correctly.")
        return True
    else:
        print("❌ Some tests failed. Please check the implementation.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
