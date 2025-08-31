from pydantic import BaseModel, Field, field_validator
from typing import List, Optional

class Group(BaseModel):
    adults: int = 2
    kids: int = 0
    seniors: int = 0

class TimeWindows(BaseModel):
    dayStart: str = "09:30"   # HH:MM
    dayEnd: str = "20:30"     # HH:MM

class TripPlanRequest(BaseModel):
    city: str
    startDate: str           # YYYY-MM-DD
    endDate: str             # YYYY-MM-DD
    interests: List[str] = Field(default_factory=list)
    diet: Optional[str] = None
    pace: str = "moderate"   # relaxed|moderate|fast
    mobility: str = "walk-first"
    hotel: Optional[str] = None
    # Prefer coordinates if you have them
    startLat: Optional[float] = None
    startLng: Optional[float] = None
    group: Group = Group()
    timeWindows: TimeWindows = TimeWindows()
    budget: Optional[str] = "mid"

    @field_validator("pace")
    @classmethod
    def validate_pace(cls, v):
        allowed = {"relaxed", "moderate", "fast"}
        if v not in allowed: return "moderate"
        return v

class LatLng(BaseModel):
    lat: float
    lng: float

class Stop(BaseModel):
    name: str
    eloc: str | None = None
    lat: float
    lng: float
    arrive: str | None = None
    depart: str | None = None
    travel: dict | None = None
