from pymongo import MongoClient
from app.config import MONGODB_URL, DATABASE_NAME


client = MongoClient(MONGODB_URL)

db = client[DATABASE_NAME]


users_collection = db["users"]
missing_persons_collection = db["missing_persons"]
sightings_collection = db["sightings"]
messages_collection = db["messages"]

