# Smart Face Tracking for Attendance System

## Overview

This implementation solves the problem of sending too many API requests to your FastAPI backend by implementing **stateful face tracking**. Instead of sending a request for every frame where a face is detected, the system now:

1. **Tracks faces across frames** using position-based matching
2. **Confirms stability** by requiring faces to be present for multiple consecutive frames
3. **Sends only one request per person** when they first enter the frame
4. **Implements cooldown periods** to prevent duplicate processing

## How It Works

### Core Components

1. **TrackedFace Interface**: Maintains state for each detected person

   - `id`: Unique identifier for the face
   - `bbox`: Bounding box coordinates [x1, y1, x2, y2]
   - `stability`: Counter for consecutive frame detections
   - `status`: Current state ('tracking', 'confirmed', 'processed', 'cooldown')
   - `lastSeen`: Timestamp for cleanup purposes

2. **Face Matching**: Uses Intersection over Union (IoU) to match faces between frames

   - Threshold: 0.5 (configurable)
   - Handles camera movement and slight position changes

3. **Stability Confirmation**: Requires 8 consecutive frames (~1.2 seconds) before processing

   - Prevents false positives
   - Ensures person is actually present, not just a brief detection

4. **Cooldown System**: 10-second cooldown after processing
   - Prevents duplicate API calls for the same person
   - Automatically resets after cooldown period

## Configuration Parameters

```typescript
const STABILITY_THRESHOLD = 8; // Frames required for confirmation
const COOLDOWN_PERIOD = 10000; // 10 seconds in milliseconds
const IOU_THRESHOLD = 0.5; // Minimum overlap for face matching
const MAX_ABSENCE_TIME = 2000; // Remove faces absent for 2+ seconds
```

## Visual Indicators

- **Yellow Box**: Face is being tracked (building stability)
- **Green Box**: Face is confirmed and ready for processing
- **Blue Box**: Face has been sent to backend
- **Orange Box**: Face is in cooldown period

## Integration with Your FastAPI Backend

### Test Mode (Current)

Set `testMode = true` to simulate backend requests without making actual API calls.

### Live Mode (Production)

1. Set `testMode = false` in the component
2. Update the API endpoint in `processFaceWithBackend`:

```typescript
const response = await fetch("http://localhost:8000/api/attendance/process", {
  method: "POST",
  body: formData,
  headers: {
    Authorization: `Bearer ${token}`, // if needed
  },
});
```

### Expected FastAPI Endpoint

Your backend should expect:

- `image`: Blob/File containing the cropped face image
- `event_id`: String identifying the event

Example FastAPI endpoint structure:

```python
@app.post("/api/attendance/process")
async def process_attendance(
    image: UploadFile = File(...),
    event_id: str = Form(...)
):
    # 1. Process the image to create embedding
    # 2. Store in pgvector
    # 3. Check against existing attendees
    # 4. Return result
    pass
```

## Benefits

1. **Reduces API Calls**: From ~100 calls per person to 1 call per person
2. **Improves Accuracy**: Stability confirmation reduces false positives
3. **Better UX**: Clear visual feedback showing tracking status
4. **Handles Edge Cases**: Person leaving/re-entering frame, camera movement
5. **Configurable**: Easy to adjust thresholds based on your needs

## Monitoring

The UI shows:

- **Active**: Number of faces currently in frame
- **Processed**: Number of people sent to backend
- **Tracking**: Number of faces being tracked

Individual face status is shown in the status panel with progress indicators.

## Testing

1. Start the camera
2. Position your face in front of the camera
3. Watch the yellow box appear (tracking)
4. Stay still for ~1.2 seconds
5. Box turns blue when sent to backend
6. Move away and return - face will be in cooldown
7. After 10 seconds, face can be processed again

## Troubleshooting

### Face Not Being Detected

- Ensure good lighting
- Face should be clearly visible
- Check console for detection logs

### Multiple Detections for Same Person

- Increase `STABILITY_THRESHOLD` for stricter confirmation
- Increase `COOLDOWN_PERIOD` for longer delays between processing

### Missing Faces

- Decrease `IOU_THRESHOLD` for more lenient matching
- Increase `MAX_ABSENCE_TIME` for handling brief occlusions

## Next Steps

1. Test with multiple people
2. Integrate with your FastAPI backend
3. Add error handling and retry logic
4. Consider adding face recognition results display
5. Implement attendance list updates
