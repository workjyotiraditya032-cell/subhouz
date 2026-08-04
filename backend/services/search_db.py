import sqlite3
import os
import json
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

DB_PATH = Path(__file__).parent.parent / "search_metadata.db"

INDIA_CENTER = (20.5937, 78.9629)

LOCATION_PRESETS = [
    ("Koramangala", 12.9352, 77.6245),
    ("Hitech City", 17.4435, 78.3772),
    ("Hinjewadi", 18.5912, 73.7389),
    ("Cyber City", 28.4950, 77.0895),
    ("Velachery", 12.9796, 80.2209),
    ("Bandra", 19.0596, 72.8295),
    ("Indiranagar", 12.9784, 77.6408),
    ("Gachibowli", 17.4401, 78.3489),
]

COLLEGE_PRESETS = [
    ("IISc Bengaluru", 13.0184, 77.5672),
    ("IIT Bombay", 19.1334, 72.9133),
    ("IIT Delhi", 28.5450, 77.1926),
    ("IIIT Hyderabad", 17.4455, 78.3489),
    ("Symbiosis International Pune", 18.5477, 73.7744),
]

LANDMARK_PRESETS = [
    ("Forum Mall Koramangala", 12.9345, 77.6113),
    ("Cyber Towers Hyderabad", 17.4504, 78.3811),
    ("Quadron Business Park Pune", 18.5950, 73.7320),
    ("DLF CyberHub Gurugram", 28.4952, 77.0888),
    ("Phoenix Marketcity Chennai", 12.9912, 80.2170),
]

PROPERTY_COORDS_MAPPING = {
    "Apex Elite Co-Living": {
        "lat": 12.9352,
        "lng": 77.6245,
        "area": "Koramangala",
        "city": "Bengaluru",
        "state": "Karnataka",
        "landmark": "Forum Mall Koramangala",
        "college": "IISc Bengaluru",
        "aliases": ["Apex Elite", "Apex Co-Living Koramangala"],
        "keywords": ["co-living stay", "student housing", "bengaluru pg", "koramangala stay"],
        "tags": ["co-ed", "professional", "bengaluru", "premium"],
        "facilities": ["Wi-Fi", "Food", "Gym Access", "CCTV", "Power Backup"],
        "gender": "mixed",
        "property_type": "Co-Living",
        "category": "Co-Living"
    },
    "Homely Havens Girls PG": {
        "lat": 17.4435,
        "lng": 78.3772,
        "area": "Hitech City",
        "city": "Hyderabad",
        "state": "Telangana",
        "landmark": "Cyber Towers",
        "college": "IIIT Hyderabad",
        "aliases": ["Homely Havens PG", "Homely Havens Hitech City"],
        "keywords": ["girls hostel", "student accommodation", "hyderabad pg", "pg near hitech city"],
        "tags": ["girls", "student", "hyderabad", "premium"],
        "facilities": ["Wi-Fi", "Food", "Laundry", "Attached Bathroom", "AC Rooms"],
        "gender": "girls",
        "property_type": "PG",
        "category": "PG"
    },
    "Grand Horizon Stays": {
        "lat": 18.5912,
        "lng": 73.7389,
        "area": "Hinjewadi",
        "city": "Pune",
        "state": "Maharashtra",
        "landmark": "Quadron Business Park",
        "college": "Symbiosis International Pune",
        "aliases": ["Grand Horizon PG", "Grand Horizon Hinjewadi"],
        "keywords": ["mixed hostel", "co-ed stay", "pune pg", "hinjewadi stay"],
        "tags": ["co-ed", "mixed", "pune", "spacious"],
        "facilities": ["Wi-Fi", "Gym Access", "Food", "Parking", "CCTV"],
        "gender": "mixed",
        "property_type": "Hostel",
        "category": "Residency"
    }
}

def get_connection():
    return sqlite3.connect(DB_PATH)

