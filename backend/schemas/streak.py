from datetime import date, datetime
from pydantic import BaseModel


class StreakSummary(BaseModel):
    patient_id: int
    current_streak: int
    longest_streak: int
    last_activity_date: date | None = None
    active_days_this_month: int
    completed_today: bool
    is_at_risk_today: bool


class StreakDay(BaseModel):
    date: date
    status: str
    sessions_count: int = 0
    streak_value: int = 0
    has_assigned_tasks: bool = True


class StreakCalendar(BaseModel):
    patient_id: int
    year: int
    month: int
    active_days: int
    longest_streak: int
    current_streak: int
    days: list[StreakDay]


class AppNotificationResponse(BaseModel):
    notification_id: int
    notification_type: str
    title: str
    body: str
    is_read: bool
    related_patient_id: int | None = None
    created_at: datetime | None = None

    class Config:
        from_attributes = True
