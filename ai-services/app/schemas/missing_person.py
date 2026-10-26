from pydantic import BaseModel


class MissingPersonResponse(BaseModel):
    id: str
    name: str
    age: int
    gender: str
    description: str | None = None
    last_seen_location: str
    missing_date: str
    image_url: str
    cloudinary_public_id: str
    status: str