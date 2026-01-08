# Family Financial Tracker - Virtual Environment Setup

This document provides instructions for setting up and using the Python virtual environment for the Family Financial Tracker project.

## Quick Setup

Run the setup script to automatically create the virtual environment and install all dependencies:

```bash
python setup_venv.py
```

This will:
- Create a virtual environment named `venv` in the project root
- Install all dependencies from `requirements_comprehensive.txt`
- Update `.gitignore` to exclude the virtual environment
- Create convenient activation scripts

## Manual Setup

If you prefer to set up manually or the script doesn't work:

### 1. Create Virtual Environment

```bash
# Create virtual environment
python -m venv venv
```

### 2. Activate Virtual Environment

**Windows:**
```bash
venv\Scripts\activate
```

**macOS/Linux:**
```bash
source venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements_comprehensive.txt
```

## Activation Instructions

### Using the Setup Script (Recommended)

After running `python setup_venv.py`, you can use the generated activation scripts:

**Windows:**
```bash
activate_venv.bat
```

**macOS/Linux:**
```bash
./activate_venv.sh
```

### Manual Activation

**Windows Command Prompt:**
```cmd
venv\Scripts\activate
```

**Windows PowerShell:**
```powershell
venv\Scripts\Activate.ps1
```

**macOS/Linux Terminal:**
```bash
source venv/bin/activate
```

## Project Structure

```
family-financial-tracker/
├── venv/                    # Virtual environment (excluded from git)
├── fastapi_backend/         # FastAPI application
│   ├── main.py             # Application entry point
│   ├── models.py           # Database models
│   ├── auth.py             # Authentication logic
│   └── routers/            # API endpoints
├── api/                     # Vercel API functions
├── public/                  # Frontend files
├── requirements_comprehensive.txt  # All dependencies
├── setup_venv.py           # Setup script
├── activate_venv.bat       # Windows activation script
├── activate_venv.sh        # Unix activation script
└── .gitignore             # Git ignore rules
```

## Running the Application

### FastAPI Backend

1. Activate the virtual environment
2. Navigate to the project root
3. Run the application:

```bash
python -m fastapi_backend.main
```

The API will be available at `http://localhost:8000`

### Frontend

The frontend files are in the `public/` directory. You can serve them using any static file server:

```bash
# Using Python's built-in server
python -m http.server 8080

# Using Node.js (if available)
npx serve public
```

## Development Tools

The project includes several development tools:

### Code Formatting
```bash
black .
```

### Linting
```bash
ruff check .
```

### Type Checking
```bash
mypy .
```

### Testing
```bash
pytest
```

## Dependencies

The project uses the following key dependencies:

- **FastAPI** - Web framework
- **Uvicorn** - ASGI server
- **Supabase** - Database and authentication
- **Pydantic** - Data validation
- **Python-Jose** - JWT authentication
- **Passlib** - Password hashing

See `requirements_comprehensive.txt` for the complete list.

## Troubleshooting

### Virtual Environment Not Found

If you get an error about the virtual environment not being found:

1. Ensure you're in the project root directory
2. Run the setup script: `python setup_venv.py`
3. Or create manually: `python -m venv venv`

### Activation Issues

**Windows:**
- Ensure you're using Command Prompt or PowerShell
- Check that the `venv\Scripts\activate.bat` file exists

**macOS/Linux:**
- Ensure the `venv/bin/activate` file exists
- Check file permissions: `chmod +x venv/bin/activate`

### Dependency Installation Issues

If dependencies fail to install:

1. Ensure you have Python 3.8+ installed
2. Update pip: `python -m pip install --upgrade pip`
3. Try installing individually: `pip install fastapi uvicorn[standard]`

### Port Already in Use

If port 8000 is already in use:

```bash
# Check what's using the port
lsof -i :8000  # macOS/Linux
netstat -ano | findstr :8000  # Windows

# Kill the process or use a different port
python -m fastapi_backend.main --port 8001
```

## Production Deployment

For production deployment, consider:

1. Using a production WSGI server like Gunicorn
2. Setting up environment variables for secrets
3. Configuring a reverse proxy (nginx)
4. Using a production database

See `VERCEL_DEPLOYMENT_GUIDE.md` for Vercel deployment instructions.

## Getting Help

If you encounter issues:

1. Check the troubleshooting section above
2. Review the error messages carefully
3. Ensure all dependencies are installed correctly
4. Verify your Python version is compatible
5. Check the project's issue tracker for similar problems