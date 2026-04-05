from pydantic import BaseModel
from typing import List

class PlanExerciseCreate(BaseModel):
    exercise_id: int
    reps_nr: int
    sets_nr: int

class RehabPlanCreate(BaseModel):
    patient_id: int
    title: str
    exercise: List[PlanExerciseCreate]

class RehabPlanResponse(BaseModel):
    rehab_id: int
    title: str
    is_active: bool

    class Config:
        from_attributes = True