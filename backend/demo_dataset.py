#!/usr/bin/env python3
"""
Demo Script for Dataset Builder
Shows different ways to use the dataset builder for various scenarios
"""

import subprocess
import sys
import time

def run_command(command, description):
    """Run a command and display the result"""
    print(f"\n{'='*60}")
    print(f"🚀 {description}")
    print(f"{'='*60}")
    print(f"Command: {command}")
    print("-" * 60)
    
    try:
        result = subprocess.run(command, shell=True, capture_output=True, text=True)
        print(result.stdout)
        if result.stderr:
            print("STDERR:", result.stderr)
        return result.returncode == 0
    except Exception as e:
        print(f"Error running command: {e}")
        return False

def main():
    """Main demo function"""
    print("🎯 Dataset Builder Demo for News Monitoring Desk")
    print("=" * 60)
    print("This demo shows different ways to use the dataset builder")
    print("for various development and testing scenarios.")
    
    # Demo scenarios
    scenarios = [
        {
            "name": "Small Test Dataset",
            "command": "python dataset_builder.py build 3 15 5",
            "description": "Perfect for quick testing and development"
        },
        {
            "name": "Medium Development Dataset", 
            "command": "python dataset_builder.py build 10 100 20",
            "description": "Good for feature development and testing"
        },
        {
            "name": "Large Production Test Dataset",
            "command": "python dataset_builder.py build 25 500 50", 
            "description": "For performance testing and demonstrations"
        }
    ]
    
    print("\n📋 Available Demo Scenarios:")
    for i, scenario in enumerate(scenarios, 1):
        print(f"  {i}. {scenario['name']} - {scenario['description']}")
    
    print("\n🔧 Utility Commands:")
    print("  - Show help: python dataset_builder.py help")
    print("  - View stats: python dataset_builder.py stats")
    print("  - Database status: python db_manager.py stats")
    
    # Interactive demo
    while True:
        print(f"\n{'='*60}")
        print("Choose a demo scenario (1-3) or 'q' to quit:")
        choice = input("Enter your choice: ").strip()
        
        if choice.lower() == 'q':
            print("👋 Demo completed!")
            break
            
        try:
            scenario_index = int(choice) - 1
            if 0 <= scenario_index < len(scenarios):
                scenario = scenarios[scenario_index]
                
                print(f"\n🎯 Running: {scenario['name']}")
                print(f"Description: {scenario['description']}")
                
                # Confirm before running
                confirm = input("Proceed? (y/n): ").strip().lower()
                if confirm == 'y':
                    success = run_command(scenario['command'], scenario['name'])
                    
                    if success:
                        print(f"\n✅ {scenario['name']} completed successfully!")
                        
                        # Show stats after generation
                        print("\n📊 Current Dataset Statistics:")
                        run_command("python dataset_builder.py stats", "Dataset Statistics")
                        
                        # Show database manager stats
                        run_command("python db_manager.py stats", "Database Manager Statistics")
                    else:
                        print(f"\n❌ {scenario['name']} failed!")
                else:
                    print("⏭️  Skipped.")
            else:
                print("❌ Invalid choice. Please enter 1-3 or 'q'.")
        except ValueError:
            print("❌ Invalid input. Please enter a number or 'q'.")
    
    print(f"\n{'='*60}")
    print("🎉 Demo completed! Your News Monitoring Desk now has")
    print("realistic sample data for testing and development.")
    print("=" * 60)

if __name__ == "__main__":
    main()