def generate_search_index(p: dict) -> str:
    """Compiles a list of searchable tags and tokens for index matching."""
    tokens = []
    
    tokens.append(p.get("name", ""))
    tokens.append(p.get("area", ""))
    tokens.append(p.get("city", ""))
    tokens.append(p.get("address", ""))
    
    gender = p.get("gender", "").lower()
    if gender == "girls":
        tokens.extend(["girls", "girl", "female", "women"])
    elif gender == "boys":
        tokens.extend(["boys", "boy", "male", "men"])
    elif gender == "mixed":
        tokens.extend(["mixed", "co-ed", "coed", "unisex"])
        
    tokens.extend(["hostel", "pg", "accommodation", "stay", "residency"])
    
    # Process dynamic list fields
    for field in ["nearby_colleges", "nearby_landmarks", "nearby_schools", "nearby_metro", "nearby_bus_stop", "aliases", "keywords", "tags", "facilities"]:
        val = p.get(field)
        if val:
            try:
                items = json.loads(val) if isinstance(val, str) else val
                if isinstance(items, list):
                    for item in items:
                        tokens.append(item)
                        tokens.append(f"near {item.lower()}")
                        tokens.append(f"pg near {item.lower()}")
                        tokens.append(f"hostel near {item.lower()}")
            except Exception:
                pass
                
    unique = list(set([t.lower().strip() for t in tokens if t]))
    return json.dumps(unique)

