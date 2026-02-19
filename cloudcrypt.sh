#!/bin/bash

#export FILEMASTERKEY = ""

MODE=$1

if [ -z "$MODE" ]; then
    echo "Usage: ./cloudcrypt.sh [dev|deploy|build-frontend|serve-frontend]"
    exit 1
fi

if [ "$MODE" == "dev" ]; then
    echo "Starting in DEV mode..."
    export PORT=8443
    export CORS_ALLOWED_ORIGINS="http://localhost:5173"
    export VITE_API_URL="http://localhost:8443/api/"
    
    # Start Backend in background
    echo "Starting Backend..."
    cd Server
    go run main.go &
    BACKEND_PID=$!
    cd ..
    
    # Start Frontend
    echo "Starting Frontend..."
    cd Frontend
    npm run dev
    
    # Check if frontend exited, then kill backend
    kill $BACKEND_PID

elif [ "$MODE" == "deploy" ]; then
    echo "Starting in DEPLOY mode..."
    export PORT=8443
    export CORS_ALLOWED_ORIGINS="https://sc.rorocorp.org"
    export VITE_API_URL="https://apisc.rorocorp.org/api/"
    
    # Start Backend
    echo "Starting Backend..."
    cd Server
    go run main.go
    
elif [ "$MODE" == "build-frontend" ]; then
    echo "Building Frontend for DEPLOY..."
    export VITE_API_URL="https://apisc.rorocorp.org/api/"
    
    cd Frontend
    npm run build
    echo "Build complete. Files are in Frontend/dist"

elif [ "$MODE" == "serve-frontend" ]; then
    echo "Serving Frontend Build..."
    # You can specify a port if needed, e.g., -l 5000
    npx serve -s Frontend/dist

else
    echo "Invalid mode. Use 'dev', 'deploy', 'build-frontend' or 'serve-frontend'."
    exit 1
fi
