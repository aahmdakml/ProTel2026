#!/bin/bash
cd ./Model
uv run uvicorn app.main:app --app-dir . --reload --port 8002