async def init_search_db(supabase_client=None):
    """Recreates database tables and seeds coordinates/advanced search indices."""
    logger.info("Initializing search SQLite database with Advanced Search Indexing...")
    conn = get_connection()
    cursor = conn.cursor()
    
    # Recreate tables to support advanced schema
    cursor.execute("DROP TABLE IF EXISTS property_metadata")
    cursor.execute("DROP TABLE IF EXISTS locations")
    cursor.execute("DROP TABLE IF EXISTS colleges")
    cursor.execute("DROP TABLE IF EXISTS landmarks")
    
    cursor.execute("""
    CREATE TABLE locations (
        name TEXT PRIMARY KEY,
        latitude REAL,
        longitude REAL
    )
    """)
    
    cursor.execute("""
    CREATE TABLE colleges (
        name TEXT PRIMARY KEY,
        latitude REAL,
        longitude REAL
    )
    """)
    
    cursor.execute("""
    CREATE TABLE landmarks (
        name TEXT PRIMARY KEY,
        latitude REAL,
        longitude REAL
    )
    """)
    
    cursor.execute("""
    CREATE TABLE property_metadata (
        hostel_id TEXT PRIMARY KEY,
        name TEXT,
        address TEXT,
        area TEXT,
        city TEXT,
        state TEXT,
        country TEXT,
        latitude REAL,
        longitude REAL,
        nearby_colleges TEXT,
        nearby_schools TEXT,
        nearby_landmarks TEXT,
        nearby_metro TEXT,
        nearby_bus_stop TEXT,
        aliases TEXT,
        keywords TEXT,
        tags TEXT,
        category TEXT,
        property_type TEXT,
        gender TEXT,
        facilities TEXT,
        search_index TEXT
    )
    """)
    
    cursor.executemany("INSERT INTO locations (name, latitude, longitude) VALUES (?, ?, ?)", LOCATION_PRESETS)
    cursor.executemany("INSERT INTO colleges (name, latitude, longitude) VALUES (?, ?, ?)", COLLEGE_PRESETS)
    cursor.executemany("INSERT INTO landmarks (name, latitude, longitude) VALUES (?, ?, ?)", LANDMARK_PRESETS)
    
    conn.commit()
    
    if supabase_client:
        try:
            res_hostels = await supabase_client.table("hostels").select("id", "name", "code", "address", "city", "state").execute()
            hostels = res_hostels.data or []
            
            for h in hostels:
                h_id = str(h["id"])
                name = h.get("name", "")
                
                mapped = PROPERTY_COORDS_MAPPING.get(name) or {
                    "lat": INDIA_CENTER[0],
                    "lng": INDIA_CENTER[1],
                    "area": "Central",
                    "landmark": "City Center",
                    "college": "University Hub",
                    "aliases": [],
                    "keywords": [],
                    "tags": [],
                    "facilities": [],
                    "gender": "mixed",
                    "property_type": "Hostel",
                    "category": "Hostel"
                }
                
                record = {
                    "name": name,
                    "address": h.get("address", mapped.get("address", "")),
                    "area": mapped.get("area", "Central"),
                    "city": h.get("city", mapped.get("city", "Bengaluru")),
                    "state": h.get("state", mapped.get("state", "Karnataka")),
                    "country": "India",
                    "latitude": mapped["lat"],
                    "longitude": mapped["lng"],
                    "nearby_colleges": json.dumps([mapped["college"]]),
                    "nearby_schools": json.dumps([mapped["landmark"]] if "Saraswati" in mapped["landmark"] else []),
                    "nearby_landmarks": json.dumps([mapped["landmark"]]),
                    "nearby_metro": json.dumps([]),
                    "nearby_bus_stop": json.dumps([]),
                    "aliases": json.dumps(mapped["aliases"]),
                    "keywords": json.dumps(mapped["keywords"]),
                    "tags": json.dumps(mapped["tags"]),
                    "category": mapped["category"],
                    "property_type": mapped["property_type"],
                    "gender": mapped["gender"],
                    "facilities": json.dumps(mapped["facilities"])
                }
                
                search_index = generate_search_index(record)
                
                cursor.execute("""
                INSERT INTO property_metadata (
                    hostel_id, name, address, area, city, state, country, latitude, longitude,
                    nearby_colleges, nearby_schools, nearby_landmarks, nearby_metro, nearby_bus_stop,
                    aliases, keywords, tags, category, property_type, gender, facilities, search_index
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    h_id, record["name"], record["address"], record["area"], record["city"], record["state"], record["country"],
                    record["latitude"], record["longitude"], record["nearby_colleges"], record["nearby_schools"],
                    record["nearby_landmarks"], record["nearby_metro"], record["nearby_bus_stop"], record["aliases"],
                    record["keywords"], record["tags"], record["category"], record["property_type"], record["gender"],
                    record["facilities"], search_index
                ))
            conn.commit()
            logger.info("Successfully seeded coordinates and advanced property search indices.")
        except Exception as e:
            logger.error(f"Failed to seed properties metadata dynamically: {e}")
            
    conn.close()

def save_or_update_property_metadata(hostel_id: str, name: str, address: str, city: str, state: str, updates: dict):
    """Updates property metadata dynamically and regenerates the search index."""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM property_metadata WHERE hostel_id = ?", (hostel_id,))
    existing = cursor.fetchone()
    
    if existing:
        cursor.execute("PRAGMA table_info(property_metadata)")
        cols = [c[1] for c in cursor.fetchall()]
        existing_dict = dict(zip(cols, existing))
        
        latitude = updates.get("latitude") if updates.get("latitude") is not None else existing_dict["latitude"]
        longitude = updates.get("longitude") if updates.get("longitude") is not None else existing_dict["longitude"]
        area = updates.get("area") or existing_dict["area"] or "Central"
        country = updates.get("country") or existing_dict["country"] or "India"
        
        nearby_colleges = json.dumps(updates.get("nearby_colleges")) if updates.get("nearby_colleges") is not None else existing_dict["nearby_colleges"]
        nearby_schools = json.dumps(updates.get("nearby_schools")) if updates.get("nearby_schools") is not None else existing_dict["nearby_schools"]
        nearby_landmarks = json.dumps(updates.get("nearby_landmarks")) if updates.get("nearby_landmarks") is not None else existing_dict["nearby_landmarks"]
        nearby_metro = json.dumps(updates.get("nearby_metro")) if updates.get("nearby_metro") is not None else existing_dict["nearby_metro"]
        nearby_bus_stop = json.dumps(updates.get("nearby_bus_stop")) if updates.get("nearby_bus_stop") is not None else existing_dict["nearby_bus_stop"]
        aliases = json.dumps(updates.get("aliases")) if updates.get("aliases") is not None else existing_dict["aliases"]
        keywords = json.dumps(updates.get("keywords")) if updates.get("keywords") is not None else existing_dict["keywords"]
        tags = json.dumps(updates.get("tags")) if updates.get("tags") is not None else existing_dict["tags"]
        facilities = json.dumps(updates.get("facilities")) if updates.get("facilities") is not None else existing_dict["facilities"]
        
        category = updates.get("category") or existing_dict["category"] or "Hostel"
        property_type = updates.get("property_type") or existing_dict["property_type"] or "Hostel"
        gender = updates.get("gender") or updates.get("hostel_type") or existing_dict["gender"] or "mixed"
    else:
        mapped = PROPERTY_COORDS_MAPPING.get(name) or {
            "lat": INDIA_CENTER[0],
            "lng": INDIA_CENTER[1],
            "area": "Central",
            "landmark": "City Center",
            "college": "University Hub"
        }
        latitude = updates.get("latitude") if updates.get("latitude") is not None else mapped["lat"]
        longitude = updates.get("longitude") if updates.get("longitude") is not None else mapped["lng"]
        area = updates.get("area") or mapped["area"]
        country = updates.get("country") or "India"
        
        nearby_colleges = json.dumps(updates.get("nearby_colleges") or [mapped.get("college", "University Hub")])
        nearby_schools = json.dumps(updates.get("nearby_schools") or [])
        nearby_landmarks = json.dumps(updates.get("nearby_landmarks") or [mapped.get("landmark", "City Center")])
        nearby_metro = json.dumps(updates.get("nearby_metro") or [])
        nearby_bus_stop = json.dumps(updates.get("nearby_bus_stop") or [])
        aliases = json.dumps(updates.get("aliases") or [])
        keywords = json.dumps(updates.get("keywords") or [])
        tags = json.dumps(updates.get("tags") or [])
        facilities = json.dumps(updates.get("facilities") or [])
        
        category = updates.get("category") or "Hostel"
        property_type = updates.get("property_type") or "Hostel"
        gender = updates.get("gender") or updates.get("hostel_type") or "mixed"

    record = {
        "name": name,
        "address": address,
        "area": area,
        "city": city,
        "gender": gender,
        "category": category,
        "nearby_colleges": nearby_colleges,
        "nearby_schools": nearby_schools,
        "nearby_landmarks": nearby_landmarks,
        "nearby_metro": nearby_metro,
        "nearby_bus_stop": nearby_bus_stop,
        "aliases": aliases,
        "keywords": keywords,
        "tags": tags,
        "facilities": facilities
    }
    search_index = generate_search_index(record)

    cursor.execute("""
    INSERT OR REPLACE INTO property_metadata (
        hostel_id, name, address, area, city, state, country, latitude, longitude,
        nearby_colleges, nearby_schools, nearby_landmarks, nearby_metro, nearby_bus_stop,
        aliases, keywords, tags, category, property_type, gender, facilities, search_index
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        hostel_id, name, address, area, city, state, country, latitude, longitude,
        nearby_colleges, nearby_schools, nearby_landmarks, nearby_metro, nearby_bus_stop,
        aliases, keywords, tags, category, property_type, gender, facilities, search_index
    ))
    
    conn.commit()
    conn.close()

