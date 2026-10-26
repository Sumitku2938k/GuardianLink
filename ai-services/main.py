from fastapi import FastAPI
from fastapi.responses import RedirectResponse
from starlette.middleware.sessions import SessionMiddleware
from app.database import users_collection
import os
from app.auth.security import create_access_token
from app.auth.google import oauth
from app.config import GOOGLE_REDIRECT_URI,JWT_SECRET_KEY
from app.database import client,  missing_persons_collection
from fastapi import FastAPI, UploadFile, File, HTTPException , Form,Request
import app.cloudinary_config
import cloudinary.uploader
import uuid
from fastapi import Header
from app.auth.security import verify_access_token
from ai.vector_db.search_embedding import (
    search_face,
    client as qdrant_client,
    COLLECTION_NAME
)
from ai.face.embedding import generate_embedding
from bson import ObjectId
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import Depends

import tempfile
from ai.vector_db.insert_embedding import insert_face_embedding

from ai.vector_db.search_embedding import search_face
from bson import ObjectId

from bson import ObjectId
from app.database import (
    client,
    users_collection,
    missing_persons_collection
)

from app.schemas.auth import (
    RegisterRequest,
    LoginRequest
)

from app.auth.security import (
    hash_password,
    verify_password,
    create_access_token
)

from app.database import client

app = FastAPI(
    title="Missing Person AI API",
    description="AI-powered missing person identification system",
    version="1.0.0"
)

app.add_middleware(
    SessionMiddleware,
    secret_key=JWT_SECRET_KEY
)






@app.get("/")
def root():
    return {
        "message": "Missing Person AI API is running"
    }


@app.get("/health")
def health_check():

    try:
        client.admin.command("ping")

        return {
            "status": "ok",
            "mongodb": "connected"
        }

    except Exception as e:

        return {
            "status": "error",
            "mongodb": "not connected",
            "error": str(e)
        }
@app.post("/upload_image")
async def upload_image(file: UploadFile = File(...)):
        try:
            result = cloudinary.uploader.upload(
            file.file,
            folder="missing-person-ai"
        )
            return {
                "message": "Image uploaded successfully",
                "image_url": result["secure_url"],
                "public_id": result["public_id"]

            }
        except Exception as e:
            raise HTTPException(
            status_code=500,
            detail=str(e)
        )
security = HTTPBearer()
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    token = credentials.credentials

    user_id = verify_access_token(token)

    if not user_id:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )

    user = users_collection.find_one({
        "_id": ObjectId(user_id)
    })

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    return user



@app.get("/auth/me")
def get_me(
    current_user = Depends(get_current_user)
):

    return {
        "id": str(current_user["_id"]),
        "name": current_user["name"],
        "email": current_user["email"],
        "role": current_user["role"],
        "auth_provider": current_user["auth_provider"]
    }



@app.post("/missing-persons")
async def create_missing_person(
    name: str = Form(...),
    age: int = Form(...),
    gender: str = Form(...),
    description: str = Form(None),
    last_seen_location: str = Form(...),
    missing_date: str = Form(...),
    file: UploadFile = File(...),
    current_user=Depends(get_current_user)
):
    temp_file = None

    try:

        # --------------------------------
        # 1. Validate image
        # --------------------------------

        allowed_types = [
            "image/jpeg",
            "image/png",
            "image/webp"
        ]

        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail="Only JPG, PNG and WEBP images are allowed"
            )

        # --------------------------------
        # 2. Save uploaded image temporarily
        # --------------------------------

        suffix = os.path.splitext(
            file.filename
        )[1]

        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=suffix
        ) as temp:

            temp_file = temp.name

            contents = await file.read()

            temp.write(contents)

        # --------------------------------
        # 3. Upload image to Cloudinary
        # --------------------------------

        with open(temp_file, "rb") as image_file:

            upload_result = cloudinary.uploader.upload(
                image_file,
                folder="missing-person-ai/missing-persons"
            )

        image_url = upload_result["secure_url"]
        public_id = upload_result["public_id"]

        # --------------------------------
        # 4. Create MongoDB document
        # --------------------------------

        person_data = {
            "parent_id": str(current_user["_id"]),
            "name": name,
            "age": age,
            "gender": gender,
            "description": description,
            "last_seen_location": last_seen_location,
            "missing_date": missing_date,
            "image_url": image_url,
            "cloudinary_public_id": public_id,
            "status": "missing"
        }

        # --------------------------------
        # 5. Insert into MongoDB
        # --------------------------------

        result = missing_persons_collection.insert_one(
            person_data
        )

        person_id = str(result.inserted_id)

        # --------------------------------
        # 6. Generate + insert face embedding
        # --------------------------------

        insert_face_embedding(
            temp_file,
            person_id
        )

        # --------------------------------
        # 7. Return response
        # --------------------------------

        return {
            "message": "Missing person profile created successfully",

            "person_id": person_id,

            "person": {
                "name": name,
                "age": age,
                "gender": gender,
                "description": description,
                "last_seen_location": last_seen_location,
                "missing_date": missing_date,
                "image_url": image_url,
                "cloudinary_public_id": public_id,
                "status": "missing"
            }
        }

    except HTTPException:
        raise

    except Exception as e:

        print(
            "CREATE MISSING PERSON ERROR:",
            repr(e)
        )

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    finally:

        # --------------------------------
        # 8. Delete temporary image
        # --------------------------------

        if temp_file and os.path.exists(
            temp_file
        ):
            os.remove(temp_file)


