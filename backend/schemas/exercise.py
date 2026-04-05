from pydantic import BaseModel
from typing import Optional

class ExerciseBase(BaseModel):
    name: str
    description: Optional[str] = None
    video_url: Optional[str] = None
    mediapipe_pattern_data: Optional[str] = None

class ExerciseCreate(ExerciseBase):
    pass

class ExerciseResponse(ExerciseBase):
    exercise_id: int

    class Config:
        from_attributes = True