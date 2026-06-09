from sqlalchemy import Column, Integer, Date, DateTime, String, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from db.database import Base


class Streak(Base):
    __tablename__ = "streaks"

    streak_id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.user_id"), unique=True, nullable=False, index=True)
    current_streak = Column(Integer, default=0, nullable=False)
    longest_streak = Column(Integer, default=0, nullable=False)
    last_activity_date = Column(Date, nullable=True)
    freeze_credits = Column(Integer, default=0, nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class StreakHistory(Base):
    __tablename__ = "streak_history"
    __table_args__ = (
        UniqueConstraint("patient_id", "activity_date", name="uq_streak_history_patient_date"),
    )

    history_id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.user_id"), nullable=False, index=True)
    activity_date = Column(Date, nullable=False, index=True)
    status = Column(String, default="completed", nullable=False)
    sessions_count = Column(Integer, default=0, nullable=False)
    streak_value = Column(Integer, default=0, nullable=False)
    has_assigned_tasks = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class AppNotification(Base):
    __tablename__ = "app_notifications"

    notification_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False, index=True)
    notification_type = Column(String, nullable=False)
    title = Column(String, nullable=False)
    body = Column(String, nullable=False)
    is_read = Column(Boolean, default=False, nullable=False)
    related_patient_id = Column(Integer, ForeignKey("patients.user_id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
