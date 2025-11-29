#!/bin/bash

# AURA Backend Setup Script

echo "🚀 Setting up AURA Backend Environment..."

# Check if conda is installed
if ! command -v conda &> /dev/null; then
    echo "❌ Conda is not installed. Please install Anaconda or Miniconda first."
    exit 1
fi

# Create conda environment
echo "📦 Creating conda environment 'aura'..."
conda create -n aura python=3.11 -y

# Activate environment and install dependencies
echo "📥 Installing Python dependencies..."
source "$(conda info --base)/etc/profile.d/conda.sh"
conda activate aura
cd "$(dirname "$0")"
pip install -r requirements.txt

# Check PostgreSQL
echo "🗄️  Checking PostgreSQL..."
if command -v psql &> /dev/null; then
    echo "✅ PostgreSQL found"
    
    # Try to create database
    if createdb aura_db 2>/dev/null; then
        echo "✅ Database 'aura_db' created successfully"
    else
        echo "⚠️  Database 'aura_db' might already exist or PostgreSQL is not running"
        echo "   You can create it manually with: createdb aura_db"
    fi
else
    echo "⚠️  PostgreSQL not found in PATH"
    echo "   Please install PostgreSQL and ensure it's in your PATH"
    echo "   Or create the database manually: createdb aura_db"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "To activate the environment, run:"
echo "  conda activate aura"
echo ""
echo "To start the backend, run:"
echo "  cd backend"
echo "  uvicorn main:app --reload"
echo ""
echo "Don't forget to:"
echo "  1. Copy .env.example to .env"
echo "  2. Update .env with your database URL and API keys"
echo "  3. Run migrations: alembic upgrade head"