@app.delete("/missing-persons/{person_id}")
def delete_missing_person(
    person_id: str,
    current_user=Depends(get_current_user)
):
    try:

        # -----------------------------
        # 1. Find report
        # -----------------------------

        person = missing_persons_collection.find_one({
            "_id": ObjectId(person_id)
        })

        if not person:
            raise HTTPException(
                status_code=404,
                detail="Report not found"
            )

        # -----------------------------
        # 2. Check ownership
        # -----------------------------

        if person.get("parent_id") != str(current_user["_id"]):
            raise HTTPException(
                status_code=403,
                detail="You are not authorized to delete this report"
            )

        # -----------------------------
        # 3. Generate same Qdrant ID
        # -----------------------------

        qdrant_id = str(
            uuid.uuid5(
                uuid.NAMESPACE_URL,
                person_id
            )
        )

        # -----------------------------
        # 4. Delete face embedding
        # -----------------------------

        qdrant_client.delete(
            collection_name=COLLECTION_NAME,
            points_selector=[qdrant_id]
        )
        print("Qdrant embedding deleted:", qdrant_id)

        # -----------------------------
        # 5. Delete MongoDB report
        # -----------------------------

        result = missing_persons_collection.delete_one({
            "_id": ObjectId(person_id)
        })

        if result.deleted_count == 0:
            raise HTTPException(
                status_code=404,
                detail="Report not found"
            )

        # -----------------------------
        # 6. Success
        # -----------------------------

        return {
            "message": "Report and face embedding deleted successfully"
        }

    except HTTPException:
        raise

    except Exception as e:

        print(
            "DELETE MISSING PERSON ERROR:",
            repr(e)
        )

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

