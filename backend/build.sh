#!/bin/bash
echo "Initializing Vercel Python Build Sequence..."

# Install all backend pip dependencies defined in requirements.txt
pip install -r requirements.txt

# Force SQLAlchemy to synchronize the PostgreSQL schema via Alembic
echo "Executing explicit Alembic PostgreSQL Migration (upgrade head)..."
python -m alembic upgrade head

echo "Backend Build Sequence Complete!"
