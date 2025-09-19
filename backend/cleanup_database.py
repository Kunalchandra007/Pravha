#!/usr/bin/env python3
"""
Database cleanup script to fix duplicate key issues
"""

import asyncio
import sys
import os

# Add backend directory to Python path
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

from database_config import db_config
from pymongo import MongoClient

async def cleanup_database():
    """Clean up database issues"""
    try:
        # Connect to database
        await db_config.connect_to_mongo()
        
        # Get users collection
        users_collection = db_config.database[db_config.USERS_COLLECTION]
        
        print("🔍 Checking for problematic user documents...")
        
        # Find documents with null username
        null_username_docs = []
        async for doc in users_collection.find({"username": None}):
            null_username_docs.append(doc)
        
        print(f"Found {len(null_username_docs)} documents with null username")
        
        # Find documents without username field
        no_username_docs = []
        async for doc in users_collection.find({"username": {"$exists": False}}):
            no_username_docs.append(doc)
        
        print(f"Found {len(no_username_docs)} documents without username field")
        
        # Fix documents by setting unique username based on email
        fixed_count = 0
        
        for doc in null_username_docs + no_username_docs:
            if 'email' in doc and doc['email']:
                base_username = doc['email'].split('@')[0]
                username = base_username
                
                # Check if username already exists, make it unique if needed
                counter = 1
                while await users_collection.find_one({"username": username, "_id": {"$ne": doc["_id"]}}):
                    username = f"{base_username}_{counter}"
                    counter += 1
                
                await users_collection.update_one(
                    {"_id": doc["_id"]},
                    {"$set": {"username": username}}
                )
                fixed_count += 1
                print(f"✅ Fixed username for {doc['email']} -> {username}")
        
        print(f"✅ Fixed {fixed_count} user documents")
        
        # Check for duplicate usernames after fix
        pipeline = [
            {"$group": {"_id": "$username", "count": {"$sum": 1}}},
            {"$match": {"count": {"$gt": 1}}}
        ]
        
        duplicates = []
        async for doc in users_collection.aggregate(pipeline):
            duplicates.append(doc)
        
        if duplicates:
            print(f"⚠️ Found {len(duplicates)} duplicate usernames:")
            for dup in duplicates:
                print(f"  - Username '{dup['_id']}' appears {dup['count']} times")
        else:
            print("✅ No duplicate usernames found")
        
        # List all indexes
        print("\n📋 Current indexes:")
        indexes = await users_collection.list_indexes().to_list(None)
        for idx in indexes:
            print(f"  - {idx['name']}: {idx.get('key', {})}")
        
        await db_config.close_mongo_connection()
        
    except Exception as e:
        print(f"❌ Cleanup failed: {str(e)}")
        return False
    
    return True

if __name__ == "__main__":
    success = asyncio.run(cleanup_database())
    sys.exit(0 if success else 1)