@app.post("/find-person")
async def find_person(
    file: UploadFile = File(...)
):

    temp_file = None

    try:

        # --------------------------------
        # 1. Validate image
        # --------------------------------

        allowed_types = [
            "image/jpeg",
            "image/png",
            "image/webp"
        ]

        if file.content_type not in allowed_types:

            raise HTTPException(
                status_code=400,
                detail="Only JPG, PNG and WEBP images are allowed"
            )

        # --------------------------------
        # 2. Save uploaded image temporarily
        # --------------------------------

        suffix = os.path.splitext(
            file.filename
        )[1]

        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=suffix
        ) as temp:

            temp_file = temp.name

            contents = await file.read()

            temp.write(contents)

        # --------------------------------
        # 3. Search face in Qdrant
        # --------------------------------

        results = search_face(
            temp_file,
            limit=5
        )

        # --------------------------------
        # 4. No results
        # --------------------------------

        if not results:

            return {
                "match_found": False,
                "message": "No matching missing person found"
            }

        # --------------------------------
        # 5. Get best match
        # --------------------------------

        best_match = results[0]

        similarity = float(
            best_match.score
        )

        missing_person_id = (
            best_match.payload
            .get("missing_person_id")
        )

        # --------------------------------
        # 6. Minimum similarity threshold
        # --------------------------------

        MATCH_THRESHOLD = 0.60

        if similarity < MATCH_THRESHOLD:

            return {
                "match_found": False,
                "similarity": similarity,
                "message": "No confident match found"
            }

        # --------------------------------
        # 7. Get missing person from MongoDB
        # --------------------------------

        

        person = missing_persons_collection.find_one(
            {
                "_id": ObjectId(
                    missing_person_id
                )
            }
        )
        parent_id = person.get("parent_id")

        parent = None

        if parent_id:

            parent = users_collection.find_one(
        {
            "_id": ObjectId(parent_id)
        }
    )

        

        if not person:

            return {
                "match_found": False,
                "similarity": similarity,
                "message": "Match found but missing person record was not found"
            }
        
        # --------------------------------
        # 8. Return result
        # --------------------------------

        return {
    "match_found": True,

    "similarity": similarity,

    "missing_person": {
        "id": str(person["_id"]),
        "name": person.get("name"),
        "age": person.get("age"),
        "gender": person.get("gender"),
        "description": person.get("description"),
        "last_seen_location": person.get(
            "last_seen_location"
        ),
        "missing_date": person.get(
            "missing_date"
        ),
        "image_url": person.get(
            "image_url"
        ),
        "status": person.get(
            "status"
        )
    },

    "parent": {
        "id": str(parent["_id"]) if parent else None,
        "name": parent.get("name") if parent else None,
        "email": parent.get("email") if parent else None,
        "phone": parent.get("phone") if parent else None
    }
}

    except HTTPException:
        raise

    except ValueError as e:

        raise HTTPException(
            status_code=400,
            detail=str(e)
        )

    except Exception as e:

        print(
            "FIND PERSON ERROR:",
            repr(e)
        )

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    finally:

        # --------------------------------
        # 9. Delete temporary image
        # --------------------------------

        if temp_file and os.path.exists(
            temp_file
        ):

            os.remove(temp_file)

@app.post("/auth/register")
def register_user(user: RegisterRequest):

    # Check existing email

    existing_user = users_collection.find_one(
        {"email": user.email}
    )

    if existing_user:

        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )


    # Hash password

    hashed_password = hash_password(
        user.password
    )


    # Create user document

    user_data = {
        "name": user.name,
        "email": user.email,
        "password": hashed_password,
        "phone": user.phone,
        "role": "parent",
        "auth_provider": "local"
    }


    # Insert into MongoDB

    result = users_collection.insert_one(
        user_data
    )


    return {
        "message": "User registered successfully",
        "user_id": str(result.inserted_id)
    }
@app.post("/auth/login")
def login_user(user: LoginRequest):

    existing_user = users_collection.find_one(
        {"email": user.email}
    )

    if not existing_user:

        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )


    password_correct = verify_password(
        user.password,
        existing_user["password"]
    )


    if not password_correct:

        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )


    access_token = create_access_token(
        str(existing_user["_id"])
    )


    return {
        "message": "Login successful",
        "access_token": access_token,
        "token_type": "bearer",

        "user": {
            "id": str(existing_user["_id"]),
            "name": existing_user["name"],
            "email": existing_user["email"],
            "role": existing_user["role"]
        }
    }
@app.get("/auth/google/login")
async def google_login(request: Request):
    return await oauth.google.authorize_redirect(
        request,
        GOOGLE_REDIRECT_URI
    )


@app.get("/auth/google/callback")
async def google_callback(request: Request):

    token = await oauth.google.authorize_access_token(request)

    userinfo = token["userinfo"]

    google_id = userinfo["sub"]
    email = userinfo["email"]
    name = userinfo.get("name")
    picture = userinfo.get("picture")

    existing_user = users_collection.find_one({
        "email": email
    })

    if not existing_user:

        user_data = {
            "name": name,
            "email": email,
            "phone": None,
            "role": "parent",
            "auth_provider": "google",
            "google_id": google_id,
            "profile_picture": picture
        }

        result = users_collection.insert_one(user_data)

        user_id = str(result.inserted_id)

    else:
        user_id = str(existing_user["_id"])

    access_token = create_access_token(user_id)

    return RedirectResponse(
        url=f"http://localhost:5173/?access_token={access_token}"
    )



