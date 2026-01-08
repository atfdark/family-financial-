#!/usr/bin/env python3
"""
Python Virtual Environment Setup Script for Family Financial Tracker

This script creates a virtual environment, activates it, and installs all dependencies
from requirements_comprehensive.txt. It works across Windows, macOS, and Linux.

Usage:
    python setup_venv.py [--venv-name venv] [--requirements requirements_comprehensive.txt]
"""

import os
import sys
import subprocess
import argparse
import platform
from pathlib import Path


def print_header(title):
    """Print a formatted header."""
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")


def print_step(step_num, title, description=""):
    """Print a formatted step."""
    print(f"\n[Step {step_num}] {title}")
    if description:
        print(f"  {description}")


def run_command(cmd, description="", cwd=None):
    """
    Run a command and handle errors.
    
    Args:
        cmd: Command to run (list or string)
        description: Description of what this command does
        cwd: Working directory (optional)
    
    Returns:
        bool: True if command succeeded, False otherwise
    """
    if description:
        print(f"  Running: {description}")
    
    try:
        # Convert string to list if needed
        if isinstance(cmd, str):
            cmd = cmd.split()
        
        # Run the command
        result = subprocess.run(
            cmd, 
            cwd=cwd, 
            capture_output=True, 
            text=True, 
            check=True
        )
        
        if result.stdout:
            print(f"  Output: {result.stdout.strip()}")
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"  ERROR: Command failed with exit code {e.returncode}")
        if e.stdout:
            print(f"  STDOUT: {e.stdout}")
        if e.stderr:
            print(f"  STDERR: {e.stderr}")
        return False
    except FileNotFoundError:
        print(f"  ERROR: Command not found: {cmd[0]}")
        return False


def get_venv_path(venv_name):
    """Get the virtual environment path."""
    return Path.cwd() / venv_name


def get_activate_command(venv_path):
    """Get the activation command for the current platform."""
    system = platform.system().lower()
    
    if system == "windows":
        activate_script = venv_path / "Scripts" / "activate.bat"
        return str(activate_script)
    else:  # macOS/Linux
        activate_script = venv_path / "bin" / "activate"
        return f"source {activate_script}"


def create_virtual_environment(venv_name):
    """Create a virtual environment."""
    venv_path = get_venv_path(venv_name)
    
    print_step(1, "Creating Virtual Environment", f"Creating {venv_name} in {venv_path}")
    
    if venv_path.exists():
        print(f"  Virtual environment '{venv_name}' already exists. Skipping creation.")
        return True
    
    success = run_command(
        [sys.executable, "-m", "venv", venv_name],
        f"Creating virtual environment: {venv_name}"
    )
    
    if success:
        print(f"  [OK] Virtual environment created at: {venv_path}")
    else:
        print(f"  [ERROR] Failed to create virtual environment")
    
    return success


def install_requirements(venv_name, requirements_file):
    """Install requirements using the virtual environment's pip."""
    venv_path = get_venv_path(venv_name)
    
    print_step(2, "Installing Dependencies", f"Installing from {requirements_file}")
    
    # Determine pip path based on platform
    system = platform.system().lower()
    if system == "windows":
        pip_path = venv_path / "Scripts" / "pip.exe"
    else:
        pip_path = venv_path / "bin" / "pip"
    
    if not pip_path.exists():
        print(f"  ✗ pip not found at {pip_path}")
        return False
    
    success = run_command(
        [str(pip_path), "install", "-r", requirements_file],
        f"Installing requirements from {requirements_file}"
    )
    
    if success:
        print(f"  [OK] Dependencies installed successfully")
    else:
        print(f"  [ERROR] Failed to install dependencies")
        print(f"  Tip: Some packages may require additional system dependencies.")
        print(f"  Try installing individual packages or check the error messages above.")
    
    return success


def update_gitignore(venv_name):
    """Update .gitignore to include the virtual environment."""
    gitignore_path = Path(".gitignore")
    
    print_step(3, "Updating .gitignore", f"Adding {venv_name} to .gitignore")
    
    # Read current .gitignore content
    current_content = ""
    if gitignore_path.exists():
        with open(gitignore_path, "r") as f:
            current_content = f.read()
    
    # Check if venv is already in .gitignore
    if venv_name in current_content:
        print(f"  Virtual environment '{venv_name}' already in .gitignore")
        return True
    
    # Add venv to .gitignore
    with open(gitignore_path, "a") as f:
        f.write(f"\n# Virtual Environment\n{venv_name}/\n")
    
    print(f"  [OK] Added {venv_name}/ to .gitignore")
    return True


