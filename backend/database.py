from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Annotated
from bson import ObjectId
from datetime import datetime, timezone
import os

# PyObjectId type for MongoDB ObjectId handling
def validate_object_id(v):
    if isinstance(v, ObjectId):
        return str(v)
    if isinstance(v, str):
        return v
    raise ValueError("Invalid ObjectId")

PyObjectId = Annotated[str, validate_object_id]

class BaseDocument(BaseModel):
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)
    id: Optional[PyObjectId] = Field(default=None, alias="_id")

    @classmethod
    def from_mongo(cls, doc: dict):
        if doc is None:
            return None
        if "_id" in doc:
            doc["_id"] = str(doc["_id"])
        return cls(**doc)

    def to_mongo(self):
        d = self.model_dump(by_alias=True, exclude_none=True)
        if "id" in d and d["id"] is None:
            del d["id"]
        if "_id" in d and d["_id"] is None:
            del d["_id"]
        return d

# MongoDB connection singleton
_client = None
_db = None

def get_db():
    global _client, _db
    if _db is None:
        _client = AsyncIOMotorClient(os.environ["MONGO_URL"])
        _db = _client[os.environ["DB_NAME"]]
    return _db

def get_client():
    global _client
    if _client is None:
        get_db()
    return _client

# Document Models
class UserDoc(BaseDocument):
    email: str
    password_hash: str
    name: str
    role: str  # "super_admin" or "hostel_admin"
    hostel_id: Optional[str] = None
    phone: Optional[str] = None
    avatar: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class HostelDoc(BaseDocument):
    name: str
    code: str
    address: str
    city: str = "Bhubaneswar"
    state: str = "Odisha"
    phone: Optional[str] = None
    email: Optional[str] = None
    description: Optional[str] = None
    images: list = Field(default_factory=list)
    google_map_url: Optional[str] = None
    monthly_due_date: int = 5
    reminder_grace_days: int = 3
    follow_up_days: int = 7
    hostel_type: str = "mixed"  # mixed, boys, girls
    total_buildings: int = 0
    total_rooms: int = 0
    total_beds: int = 0
    occupied_beds: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RoomDoc(BaseDocument):
    hostel_id: str
    building_name: str = "Main Building"
    floor_number: int = 0
    room_number: str
    room_type: str = "bachelor"  # bachelor, family
    ac_type: str = "non_ac"  # ac, non_ac
    capacity: int = 1
    occupied: int = 0
    rent: float = 0
    electricity_rate: float = 8.0
    has_bathroom: bool = True
    has_balcony: bool = False
    status: str = "available"  # available, occupied, reserved, maintenance
    amenities: list = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BedDoc(BaseDocument):
    hostel_id: str
    room_id: str
    bed_number: str
    status: str = "available"  # available, occupied, reserved, maintenance
    resident_id: Optional[str] = None
    monthly_rent: float = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ResidentDoc(BaseDocument):
    hostel_id: str
    room_id: Optional[str] = None
    bed_id: Optional[str] = None
    name: str
    phone: str
    email: Optional[str] = None
    whatsapp: Optional[str] = None
    gender: str = "male"
    date_of_birth: Optional[str] = None
    occupation: Optional[str] = None
    workplace: Optional[str] = None
    guardian_name: Optional[str] = None
    guardian_phone: Optional[str] = None
    guardian_relation: Optional[str] = None
    permanent_address: Optional[str] = None
    id_type: Optional[str] = None
    id_number: Optional[str] = None
    photo_url: Optional[str] = None
    monthly_rent: float = 0
    security_deposit: float = 0
    due_date_override: Optional[int] = None
    check_in_date: Optional[str] = None
    check_out_date: Optional[str] = None
    agreement_start: Optional[str] = None
    agreement_end: Optional[str] = None
    status: str = "active"  # active, checked_out, archived
    room_number: Optional[str] = None
    bed_number: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RentPaymentDoc(BaseDocument):
    resident_id: str
    hostel_id: str
    resident_name: Optional[str] = None
    room_number: Optional[str] = None
    bed_number: Optional[str] = None
    month: int
    year: int
    amount: float
    status: str = "pending"  # pending, paid, overdue, partial
    paid_on: Optional[datetime] = None
    payment_mode: Optional[str] = None
    challan_sent_at: Optional[datetime] = None
    reminder_sent_at: Optional[datetime] = None
    follow_up_sent_at: Optional[datetime] = None
    receipt_number: Optional[str] = None
    notes: Optional[str] = None
    marked_by: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ActivityLogDoc(BaseDocument):
    user_id: Optional[str] = None
    user_name: Optional[str] = None
    hostel_id: Optional[str] = None
    action: str
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    details: Optional[str] = None
    metadata: dict = Field(default_factory=dict)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AutomationWorkflowDoc(BaseDocument):
    name: str
    description: Optional[str] = None
    trigger_type: str  # rent_paid, due_date, follow_up, new_enquiry, etc.
    actions: list = Field(default_factory=list)
    enabled: bool = True
    hostel_id: Optional[str] = None  # None = global
    config: dict = Field(default_factory=dict)
    last_run: Optional[datetime] = None
    run_count: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class EnquiryDoc(BaseDocument):
    hostel_id: Optional[str] = None
    name: str
    phone: str
    email: Optional[str] = None
    occupation: Optional[str] = None
    preferred_hostel: Optional[str] = None
    hostel_type: str = "bachelor"
    budget: Optional[float] = None
    move_in_date: Optional[str] = None
    message: Optional[str] = None
    status: str = "new"  # new, contacted, visited, converted, archived
    assigned_to: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
