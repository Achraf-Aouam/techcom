# Smart Face Tracking for Attendance System

## Overview

This implementation solves the problem of sending too many API requests to your FastAPI backend by implementing **stateful face tracking** with **advanced face embedding duplicate detection**. Instead of sending a request for every frame where a face is detected, the system now:

1. **Tracks faces across frames** using position-based matching
2. **Confirms stability** by requiring faces to be present for multiple consecutive frames
3. **Generates face embeddings** using FaceNet model for accurate duplicate detection
4. **Sends only one request per person** when they first enter the frame
5. **Implements conservative similarity matching** to prevent false duplicates
6. **Uses session-based tracking** to prevent duplicate API calls

## How It Works

### Core Components

1. **TrackedFace Interface**: Maintains state for each detected person

   - `id`: Unique identifier for the face
   - `bbox`: Bounding box coordinates [x1, y1, x2, y2]
   - `stability`: Counter for consecutive frame detections
   - `status`: Current state ('tracking', 'confirmed', 'processed', 'cooldown')
   - `lastSeen`: Timestamp for cleanup purposes

2. **Face Detection**: Uses BlazeFace model for real-time face detection

   - Runs every 150ms for smooth tracking
   - Handles camera mirroring for front-facing cameras

3. **Face Matching**: Uses Intersection over Union (IoU) to match faces between frames

   - Threshold: 0.8 (configurable)
   - Handles camera movement and slight position changes

4. **Stability Confirmation**: Requires 12 consecutive frames (~1.8 seconds) before processing

   - Prevents false positives
   - Ensures person is actually present, not just a brief detection

5. **Face Embedding Generation**: Uses FaceNet model for 128-dimensional embeddings

   - Generates embeddings only for confirmed stable faces
   - Normalizes embeddings using L2 normalization for better comparison

6. **Duplicate Detection**: Multi-layer approach to prevent duplicate API calls

   - **Embedding Similarity**: 0.85 cosine similarity threshold (very strict)
   - **Session Tracking**: Tracks processed face IDs to prevent re-processing
   - **Conservative Approach**: Only blocks requests when very confident it's a duplicate

7. **Cooldown System**: Dynamic cooldown based on embedding processing time
   - Minimum 2 seconds, scales with processing time
   - Automatically resets after cooldown period

## Configuration Parameters

```typescript
// Face Tracking Configuration
const STABILITY_THRESHOLD = 12; // Frames required for confirmation (~1.8 seconds)
const IOU_THRESHOLD = 0.8; // Minimum overlap for face matching (strict)
const MAX_ABSENCE_TIME = 1000; // Remove faces absent for 1+ seconds

// Embedding & Duplicate Detection
const SIMILARITY_THRESHOLD = 0.85; // Very strict threshold for duplicate detection
const getCooldownPeriod = () => Math.max(2000, processingTime * 2); // Dynamic cooldown

// Camera Configuration
const videoConstraints = {
  width: 640,
  height: 480,
  facingMode: "user", // Always front camera for laptops
};
```

## Models Used

### **FaceNet Model (Primary)**

- **Purpose**: Face embedding generation for duplicate detection
- **Output**: 128-dimensional normalized embeddings
- **Performance**: ~50-200ms processing time per face
- **Accuracy**: High accuracy for face recognition tasks

### **BlazeFace Model**

- **Purpose**: Real-time face detection
- **Performance**: ~10-30ms per frame
- **Features**: Optimized for mobile/web deployment

## Visual Indicators

- **Yellow Box**: Face is being tracked (building stability)
- **Blue Box**: Face has been processed and sent to backend
- **Orange Box**: Face is in cooldown period

## Processing Flow

```
1. Face Detection (BlazeFace) → Every 150ms
2. Face Tracking (IoU Matching) → Match with existing tracked faces
3. Stability Check → Require 12 consecutive detections
4. Embedding Generation (FaceNet) → Generate 128-dim embedding
5. Duplicate Detection → Check similarity with known embeddings
6. Session Check → Verify not already processed this session
7. Backend Request → Send embedding data to API
8. Cooldown Period → Prevent immediate re-processing
```

## Integration with Your FastAPI Backend

### Test Mode (Current)

Set `testMode = true` to simulate backend requests without making actual API calls.

### Live Mode (Production)

1. Set `testMode = false` in the component
2. Update the API endpoint in `processFaceWithBackend`:

```typescript
const response = await fetch("/api/process-attendance-embedding", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify(backendPayload),
});
```

### Expected FastAPI Endpoint

Your backend should expect a JSON payload with face embedding data:

```json
{
  "embedding": [0.123, -0.456, ...], // 128-dimensional FaceNet embedding
  "modelName": "FaceNet",
  "event_id": "your_event_id",
  "face_id": "face_12345_abc"
}
```

Example FastAPI endpoint structure:

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List
import numpy as np

class AttendanceRequest(BaseModel):
    embedding: List[float]  # 128-dimensional FaceNet embedding
    modelName: str         # "FaceNet"
    event_id: str          # Event identifier
    face_id: str           # Unique face identifier

