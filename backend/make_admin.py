import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

async def make_admin(email: str):
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    result = await db.users.update_one(
        {"email": email},
        {"$set": {"role": "admin"}}
    )
    
    if result.matched_count > 0:
        print(f"✓ Utente {email} promosso ad ADMIN (Narrazione)")
    else:
        print(f"✗ Utente {email} non trovato. Registrati prima su /register")
    
    client.close()

if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Uso: python make_admin.py <email>")
    else:
        asyncio.run(make_admin(sys.argv[1]))
