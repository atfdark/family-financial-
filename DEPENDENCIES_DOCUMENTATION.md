# Dependencies Documentation

## Overview

This document provides a comprehensive overview of all dependencies used in the Family Financial API project, organized by category and purpose.

## Core Application Dependencies

### Web Framework
- **fastapi==0.104.1**: Modern, fast web framework for building APIs with Python 3.7+ based on standard Python type hints
- **uvicorn[standard]==0.24.0**: Lightning-fast ASGI server for running FastAPI applications

### Data Validation and Configuration
- **pydantic==2.5.0**: Data validation and settings management using Python type annotations
- **pydantic-settings==2.1.0**: Settings management built on top of Pydantic, for loading configuration from environment variables

### Database and ORM
- **supabase==2.3.0**: Official Python client for Supabase, providing database operations and authentication
- **psycopg2-binary==2.9.9**: PostgreSQL adapter for Python, used for direct database connections

### Authentication and Security
- **python-jose[cryptography]==3.3.0**: JavaScript Object Signing and Encryption implementation for JWT token handling
- **passlib[bcrypt]==1.7.4**: Password hashing library with bcrypt support for secure password storage

### Request Handling
- **python-multipart==0.0.6**: Support for parsing multipart form data (file uploads)

### Environment Configuration
- **python-dotenv==1.0.0**: Loads environment variables from .env files

### HTTP Requests
- **requests==2.31.0**: HTTP library for making API calls to external services (used in test files and setup scripts)

## Development Dependencies

### Testing Framework
- **pytest==8.2.2**: Python testing framework for writing simple and scalable test cases
- **pytest-asyncio==0.23.6**: Plugin for pytest to support testing async/await code
- **httpx==0.27.0**: Modern HTTP client for Python, supports both sync and async requests (used for testing FastAPI applications)

### Code Quality Tools
- **black==24.4.2**: Uncompromising code formatter that ensures consistent code style
- **ruff==0.4.5**: Extremely fast Python linter that replaces multiple tools (flake8, isort, etc.)
- **mypy==1.9.0**: Static type checker that helps catch type-related errors

### Development Utilities
- **watchdog==3.0.0**: File system events monitoring for development reloading
- **ipython==8.26.0**: Enhanced interactive Python shell for development
- **rich==13.9.4**: Beautiful terminal output for better development experience
- **click==8.1.7**: Command line interface creation toolkit

### Production Monitoring
- **structlog==25.1.0**: Structured logging library for better log management in production

## Built-in Python Modules

The following modules are part of Python's standard library and don't need to be included in requirements files:

- **logging**: Logging framework for application logging
- **asyncio**: Asynchronous I/O, event loop, coroutines, and tasks
- **json**: JSON encoder and decoder
- **os**: Operating system interface
- **sys**: System-specific parameters and functions
- **pathlib**: Object-oriented filesystem paths
- **datetime**: Basic date and time types
- **typing**: Support for type hints
- **uuid**: UUID objects for generating unique identifiers

## Dependency Categories

### Production Dependencies
These are required for the application to run in production:
- fastapi, uvicorn, pydantic, pydantic-settings
- supabase, psycopg2-binary
- python-jose, passlib, python-multipart
- python-dotenv, requests

### Development Dependencies
These are used during development but not required in production:
- pytest, pytest-asyncio, httpx
- black, ruff, mypy
- watchdog, ipython, rich, click

### Optional Dependencies
These enhance the development or production experience but are not strictly required:
- structlog (for better logging in production)

## Installation Instructions

### Basic Installation
```bash
pip install -r requirements.txt
```

### Development Installation
```bash
pip install -r requirements.txt
pip install -r requirements-dev.txt
```

### Production Installation
```bash
pip install -r requirements.txt
```

## Version Management

All dependencies use pinned versions for reproducible builds. When updating dependencies:

1. Test thoroughly in development environment
2. Update version numbers in the appropriate requirements file
3. Run the full test suite
4. Consider backward compatibility

## Security Considerations

- All dependencies use specific versions to avoid unexpected updates
- Regular security audits should be performed using tools like `pip-audit`
- Consider using virtual environments to isolate dependencies
- Keep dependencies updated to receive security patches
- Note: `passlib[bcrypt]==1.7.4` relies on a compatible `bcrypt` package; we pin `bcrypt<5.0.0` in the requirements to avoid incompatibilities when upgrading libraries.

## Troubleshooting

### Common Issues

1. **ImportError**: Ensure you've installed the correct requirements file for your environment
2. **Version conflicts**: Use virtual environments to isolate project dependencies
3. **Missing dependencies**: Check that you've installed both main and development requirements if needed

### Getting Help

- Check the official documentation for each dependency
- Review the project's GitHub issues for known problems
- Use virtual environments to avoid system-wide dependency conflicts