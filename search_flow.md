# Multilingual Search Index Logic Flow

To keep the application fast and data payloads lightweight, AgriLabour Point avoids runtime translations via heavy APIs. Instead, it utilizes a universal **Search Tag Index Mapping** database model.

## 1. Logic Pipeline

```
[ User Input Query ] 
  E.g. "टैक्टर" (Hindi) or "kaapni" (Marathi translit) or "harvesting" (English)
       │
       ▼
[ Normalization Step ]
  - Trim whitespaces, convert to lowercase
  - Remove stop words (e.g. "के लिए", "pajije", "want")
       │
       ▼
[ Synonym Keyword Mapper ]
  - Checks if query matches mapped key phrases in the local lookup table
  - Examples:
    * "टैक्टर", "ट्रॅक्टर", "tractor" ──> Maps to machinery category, subcategory 'tractor'
    * "कापणी", "कटाई", "harvest"    ──> Maps to skill tag 'harvesting'
       │
       ▼
[ Query Execution Path ]
  IF synonym matched:
     Search listings by resolved Category/Skill Tags + location check
  ELSE:
     Fuzzy string match index check on database description text
       │
       ▼
[ Local radius calculation (PostgreSQL SQL) ]
  SELECT * FROM listings WHERE ST_Distance(geom, user_geom) <= 10000;
```

## 2. In-Memory Translation Synonym Dictionary

The system uses a key-value mapping structure representing localized regional expressions:

```javascript
const keywordSynonymMap = {
    // Tractor synonyms mapping
    "tractor": { category: "machinery", item: "tractor" },
    "ट्रैक्टर": { category: "machinery", item: "tractor" }, // Hindi
    "ट्रॅक्टर": { category: "machinery", item: "tractor" }, // Marathi
    
    // Harvesting synonyms mapping
    "harvesting": { category: "labor", skill: "harvesting" },
    "कटाई": { category: "labor", skill: "harvesting" },      // Hindi
    "कापणी": { category: "labor", skill: "harvesting" },      // Marathi
    
    // Pesticide Spraying synonyms mapping
    "spraying": { category: "labor", skill: "spraying" },
    "छिड़काव": { category: "labor", skill: "spraying" },      // Hindi
    "फवारणी": { category: "labor", skill: "spraying" }       // Marathi
};
```

## 3. Database Execution Pattern

When a query is resolved to a universal tag, it executes the following query:

```sql
SELECT l.*, u.name 
FROM listings l
JOIN users u ON l.owner_id = u.id
LEFT JOIN laborer_skills ls ON u.id = ls.laborer_id
LEFT JOIN skills s ON ls.skill_id = s.id
WHERE 
    -- Tag matching logic
    (l.machinery_type = :resolved_item OR s.tag = :resolved_skill)
    AND 
    -- Geographic constraint (10,000 meters = 10km)
    ST_DWithin(l.geom, :user_location_geom, 10000)
ORDER BY ST_Distance(l.geom, :user_location_geom) ASC;
```
