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

class PlanExerciseResponse(BaseModel):
    exercise_id: int
    name: str = ""
    reps_nr: int
    sets_nr: int

    class Config:
        from_attributes = True

class RehabPlanResponse(BaseModel):
    rehab_id: int
    patient_id: int
    title: str
    is_active: bool
    exercises: List[PlanExerciseResponse] = []

    class Config:
        from_attributes = True