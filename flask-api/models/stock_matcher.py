"""
Enhanced stock name matcher for the RISKOS portfolio prediction system.
This module helps match user-provided stock names to actual stock data files.
"""
import os
import re
import pandas as pd
from typing import Dict, List, Optional, Tuple

class StockMatcher:
    def __init__(self, stock_data_path: str):
        """
        Initialize the StockMatcher with the path to stock data files.
        
        Args:
            stock_data_path: Directory containing stock CSV files
        """
        self.stock_data_path = stock_data_path
        self.stock_files = {}  # Maps normalized name to actual filename
        self.display_names = {}  # Maps normalized name to display name
        self._load_stock_files()
    
    def _normalize_stock_name(self, name: str) -> str:
        """
        Normalize stock name for consistent matching.
        
        Args:
            name: Stock name to normalize
            
        Returns:
            Normalized stock name
        """
        if not name:
            return ""
            
        # Convert to lowercase and remove spaces
        normalized = name.lower().replace(" ", "")
        
        # Handle special cases
        normalized = normalized.replace("&", "and")
        
        # Remove non-alphanumeric characters (except suffix separator)
        normalized = re.sub(r'[^a-z0-9.]', '', normalized)
        
        # Create variations with and without .NS suffix
        base_name = normalized.replace(".ns", "")
        
        return base_name
    
    def _load_stock_files(self) -> None:
        """
        Load all stock files from the data directory and build mapping dictionaries.
        """
        if not os.path.exists(self.stock_data_path):
            raise FileNotFoundError(f"Stock data directory not found: {self.stock_data_path}")
        
        csv_files = [f for f in os.listdir(self.stock_data_path) if f.endswith("_data.csv")]
        
        print(f"Found {len(csv_files)} stock data files")
        
        for filename in csv_files:
            # Extract stock symbol from filename (removing _data.csv)
            stock_symbol = filename[:-9]
            
            # Create different variations for matching
            base_symbol = stock_symbol.replace(".NS", "")
            
            # Store both with and without suffix for robust matching
            normalized_base = self._normalize_stock_name(base_symbol)
            normalized_full = self._normalize_stock_name(stock_symbol)
            
            # Add to mapping dictionaries
            # Keys: without .ns and with .ns so both forms are recognized
            self.stock_files[normalized_base] = filename
            self.stock_files[normalized_full] = filename
            
            # Store display name
            self.display_names[normalized_base] = stock_symbol
            self.display_names[normalized_full] = stock_symbol
    
    def get_matching_file(self, stock_name: str) -> Tuple[Optional[str], Optional[str]]:
        """
        Get the matching file path for a stock name.
        
        Args:
            stock_name: Stock name to match
            
        Returns:
            Tuple of (file_path, display_name) or (None, None) if no match
        """
        normalized = self._normalize_stock_name(stock_name)
        
        # Try direct match first
        if normalized in self.stock_files:
            file_path = os.path.join(self.stock_data_path, self.stock_files[normalized])
            return file_path, self.display_names[normalized]
            
        # If no match and it doesn't have .ns suffix, try with it
        if not normalized.endswith("ns"):
            with_suffix = normalized + "ns"
            if with_suffix in self.stock_files:
                file_path = os.path.join(self.stock_data_path, self.stock_files[with_suffix])
                return file_path, self.display_names[with_suffix]
                
        # If still no match, try a fuzzy match
        # (This is a simple implementation - you could use more sophisticated fuzzy matching)
        for key in self.stock_files:
            if normalized in key or key in normalized:
                file_path = os.path.join(self.stock_data_path, self.stock_files[key])
                return file_path, self.display_names[key]
                
        return None, None
    
    def get_stock_data(self, stock_name: str) -> Tuple[Optional[pd.DataFrame], Optional[str]]:
        """
        Get stock data for a given stock name.
        
        Args:
            stock_name: Stock name to get data for
            
        Returns:
            Tuple of (dataframe, display_name) or (None, None) if stock not found
        """
        file_path, display_name = self.get_matching_file(stock_name)
        
        if not file_path:
            print(f"No matching file found for stock: {stock_name}")
            return None, None
        
        try:
            # Read the CSV file
            df = pd.read_csv(file_path)
            
            # Clean up data
            df = df.dropna()  # Remove NaN values
            
            # Ensure we have the required columns
            if 'Date' not in df.columns or 'Close' not in df.columns:
                print(f"Missing required columns in {file_path}")
                return None, None
                
            return df, display_name
            
        except Exception as e:
            print(f"Error reading stock data for {stock_name} from {file_path}: {str(e)}")
            return None, None
    
    def list_available_stocks(self) -> List[str]:
        """
        Get a list of all available stock display names.
        
        Returns:
            List of stock display names
        """
        # Get unique display names
        return sorted(list(set(self.display_names.values())))


# Usage example
if __name__ == "__main__":
    import sys
    
    # Use command line argument or default path
    data_path = sys.argv[1] if len(sys.argv) > 1 else "./Scripts"
    
    # Create matcher
    matcher = StockMatcher(data_path)
    
    # List available stocks
    print("\nAvailable stocks:")
    for stock in matcher.list_available_stocks():
        print(f"  {stock}")
    
    # Test some stock names
    test_names = ["Reliance", "RELIANCE", "Reliance.NS", "RELIANCE.NS", 
                  "reliance", "reliance.ns", "TCS", "Tata Consultancy"]
    
    print("\nTesting stock matching:")
    for name in test_names:
        file_path, display_name = matcher.get_matching_file(name)
        match_status = "✓ Match found" if file_path else "✗ No match"
        print(f"Stock name: '{name}' -> {match_status}: {display_name if display_name else '-'}")
        
    # Interactive testing
    print("\nEnter stock names to test matching (or 'quit' to exit):")
    while True:
        user_input = input("> ")
        if user_input.lower() == 'quit':
            break
            
        file_path, display_name = matcher.get_matching_file(user_input)
        if file_path:
            print(f"Match found: {display_name} -> {os.path.basename(file_path)}")
        else:
            print(f"No match found for '{user_input}'")