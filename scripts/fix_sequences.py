#!/usr/bin/env python3
"""
Script to fix database sequences to prevent duplicate key violations
Run this script if you encounter sequence-related issues
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import fix_sequences

if __name__ == "__main__":
    print("Fixing database sequences...")
    fix_sequences()
    print("Done!")
