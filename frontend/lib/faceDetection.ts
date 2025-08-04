import * as blazeface from "@tensorflow-models/blazeface";

export interface Detection {
  topLeft: [number, number];
  bottomRight: [number, number];
  probability: number;
}

export interface FaceDetectionResult {
  predictions: Detection[];
  faceCount: number;
  error?: string;
}

/**
 * Detects faces in a video element using the provided BlazeFace model.
 * Draws bounding boxes and returns detection results.
 */
export async function detectFacesInVideo({
  model,
  video,
  canvas,
  facingMode,
}: {
  model: blazeface.BlazeFaceModel;
  video: HTMLVideoElement;
  canvas: HTMLCanvasElement;
  facingMode: "user" | "environment";
}): Promise<FaceDetectionResult> {
  console.log("🎬 detectFacesInVideo called");

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    console.log("❌ No canvas context");
    return { predictions: [], faceCount: 0 };
  }

  if (video.readyState !== 4) {
    console.log("⏳ Video not ready, readyState:", video.readyState);
    return { predictions: [], faceCount: 0 };
  }

  console.log("📐 Video dimensions:", video.videoWidth, "x", video.videoHeight);

  // Set canvas dimensions to match video
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  console.log("📐 Canvas dimensions set to:", canvas.width, "x", canvas.height);

  try {
    console.log("🔍 Running face detection...");
    // Run face detection on the video element
    const predictions = (await model.estimateFaces(
      video,
      false
    )) as Detection[];

    console.log("🎯 Predictions received:", predictions.length);
    console.log("🎯 Raw predictions:", predictions);

    // Clear canvas
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

    console.log("🖼️ Video frame drawn on canvas");

    // Draw bounding boxes for detected faces
    predictions.forEach((prediction, index) => {
      console.log(`🎯 Drawing face ${index + 1}:`, prediction);

      let [x1, y1] = prediction.topLeft;
      let [x2, y2] = prediction.bottomRight;

      // Adjust coordinates for mirrored front camera
      if (facingMode === "user") {
        const tempX1 = canvas.width - x2;
        const tempX2 = canvas.width - x1;
        x1 = tempX1;
        x2 = tempX2;
      }

      const width = x2 - x1;
      const height = y2 - y1;

      console.log(`📦 Bounding box ${index + 1}:`, { x1, y1, width, height });

      // Draw bounding box
      ctx.strokeStyle = "#00ff00";
      ctx.lineWidth = 3;
      ctx.strokeRect(x1, y1, width, height);

      // Draw face number and confidence
      ctx.fillStyle = "#00ff00";
      ctx.font = "16px Arial";
      ctx.fillText(
        `Face ${index + 1}: ${(prediction.probability * 100).toFixed(1)}%`,
        x1,
        y1 - 10
      );
    });

    console.log(
      "✅ Face detection complete, found:",
      predictions.length,
      "faces"
    );
    return { predictions, faceCount: predictions.length };
  } catch (err) {
    console.error("❌ Error in face detection:", err);
    return { predictions: [], faceCount: 0, error: (err as Error).message };
  }
}
