from pydantic import BaseModel

class UserCreate(BaseModel):
    first_name: str
    last_name: str
    email: str
    password: str
    role: str

class UserResponse(BaseModel):
    user_id: int
    first_name: str
    last_name: str
    email: str
    role: str

    class Config:
        from_attributes = True