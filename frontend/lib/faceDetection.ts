import * as blazeface from "@tensorflow-models/blazeface";

export interface Detection {
  topLeft: [number, number];
  bottomRight: [number, number];
  probability: number;
}

export interface TrackedFace {
  id: string;
  bbox: [number, number, number, number]; // [x1, y1, x2, y2]
  stability: number;
  lastSeen: number;
  status: "tracking" | "confirmed" | "processed" | "cooldown";
  processedAt?: number;
}

export interface FaceDetectionResult {
  predictions: Detection[];
  faceCount: number;
  trackedFaces: TrackedFace[];
  error?: string;
}

export interface TrackingConfig {
  stabilityThreshold: number;
  iouThreshold: number;
  cooldownPeriod: number;
  maxAbsenceTime: number;
}

/**
 * Helper function to calculate Intersection over Union (IoU) for bounding box matching
 */
function calculateIoU(boxA: number[], boxB: number[]): number {
  const [ax1, ay1, ax2, ay2] = boxA;
  const [bx1, by1, bx2, by2] = boxB;

  const x_inter1 = Math.max(ax1, bx1);
  const y_inter1 = Math.max(ay1, by1);
  const x_inter2 = Math.min(ax2, bx2);
  const y_inter2 = Math.min(ay2, by2);

  const inter_width = Math.max(0, x_inter2 - x_inter1);
  const inter_height = Math.max(0, y_inter2 - y_inter1);
  const inter_area = inter_width * inter_height;

  const boxA_area = (ax2 - ax1) * (ay2 - ay1);
  const boxB_area = (bx2 - bx1) * (by2 - by1);

  const union_area = boxA_area + boxB_area - inter_area;

  return union_area > 0 ? inter_area / union_area : 0;
}

/**
 * Detects faces in a video element using the provided BlazeFace model with tracking.
 * Draws bounding boxes and returns detection results with face tracking.
 */
