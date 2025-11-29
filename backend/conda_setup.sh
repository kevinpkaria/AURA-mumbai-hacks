#!/bin/bash

# Quick conda environment setup for AURA

echo "🔧 Setting up AURA conda environment..."

# Initialize conda
eval "$(conda shell.bash hook)"

# Create environment if it doesn't exist
if conda env list | grep -q "^aura "; then
    echo "✅ Conda environment 'aura' already exists"
else
    echo "📦 Creating conda environment 'aura' with Python 3.11..."
    conda create -n aura python=3.11 -y
fi

# Activate environment
echo "🔄 Activating conda environment..."
conda activate aura

# Install requirements
echo "📥 Installing Python packages..."
cd "$(dirname "$0")"
pip install --upgrade pip
pip install -r requirements.txt

echo ""
echo "✅ Conda environment setup complete!"
echo ""
echo "To activate the environment, run:"
echo "  conda activate aura"
echo ""
echo "To verify installation:"
echo "  python --version"
echo "  pip list | grep fastapi"