def levenshtein_distance(s1: str, s2: str) -> int:
    if len(s1) > len(s2):
        s1, s2 = s2, s1
    distances = range(len(s1) + 1)
    for i2, c2 in enumerate(s2):
        distances_ = [i2+1]
        for i1, c1 in enumerate(s1):
            if c1 == c2:
                distances_.append(distances[i1])
            else:
                distances_.append(1 + min((distances[i1], distances[i1 + 1], distances_[-1])))
        distances = distances_
    return distances[-1]

def match_score(query: str, property_record: dict) -> float:
    """Tokenized weighted ranking and intent search logic."""
    q_tokens = [t.lower().strip() for t in query.split() if t.strip()]
    if not q_tokens:
        return 1.0

    score = 0.0
    
    name = property_record["name"].lower()
    area = property_record["area"].lower()
    address = property_record["address"].lower()
    city = property_record["city"].lower()
    category = property_record["category"].lower()
    gender = property_record["gender"].lower()
    
    colleges = json.loads(property_record["nearby_colleges"] or "[]")
    landmarks = json.loads(property_record["nearby_landmarks"] or "[]")
    aliases = json.loads(property_record["aliases"] or "[]")
    keywords = json.loads(property_record["keywords"] or "[]")
    tags = json.loads(property_record["tags"] or "[]")
    
    colleges_lower = [c.lower() for c in colleges]
    landmarks_lower = [l.lower() for l in landmarks]
    aliases_lower = [a.lower() for a in aliases]
    keywords_lower = [k.lower() for k in keywords]
    tags_lower = [t.lower() for t in tags]
    
    # 1. Check gender intent filters
    is_girls_query = any(t in ["girls", "girl", "female", "women"] for t in q_tokens)
    is_boys_query = any(t in ["boys", "boy", "male", "men"] for t in q_tokens)
    
    if is_girls_query and gender == "boys":
        return 0.0
    if is_boys_query and gender == "girls":
        return 0.0

    # 2. Score matches per query token
    for q_tok in q_tokens:
        if q_tok in ["near", "hostel", "pg", "stay", "accommodation", "residency"]:
            continue
            
        token_score = 0.0
        
        if q_tok in name:
            token_score = max(token_score, 100.0)
        if q_tok in area:
            token_score = max(token_score, 80.0)
        if any(q_tok in c for c in colleges_lower):
            token_score = max(token_score, 60.0)
        if any(q_tok in l for l in landmarks_lower):
            token_score = max(token_score, 50.0)
        if q_tok in address:
            token_score = max(token_score, 40.0)
        if q_tok in city:
            token_score = max(token_score, 30.0)
        if any(q_tok in t for t in tags_lower):
            token_score = max(token_score, 20.0)
        if any(q_tok in a for a in aliases_lower):
            token_score = max(token_score, 15.0)
        if any(q_tok in k for k in keywords_lower):
            token_score = max(token_score, 10.0)
            
        # Fuzzy logic (Levenshtein)
        all_matchable = [name, area] + colleges_lower + landmarks_lower
        for word in all_matchable:
            for w_part in word.split():
                if len(q_tok) >= 3 and len(w_part) >= 3:
                    dist = levenshtein_distance(q_tok, w_part)
                    if dist <= 1:
                        token_score = max(token_score, 5.0)
                    elif dist <= 2 and len(q_tok) >= 5:
                        token_score = max(token_score, 2.0)
                        
        score += token_score
        
    return score

