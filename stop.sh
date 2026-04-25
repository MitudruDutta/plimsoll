#!/bin/bash
# Stop dev services for the Sully project.

echo "Stopping services..."

# Backend
pkill -f "start_server.py" 2>/dev/null
pkill -f "uvicorn.*main:app" 2>/dev/null

# Frontend (Next.js dev server)
pkill -f "next dev" 2>/dev/null
pkill -f "next-server" 2>/dev/null

# Backstop by port: 8000/8001 backend, 3000 Next.js
for port in 8000 8001 3000; do
    pids=$(lsof -ti:"$port" 2>/dev/null)
    if [ -n "$pids" ]; then
        echo "$pids" | xargs kill -9 2>/dev/null
    fi
done

sleep 1
echo "Services stopped"
