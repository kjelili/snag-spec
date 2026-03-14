# Installation Fix for Python 3.13 on Windows

## Issue

When installing backend requirements on Windows with Python 3.13, two packages failed to build:
1. `psycopg2-binary==2.9.9` - Required PostgreSQL development tools
2. `Pillow==10.1.0` - Build error with Python 3.13

## Solution

Updated `backend/requirements.txt` to use more flexible version constraints that allow pip to find compatible pre-built wheels:

### Changes Made

1. **psycopg2-binary**: Changed from `==2.9.9` to `>=2.9.9`
   - Version 2.9.11 has pre-built wheels for Python 3.13 on Windows

2. **Pillow**: Changed from `==10.1.0` to `>=10.2.0`
   - Version 12.1.0 has pre-built wheels for Python 3.13 on Windows

3. **All other packages**: Changed from exact versions (`==`) to minimum versions (`>=`)
   - This allows pip to find compatible versions with pre-built wheels
   - Still maintains compatibility by specifying minimum versions

### Updated Requirements

The requirements file now uses flexible version constraints:
- `fastapi>=0.104.1`
- `uvicorn[standard]>=0.24.0`
- `sqlalchemy>=2.0.23`
- `alembic>=1.12.1`
- `psycopg2-binary>=2.9.9`
- `pydantic>=2.5.0`
- `pydantic-settings>=2.1.0`
- `python-dotenv>=1.0.0`
- `python-jose[cryptography]>=3.3.0`
- `passlib[bcrypt]>=1.7.4`
- `python-multipart>=0.0.6`
- `openai>=1.3.5`
- `pgvector>=0.2.4`
- `numpy>=1.26.0`
- `python-docx>=1.1.0`
- `reportlab>=4.0.0`
- `Pillow>=10.2.0`
- `email-validator>=2.1.0`
- `aiofiles>=23.2.0`

## Verification

After updating requirements, installation completed successfully:
```bash
pip install -r backend/requirements.txt
```

All packages installed with pre-built wheels - no compilation required.

## Notes

- Python 3.13 is very new, so some packages may not have pre-built wheels yet
- Using `>=` instead of `==` allows pip to find the best compatible version
- For production, consider pinning exact versions after testing
- All installed packages are compatible with the application code
