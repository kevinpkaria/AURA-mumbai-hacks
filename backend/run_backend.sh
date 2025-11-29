#!/bin/bash

# Run AURA backend using conda environment
# This ensures the correct Python interpreter and packages are used

cd "$(dirname "$0")"

# Activate conda environment and use the correct Python
source /opt/anaconda3/etc/profile.d/conda.sh
conda activate aura

# Use the full path to conda's Python to bypass any shell aliases
/opt/anaconda3/envs/aura/bin/python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000