def query_search_suggestions(query: str):
    """Retrieves suggestions based on index token matching."""
    conn = get_connection()
    cursor = conn.cursor()
    
    q_param = f"%{query}%"
    
    cursor.execute("SELECT name, latitude, longitude FROM locations WHERE name LIKE ? LIMIT 5", (q_param,))
    locations = [{"name": r[0], "latitude": r[1], "longitude": r[2]} for r in cursor.fetchall()]
    
    cursor.execute("SELECT name, latitude, longitude FROM colleges WHERE name LIKE ? LIMIT 5", (q_param,))
    colleges = [{"name": r[0], "latitude": r[1], "longitude": r[2]} for r in cursor.fetchall()]
    
    cursor.execute("SELECT name, latitude, longitude FROM landmarks WHERE name LIKE ? LIMIT 5", (q_param,))
    landmarks = [{"name": r[0], "latitude": r[1], "longitude": r[2]} for r in cursor.fetchall()]
    
    conn.close()
    
    return {
        "locations": locations,
        "colleges": colleges,
        "landmarks": landmarks
    }

def get_property_metadata(hostel_id: str):
    """Fetches full search profile for a single hostel."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM property_metadata WHERE hostel_id = ?", (hostel_id,))
    row = cursor.fetchone()
    
    if row:
        cursor.execute("PRAGMA table_info(property_metadata)")
        cols = [c[1] for c in cursor.fetchall()]
        conn.close()
        return dict(zip(cols, row))
    conn.close()
    return None

def get_all_property_metadata():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM property_metadata")
    rows = cursor.fetchall()
    conn.close()
    
    if not rows:
        return {}
        
    # Get columns
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(property_metadata)")
    cols = [c[1] for c in cursor.fetchall()]
    conn.close()
    
    return {r[0]: dict(zip(cols, r)) for r in rows}