@app.post("/api/process-attendance-embedding")
async def process_attendance_embedding(request: AttendanceRequest):
    try:
        # 1. Convert embedding to numpy array
        embedding_vector = np.array(request.embedding)

        # 2. Query existing attendees using pgvector similarity search
        # SELECT student_id, embedding FROM attendees
        # ORDER BY embedding <-> %s LIMIT 1;

        # 3. Check similarity threshold (e.g., > 0.8 for match)
        # 4. If match found, mark attendance
        # 5. If no match, handle unknown person

        return {
            "success": True,
            "message": "Attendance processed",
            "student_id": "found_or_new_id",
            "similarity": 0.95,
            "action": "attendance_marked"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

## Benefits

1. **Reduces API Calls**: From ~100 calls per person to 1 call per person
2. **High Accuracy**: FaceNet embeddings provide robust face recognition
3. **Conservative Duplicate Detection**: Only blocks when very confident (0.85 similarity)
4. **Better UX**: Clear visual feedback showing tracking status
5. **Handles Edge Cases**: Person leaving/re-entering frame, camera movement
6. **Session Memory**: Prevents duplicate processing within the same session
7. **Configurable**: Easy to adjust thresholds based on your needs
8. **Efficient**: Sends embedding vectors instead of images (smaller payload)

## Duplicate Prevention Strategy

The system uses a **conservative approach** to duplicate detection:

### **Two-Layer Protection**

1. **Embedding Similarity**: 0.85 cosine similarity threshold (very strict)
2. **Session Tracking**: Tracks face IDs already processed this session

### **Philosophy: Better Safe Than Sorry**

- **High Threshold**: Only blocks duplicates when similarity > 0.85 (very confident)
- **Loose Matching**: Prefers occasional duplicates over missing legitimate attendees
- **Session Reset**: Clearing session allows everyone to be "new" again

### **When Duplicates Are Blocked**

- Same person returns within session AND similarity > 0.85
- Face ID already processed in current session

### **When Requests Go Through**

- First time seeing this person
- Similarity < 0.85 (could be different person)
- After session reset
- After long absence (cooldown expired)

## Monitoring

The UI shows real-time statistics:

- **Active**: Number of faces currently in frame
- **Processed**: Number of people sent to backend
- **Tracking**: Number of faces being tracked
- **Embedding Time**: FaceNet processing time per face
- **Cooldown**: Dynamic cooldown period based on processing time
- **Duplicate Detection**: Shows when duplicates are found with similarity scores

Individual face status is shown with colored bounding boxes and progress indicators.

## Testing

1. **Start the camera** - Click camera button to activate
2. **Model Loading** - Wait for BlazeFace and FaceNet models to load
3. **Position face** - Face appears in front of camera
4. **Stability Building** - Yellow box shows tracking progress (12 frames needed)
5. **Embedding Generation** - FaceNet generates 128-dim embedding
6. **Duplicate Check** - System checks against known faces (0.85 threshold)
7. **Backend Request** - If no duplicate, sends embedding to API
8. **Blue Box** - Indicates successful processing
9. **Cooldown** - Face enters cooldown period
10. **Re-detection** - Same face won't be processed again until cooldown expires

### **Testing Duplicate Detection**

- Same person: Should show duplicate message with similarity score
- Different people: Should process each person individually
- Session reset: Clears all memory, everyone becomes "new"

## Troubleshooting

### Face Not Being Detected

- Ensure good lighting conditions
- Face should be clearly visible and unobstructed
- Check console for BlazeFace detection logs
- Verify camera permissions are granted

### Multiple Detections for Same Person

- Increase `STABILITY_THRESHOLD` (currently 12) for stricter confirmation
- Increase `IOU_THRESHOLD` (currently 0.8) for stricter face matching
- Check if person is moving too much during detection

### False Duplicate Detection

- **Lower similarity threshold**: Change from 0.85 to 0.80 in `FaceEmbeddingService`
- **Current threshold is very strict**: Only blocks when very confident
- Check console logs for similarity scores

### Missing Legitimate People

- **Current setup is optimized to avoid this**: Conservative approach
- If still happening, lower similarity threshold further (e.g., 0.75)
- Check if people look very similar (twins, similar appearance)

### Performance Issues

- **FaceNet Processing**: ~50-200ms per face is normal
- **Memory Usage**: Embeddings are limited to 100 stored, then rotates
- **Detection Frequency**: 150ms intervals can be increased if needed

### Model Loading Issues

- Check internet connection for TensorFlow.js model downloads
- Clear browser cache if models fail to load
- Check console for detailed error messages

## Tuning Parameters

### **For More Strict Duplicate Detection** (fewer duplicates, might miss some people)

```typescript
// In FaceEmbeddingService
private readonly SIMILARITY_THRESHOLD = 0.90; // Increase from 0.85

// In processFaceWithBackend
const matchingPerson = faceEmbeddingService.findMatchingPerson(
  embeddingResult.embedding,
  0.90 // Increase threshold
);
```

### **For More Loose Duplicate Detection** (catch more people, more duplicates)

```typescript
// In FaceEmbeddingService
private readonly SIMILARITY_THRESHOLD = 0.75; // Decrease from 0.85

// In processFaceWithBackend
const matchingPerson = faceEmbeddingService.findMatchingPerson(
  embeddingResult.embedding,
  0.75 // Decrease threshold
);
```

### **For Faster Processing** (less accuracy)

```typescript
// Reduce stability requirement
const STABILITY_THRESHOLD = 8; // Down from 12

// Increase detection interval
detectionIntervalRef.current = setInterval(detectFaces, 200); // Up from 150ms
```

### **For Higher Accuracy** (slower processing)

```typescript
// Increase stability requirement
const STABILITY_THRESHOLD = 16; // Up from 12

// Decrease detection interval
detectionIntervalRef.current = setInterval(detectFaces, 100); // Down from 150ms

// Stricter IoU matching
const IOU_THRESHOLD = 0.9; // Up from 0.8
```

## Next Steps

1. **Test with multiple people** in various lighting conditions
2. **Integrate with your FastAPI backend** using the embedding endpoint
3. **Add error handling and retry logic** for network failures
4. **Implement attendance result display** showing who was detected
5. **Add user feedback** for successful/failed detections
6. **Consider adding face recognition results** from your database
7. **Implement real-time attendance list updates**
8. **Add authentication** and proper event management
9. **Optimize for your specific use case** by tuning thresholds