export async function detectFacesInVideo({
  model,
  video,
  canvas,
  facingMode,
  trackedFaces = [],
  onFaceConfirmed,
  config,
}: {
  model: blazeface.BlazeFaceModel;
  video: HTMLVideoElement;
  canvas: HTMLCanvasElement;
  facingMode: "user" | "environment";
  trackedFaces?: TrackedFace[];
  onFaceConfirmed?: (
    faceId: string,
    bbox: [number, number, number, number]
  ) => void;
  config: TrackingConfig;
}): Promise<FaceDetectionResult> {
  console.log("🎬 detectFacesInVideo called with tracking");

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    console.log("❌ No canvas context");
    return { predictions: [], faceCount: 0, trackedFaces: [] };
  }

  if (video.readyState !== 4) {
    console.log("⏳ Video not ready, readyState:", video.readyState);
    return { predictions: [], faceCount: 0, trackedFaces };
  }

  // Set canvas dimensions to match video
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  try {
    console.log("🔍 Running face detection...");
    // Run face detection on the video element
    const predictions = (await model.estimateFaces(
      video,
      false
    )) as Detection[];

    console.log("🎯 Predictions received:", predictions.length);

    // Clear canvas and draw video frame
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw video frame on canvas (mirror for front camera)
    if (facingMode === "user") {
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
      ctx.restore();
    } else {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    }

    // Convert predictions to bounding boxes
    const currentPredictions = predictions.map((p) => {
      let [x1, y1] = p.topLeft;
      let [x2, y2] = p.bottomRight;

      // Adjust coordinates for mirrored front camera
      if (facingMode === "user") {
        const tempX1 = canvas.width - x2;
        const tempX2 = canvas.width - x1;
        x1 = tempX1;
        x2 = tempX2;
      }

      return {
        bbox: [x1, y1, x2, y2] as [number, number, number, number],
        matched: false,
        probability: p.probability,
      };
    });

    // Implement tracking logic
    const now = Date.now();
    const updatedTrackedFaces: TrackedFace[] = [];

    console.log(
      `🔍 Starting face matching. Existing tracked faces: ${trackedFaces.length}, Current detections: ${currentPredictions.length}`
    );

    // 1. Try to match existing tracked faces with current detections
    trackedFaces.forEach((trackedFace, index) => {
      let bestMatch = null;
      let maxIou = -1;

      console.log(
        `🎯 Trying to match tracked face ${trackedFace.id} (${index + 1}/${
          trackedFaces.length
        })`
      );

      for (const pred of currentPredictions) {
        if (!pred.matched) {
          const iou = calculateIoU(trackedFace.bbox, pred.bbox);
          console.log(
            `📊 IoU between tracked face and prediction: ${iou.toFixed(
              3
            )} (threshold: ${config.iouThreshold})`
          );
          if (iou > config.iouThreshold && iou > maxIou) {
            maxIou = iou;
            bestMatch = pred;
            console.log(`✅ Better match found with IoU: ${iou.toFixed(3)}`);
          }
        }
      }

      if (bestMatch) {
        console.log(
          `🔗 Matched tracked face ${trackedFace.id} with IoU: ${maxIou.toFixed(
            3
          )}`
        );
        bestMatch.matched = true;
        const newStability =
          trackedFace.status === "processed" ||
          trackedFace.status === "cooldown"
            ? trackedFace.stability
            : trackedFace.stability + 1;

        console.log(
          `📈 Face ${trackedFace.id} stability: ${trackedFace.stability} → ${newStability}`
        );

        // Check if face just became stable and ready for processing
        if (
          newStability >= config.stabilityThreshold &&
          trackedFace.status === "tracking" &&
          onFaceConfirmed
        ) {
          console.log(`✅ Person ${trackedFace.id} is stable. PROCESSING.`);

          // Call the backend processing function
          onFaceConfirmed(trackedFace.id, bestMatch.bbox);

          updatedTrackedFaces.push({
            ...trackedFace,
            bbox: bestMatch.bbox,
            lastSeen: now,
            stability: newStability,
            status: "processed",
            processedAt: now,
          });
        } else {
          // Update existing tracked face
          updatedTrackedFaces.push({
            ...trackedFace,
            bbox: bestMatch.bbox,
            lastSeen: now,
            stability: newStability,
          });
        }
      } else {
        console.log(`❌ No match found for tracked face ${trackedFace.id}`);
        // Face not found in current frame - keep if within absence time
        if (now - trackedFace.lastSeen <= config.maxAbsenceTime) {
          console.log(
            `⏳ Keeping face ${trackedFace.id} (absence time: ${
              now - trackedFace.lastSeen
            }ms)`
          );
          updatedTrackedFaces.push(trackedFace);
        } else {
          console.log(
            `👻 Person ${trackedFace.id} disappeared - removing from tracking`
          );
        }
      }
    });

    // 2. Add new, unmatched predictions as new tracked faces
    currentPredictions.forEach((pred) => {
      if (!pred.matched) {
        const newId = `face_${now}_${Math.random().toString(36).substr(2, 9)}`;
        console.log(
          `👋 New person detected: ${newId} at bbox [${pred.bbox
            .map((x) => x.toFixed(1))
            .join(", ")}]`
        );

        updatedTrackedFaces.push({
          id: newId,
          bbox: pred.bbox,
          stability: 1,
          lastSeen: now,
          status: "tracking",
        });
      }
    });

    // 3. Handle cooldown period - reset processed faces back to tracking after cooldown
    const finalTrackedFaces = updatedTrackedFaces.map((face) => {
      if (
        face.status === "processed" &&
        face.processedAt &&
        now - face.processedAt > config.cooldownPeriod
      ) {
        console.log(
          `🔄 Person ${face.id} cooldown expired - can be processed again`
        );
        return {
          ...face,
          status: "tracking" as const,
          stability: 0, // Reset stability to require confirmation again
          processedAt: undefined,
        };
      }
      return face;
    });

    // Draw bounding boxes for tracked faces
    finalTrackedFaces.forEach((trackedFace, index) => {
      const [x1, y1, x2, y2] = trackedFace.bbox;
      const width = x2 - x1;
      const height = y2 - y1;

      // Different colors based on status
      let color = "#ffff00"; // Yellow for tracking
      let label = `Tracking (${trackedFace.stability}/${config.stabilityThreshold})`;

      if (trackedFace.status === "confirmed") {
        color = "#00ff00"; // Green for confirmed
        label = "Confirmed";
      } else if (trackedFace.status === "processed") {
        color = "#0066ff"; // Blue for processed
        label = "Processed";
      } else if (trackedFace.status === "cooldown") {
        color = "#ff6600"; // Orange for cooldown
        label = "Cooldown";
      }

      // Draw bounding box
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(x1, y1, width, height);

      // Draw label with background
      ctx.fillStyle = color;
      ctx.fillRect(x1, y1 - 25, 200, 20);
      ctx.fillStyle = "#000000";
      ctx.font = "14px Arial";
      ctx.fillText(`${trackedFace.id.slice(-8)}: ${label}`, x1 + 2, y1 - 8);
    });

    console.log(
      `✅ Tracking complete: ${finalTrackedFaces.length} tracked faces, ${predictions.length} detections`
    );

    return {
      predictions,
      faceCount: predictions.length,
      trackedFaces: finalTrackedFaces,
    };
  } catch (err) {
    console.error("❌ Error in face detection:", err);
    return {
      predictions: [],
      faceCount: 0,
      trackedFaces,
      error: (err as Error).message,
    };
  }
}
