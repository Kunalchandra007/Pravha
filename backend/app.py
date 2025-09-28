#!/usr/bin/env python3
"""
Railway entry point for FastAPI application
This file helps Railway automatically detect and start the FastAPI app
"""

import uvicorn
import os

# Import the FastAPI app from the main module
from app_with_mongodb import app

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=port,
        reload=False,  # Disable reload in production
        log_level="info"
    )