def create_activation_script(venv_name):
    """Create platform-specific activation scripts."""
    venv_path = get_venv_path(venv_name)
    activate_cmd = get_activate_command(venv_path)
    
    print_step(4, "Creating Activation Scripts")
    
    # Create activate.bat for Windows
    activate_bat = Path("activate_venv.bat")
    with open(activate_bat, "w") as f:
        f.write(f'@echo off\necho Activating virtual environment...\n"{activate_cmd}"\necho Virtual environment activated.\necho Run "python -m fastapi_backend.main" to start the server.\npause\n')
    
    # Create activate.sh for Unix-like systems
    activate_sh = Path("activate_venv.sh")
    with open(activate_sh, "w") as f:
        f.write(f'#!/bin/bash\necho "Activating virtual environment..."\n{activate_cmd}\necho "Virtual environment activated."\necho "Run python -m fastapi_backend.main to start the server."\nexec bash\n')
    
    # Make shell script executable
    if platform.system().lower() != "windows":
        os.chmod(activate_sh, 0o755)
    
    print(f"  [OK] Created activate_venv.bat")
    print(f"  [OK] Created activate_venv.sh")
    return True


def print_final_instructions(venv_name):
    """Print final instructions for using the virtual environment."""
    venv_path = get_venv_path(venv_name)
    activate_cmd = get_activate_command(venv_path)
    
    print_header("Setup Complete!")
    
    print("\n🎉 Virtual Environment Setup Complete!")
    print(f"\nVirtual Environment Location: {venv_path}")
    
    print("\n📋 Activation Instructions:")
    print(f"  Windows:    {activate_cmd}")
    print(f"  macOS/Linux: {activate_cmd}")
    
    print("\n🚀 Quick Start:")
    print("  1. Activate the virtual environment using the command above")
    print("  2. Start the FastAPI server:")
    print("     python -m fastapi_backend.main")
    print("  3. Open http://localhost:8000 in your browser")
    
    print("\n📁 Project Structure:")
    print("  fastapi_backend/     - FastAPI application")
    print("  api/                 - Vercel API functions")
    print("  public/              - Frontend files")
    
    print("\n🔧 Development Commands:")
    print("  Activate environment:  python setup_venv.py")
    print("  Run tests:            pytest")
    print("  Format code:          black .")
    print("  Check linting:        ruff check .")
    
    print("\n⚠️  Important Notes:")
    print("  - Always activate the virtual environment before running the application")
    print("  - The virtual environment is excluded from version control (.gitignore)")
    print("  - Use the provided activation scripts for convenience")
    
    print(f"\n✨ You're all set! Happy coding! ✨")


def main():
    """Main setup function."""
    parser = argparse.ArgumentParser(
        description="Setup Python virtual environment for Family Financial Tracker"
    )
    parser.add_argument(
        "--venv-name",
        default="venv",
        help="Name of the virtual environment (default: venv)"
    )
    parser.add_argument(
        "--requirements",
        default="requirements_comprehensive.txt",
        help="Requirements file to install (default: requirements_comprehensive.txt)"
    )
    
    args = parser.parse_args()
    
    print_header("Family Financial Tracker - Virtual Environment Setup")
    
    # Check if requirements file exists
    if not Path(args.requirements).exists():
        print(f"❌ Error: Requirements file '{args.requirements}' not found!")
        print("Please ensure you're running this script from the project root directory.")
        sys.exit(1)
    
    # Step 1: Create virtual environment
    if not create_virtual_environment(args.venv_name):
        sys.exit(1)
    
    # Step 2: Install requirements
    if not install_requirements(args.venv_name, args.requirements):
        sys.exit(1)
    
    # Step 3: Update .gitignore
    if not update_gitignore(args.venv_name):
        sys.exit(1)
    
    # Step 4: Create activation scripts
    if not create_activation_script(args.venv_name):
        sys.exit(1)
    
    # Print final instructions
    print_final_instructions(args.venv_name)


if __name__ == "__main__":
    main()