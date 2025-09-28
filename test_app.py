#!/usr/bin/env python3
"""
Simple Railway test app - no MongoDB required
"""

from fastapi import FastAPI
import uvicorn
import os

app = FastAPI(title="Pravha API Test")

@app.get("/")
async def root():
    return {"message": "Pravha API is running!", "status": "success"}

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "message": "Pravha API is working",
        "port": os.environ.get("PORT", 8000)
    }

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    print(f"🚀 Starting Pravha Test API on port {port}")
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=port,
        reload=False,
        log_level="info"
    )
