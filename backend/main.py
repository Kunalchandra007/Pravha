#!/usr/bin/env python3
"""
Main entry point for Railway deployment
This file helps Railway automatically detect how to start the FastAPI application
"""

import uvicorn
import os

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(
        "app_with_mongodb:app",
        host="0.0.0.0",
        port=port,
        reload=False,  # Disable reload in production
        log_level="info"
    )
