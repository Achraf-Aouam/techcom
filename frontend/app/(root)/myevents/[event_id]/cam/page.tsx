"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";
import * as tf from "@tensorflow/tfjs";
import * as blazeface from "@tensorflow-models/blazeface";
import { detectFacesInVideo } from "@/lib/faceDetection";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Camera, CameraOff, Users, RotateCcw } from "lucide-react";

interface Detection {
  topLeft: [number, number];
  bottomRight: [number, number];
  probability: number;
}

interface TrackedFace {
  id: string;
  bbox: [number, number, number, number]; // [x1, y1, x2, y2]
  stability: number; // How many consecutive frames it's been seen
  lastSeen: number; // Timestamp
  status: "tracking" | "confirmed" | "processed" | "cooldown";
  processedAt?: number; // When it was processed for cooldown tracking
}

export default function AlternativeAttendancePage({
  params,
}: {
  params: Promise<{ event_id: string }>;
}) {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const trackedFacesRef = useRef<TrackedFace[]>([]);

  const [model, setModel] = useState<blazeface.BlazeFaceModel | null>(null);
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [detectionCount, setDetectionCount] = useState(0);
  const [trackedFaces, setTrackedFaces] = useState<TrackedFace[]>([]);
  const [processedCount, setProcessedCount] = useState(0); // Count of people sent to backend
  const [testMode, setTestMode] = useState(true); // Set to false when you have your backend ready
  const [error, setError] = useState<string>("");
  const [eventId, setEventId] = useState<string>("");
  const [multiplePersonsDetected, setMultiplePersonsDetected] = useState(false);

  // Tracking configuration
  const STABILITY_THRESHOLD = 12; // Requires 8 stable frames (~1.2 seconds at 150ms intervals)
  const COOLDOWN_PERIOD = 5000; // 10 seconds cooldown after processing
  const IOU_THRESHOLD = 0.8; // Intersection over Union threshold for matching
  const MAX_ABSENCE_TIME = 1000; // Remove faces that disappear for more than 2 seconds

  // Camera configuration - simplified for laptop webcam only
  const videoConstraints = {
    width: 640,
    height: 480,
    facingMode: "user", // Always use front camera for laptop
  };

  // Helper function to calculate Intersection over Union (IoU) for bounding box matching
  const calculateIoU = useCallback((boxA: number[], boxB: number[]): number => {
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
  }, []);

  // Helper function to crop face from video and convert to blob for backend
  const cropFaceImage = useCallback(
    async (bbox: number[], video: HTMLVideoElement): Promise<Blob | null> => {
      try {
        const [x1, y1, x2, y2] = bbox;
        const width = x2 - x1;
        const height = y2 - y1;

        // Create a temporary canvas to crop the face
        const tempCanvas = document.createElement("canvas");
        const tempCtx = tempCanvas.getContext("2d");
        if (!tempCtx) return null;

        tempCanvas.width = width;
        tempCanvas.height = height;

        // Draw the cropped face region
        tempCtx.drawImage(
          video,
          x1,
          y1,
          width,
          height, // Source rectangle
          0,
          0,
          width,
          height // Destination rectangle
        );

        // Convert to blob
        return new Promise((resolve) => {
          tempCanvas.toBlob(
            (blob) => {
              resolve(blob);
            },
            "image/jpeg",
            0.8
          );
        });
      } catch (error) {
        console.error("❌ Error cropping face:", error);
        return null;
      }
    },
    []
  );

  // Function to send face to backend for processing
  const processFaceWithBackend = useCallback(
    async (faceId: string, bbox: number[]) => {
      if (!webcamRef.current?.video) return;

      try {
        console.log(`🚀 Processing face ${faceId} with backend...`);

        if (testMode) {
          // Test mode - simulate backend request
          console.log(
            `🧪 TEST MODE: Simulating backend request for face ${faceId}`
          );
          await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate network delay
          console.log(`✅ TEST: Face ${faceId} processed successfully`);
          setProcessedCount((prev) => prev + 1);
          return;
        }

        const faceBlob = await cropFaceImage(bbox, webcamRef.current.video);
        if (!faceBlob) {
          console.error("❌ Failed to crop face image");
          return;
        }

        // Create FormData for the API request
        const formData = new FormData();
        formData.append("image", faceBlob, "face.jpg");
        formData.append("event_id", eventId);

        // TODO: Replace with your actual FastAPI backend endpoint
        // Example: const response = await fetch('http://localhost:8000/api/attendance/process', {
        const response = await fetch("/api/process-attendance", {
          method: "POST",
          body: formData,
          // Add any required headers for your FastAPI backend
          // headers: {
          //   'Authorization': `Bearer ${token}`, // if you need auth
          // },
        });

        if (response.ok) {
          const result = await response.json();
          console.log(`✅ Face ${faceId} processed successfully:`, result);
          setProcessedCount((prev) => prev + 1);

          // You can handle the response here, e.g.:
          // - Show success message
          // - Update attendance list
          // - Handle recognition results
        } else {
          console.error(
            `❌ Backend request failed for face ${faceId}:`,
            response.statusText
          );
          // Handle error case - maybe show a toast notification
        }
      } catch (error) {
        console.error(`❌ Error processing face ${faceId}:`, error);
        // Handle network errors
      }
    },
    [eventId, cropFaceImage, testMode]
  );

  // Await params on mount
  useEffect(() => {
    const getParams = async () => {
      const resolvedParams = await params;
      setEventId(resolvedParams.event_id);
    };
    getParams();
  }, [params]);

  // Load the BlazeFace model
  useEffect(() => {
    const loadModel = async () => {
      try {
        setIsModelLoading(true);
        await tf.ready();
        const loadedModel = await blazeface.load();
        setModel(loadedModel);
        setIsModelLoading(false);
        console.log("✅ BlazeFace model loaded successfully");
      } catch (err) {
        console.error("❌ Error loading model:", err);
        setError("Failed to load face detection model");
        setIsModelLoading(false);
      }
    };

    loadModel();
  }, []);

  // Start continuous face detection
  const startFaceDetection = useCallback(() => {
    console.log("🚀 Starting face detection...");
    console.log("🤖 Model ready:", !!model);
    if (detectionIntervalRef.current) {
      console.log("🔄 Clearing existing interval");
      clearInterval(detectionIntervalRef.current);
    }
    detectionIntervalRef.current = setInterval(() => {
      console.log("⏰ Detection interval tick");
      // @ts-ignore: detectFaces is defined later
      detectFaces();
    }, 150); // Detect every 150ms
    console.log("✅ Face detection interval started");
  }, [model]);

  // Handle camera ready callback
  const onUserMedia = useCallback(() => {
    console.log("📹 Camera is ready!");
    console.log("🔍 Model loaded:", !!model);
    console.log("🎥 Webcam ref:", !!webcamRef.current);
    console.log("🖼️ Canvas ref:", !!canvasRef.current);
    setIsCameraActive(true);
    setError("");

    // Add a small delay to ensure video is fully loaded
    setTimeout(() => {
      console.log("⏰ Starting face detection after delay...");
      startFaceDetection();
    }, 1000);
  }, [model, startFaceDetection]);

  // Handle camera error callback
  const onUserMediaError = useCallback((error: string | DOMException) => {
    console.error("❌ Camera error:", error);
    setError("Failed to access camera. Please check permissions.");
    setIsCameraActive(false);
  }, []);

  // Function to detect faces with tracking logic
  const detectFaces = useCallback(async () => {
    if (!model || !webcamRef.current || !canvasRef.current) {
      return;
    }

    const webcam = webcamRef.current;
    const video = webcam.video;
    const canvas = canvasRef.current;

    if (!video || !canvas || video.readyState !== 4) {
      return;
    }

    try {
      // Get face detections from the updated detection function using ref for current tracked faces
      const result = await detectFacesInVideo({
        model,
        video,
        canvas,
        facingMode: "user",
        trackedFaces: trackedFacesRef.current,
        onFaceConfirmed: processFaceWithBackend,
        config: {
          stabilityThreshold: STABILITY_THRESHOLD,
          iouThreshold: IOU_THRESHOLD,
          cooldownPeriod: COOLDOWN_PERIOD,
          maxAbsenceTime: MAX_ABSENCE_TIME,
        },
      });

      // Check if multiple people are detected
      if (result.faceCount > 1) {
        console.log(
          `⚠️ Multiple people detected (${result.faceCount}). Clearing tracking.`
        );

        // Clear all tracking data
        trackedFacesRef.current = [];
        setTrackedFaces([]);
        setFaceDetected(false);
        setDetectionCount(0);
        setMultiplePersonsDetected(true);

        // Clear the canvas and just show the video
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          // Always mirror for front camera (user mode)
          ctx.save();
          ctx.scale(-1, 1);
          ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
          ctx.restore();

          // Draw warning message on canvas
          ctx.fillStyle = "rgba(255, 0, 0, 0.8)";
          ctx.fillRect(0, 0, canvas.width, 80);
          ctx.fillStyle = "#FFFFFF";
          ctx.font = "bold 24px Arial";
          ctx.textAlign = "center";
          ctx.fillText("⚠️ ONE PERSON AT A TIME PLEASE", canvas.width / 2, 35);
          ctx.font = "16px Arial";
          ctx.fillText(
            `${result.faceCount} people detected - Please ensure only one person is visible`,
            canvas.width / 2,
            60
          );
        }

        return;
      } else {
        // Reset multiple persons warning if only 0 or 1 person detected
        setMultiplePersonsDetected(false);
      }

      // Update both ref and state
      trackedFacesRef.current = result.trackedFaces;
      setTrackedFaces(result.trackedFaces);

      // Update UI state
      const currentlyDetected = result.faceCount > 0;
      setFaceDetected(currentlyDetected);
      setDetectionCount(result.faceCount);

      if (result.error) {
        console.error("❌ Error during face detection:", result.error);
      }
    } catch (error) {
      console.error("❌ Error in detectFaces:", error);
    }
  }, [
    model,
    processFaceWithBackend,
    STABILITY_THRESHOLD,
    IOU_THRESHOLD,
    COOLDOWN_PERIOD,
    MAX_ABSENCE_TIME,
  ]);

  // ...existing code...

  // Stop face detection
  const stopFaceDetection = () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
  };

  // Toggle camera on/off
  const toggleCamera = () => {
    if (isCameraActive) {
      setIsCameraActive(false);
      setFaceDetected(false);
      setTrackedFaces([]); // Clear tracked faces when stopping camera
      trackedFacesRef.current = []; // Also clear the ref
      setMultiplePersonsDetected(false); // Clear multiple persons warning
      stopFaceDetection();
    } else {
      setIsCameraActive(true);
    }
  };

  // Reset detection count and tracking
  const resetCount = () => {
    setDetectionCount(0);
    setProcessedCount(0);
    setTrackedFaces([]);
    trackedFacesRef.current = []; // Also clear the ref
    setMultiplePersonsDetected(false); // Clear multiple persons warning
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopFaceDetection();
    };
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Smart Attendance Tracking</h1>
          <p className="text-muted-foreground">
            Event ID: {eventId} • Face tracking with{" "}
            {testMode ? "simulated" : "live"} backend
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <span className="text-sm">Active: {detectionCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-blue-600">
              Processed: {processedCount}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Tracking: {trackedFaces.length}
            </span>
          </div>
          <Button onClick={resetCount} variant="outline" size="sm">
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {multiplePersonsDetected && (
        <Alert variant="destructive" className="border-red-500 bg-red-50">
          <AlertDescription className="text-red-800 font-semibold">
            ⚠️ Multiple people detected! Please ensure only ONE person is
            visible in the camera for attendance tracking to work properly.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Camera Feed */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Live Camera Feed (React-Webcam)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                {isCameraActive ? (
                  <>
                    {/* Webcam component - now visible */}
                    <Webcam
                      ref={webcamRef}
                      audio={false}
                      width={640}
                      height={480}
                      videoConstraints={videoConstraints}
                      onUserMedia={onUserMedia}
                      onUserMediaError={onUserMediaError}
                      className="absolute inset-0 w-full h-full object-cover"
                      mirrored={true}
                    />

                    {/* Canvas overlay for face detection visualization */}
                    <canvas
                      ref={canvasRef}
                      className="absolute inset-0 w-full h-full object-cover"
                    />

                    {/* Detection status overlay */}
                    {multiplePersonsDetected ? (
                      <div className="absolute top-4 left-4 bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium animate-pulse">
                        ⚠️ Multiple People - Please show only ONE person
                      </div>
                    ) : faceDetected ? (
                      <div className="absolute top-4 left-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium animate-pulse">
                        👤 Person Detected
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <CameraOff className="mx-auto h-12 w-12 mb-2" />
                      <p>Camera not active</p>
                      <p className="text-sm">Click "Start Camera" to begin</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Camera controls */}
              <div className="flex gap-2">
                <Button
                  onClick={toggleCamera}
                  disabled={isModelLoading}
                  className="flex-1"
                  variant={isCameraActive ? "outline" : "default"}
                >
                  {isModelLoading
                    ? "Loading Model..."
                    : isCameraActive
                    ? "Stop Camera"
                    : "Start Camera"}
                </Button>
                <Button
                  onClick={() => setTestMode(!testMode)}
                  variant={testMode ? "default" : "outline"}
                  size="sm"
                >
                  {testMode ? "Test Mode" : "Live Mode"}
                </Button>
              </div>

              {testMode && (
                <div className="text-xs text-yellow-600 bg-yellow-50 p-2 rounded">
                  🧪 Test Mode: Backend requests are simulated. Set testMode to
                  false when your FastAPI backend is ready.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Status Panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Detection Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span>Model Status:</span>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        isModelLoading ? "bg-yellow-500" : "bg-green-500"
                      }`}
                    />
                    <span
                      className={`font-medium text-sm ${
                        isModelLoading ? "text-yellow-600" : "text-green-600"
                      }`}
                    >
                      {isModelLoading ? "Loading..." : "Ready"}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span>Camera:</span>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        isCameraActive ? "bg-green-500" : "bg-gray-400"
                      }`}
                    />
                    <span
                      className={`font-medium text-sm ${
                        isCameraActive ? "text-green-600" : "text-gray-600"
                      }`}
                    >
                      {isCameraActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span>Faces in Frame:</span>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        multiplePersonsDetected
                          ? "bg-red-500 animate-pulse"
                          : faceDetected
                          ? "bg-green-500 animate-pulse"
                          : "bg-gray-400"
                      }`}
                    />
                    <span
                      className={`font-medium text-sm ${
                        multiplePersonsDetected
                          ? "text-red-600"
                          : faceDetected
                          ? "text-green-600"
                          : "text-gray-600"
                      }`}
                    >
                      {multiplePersonsDetected
                        ? `${detectionCount} (Too Many!)`
                        : detectionCount}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span>Tracked Faces:</span>
                  <span className="font-medium text-sm text-yellow-600">
                    {trackedFaces.length}
                  </span>
                </div>

                <div className="border-t pt-2 space-y-2">
                  <div className="flex justify-between items-center">
                    <span>Sent to Backend:</span>
                    <span className="font-bold text-lg text-blue-600">
                      {processedCount}
                    </span>
                  </div>

                  {/* Show status of tracked faces */}
                  {trackedFaces.length > 0 && (
                    <div className="text-xs space-y-1">
                      {trackedFaces.map((face) => (
                        <div
                          key={face.id}
                          className="flex justify-between items-center"
                        >
                          <span className="font-mono">{face.id.slice(-8)}</span>
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              face.status === "tracking"
                                ? "bg-yellow-100 text-yellow-800"
                                : face.status === "confirmed"
                                ? "bg-green-100 text-green-800"
                                : face.status === "processed"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-orange-100 text-orange-800"
                            }`}
                          >
                            {face.status === "tracking"
                              ? `${face.stability}/${STABILITY_THRESHOLD}`
                              : face.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Smart Tracking Features</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm space-y-2">
                <div className="bg-green-50 p-2 rounded">
                  <p className="font-medium text-green-800">✨ New Features:</p>
                  <ul className="list-disc list-inside text-green-700 mt-1">
                    <li>Stateful face tracking</li>
                    <li>
                      Stability confirmation ({STABILITY_THRESHOLD} frames)
                    </li>
                    <li>One request per person</li>
                    <li>10-second cooldown period</li>
                    <li>Automatic face matching</li>
                  </ul>
                </div>
                <div className="bg-blue-50 p-2 rounded">
                  <p className="font-medium text-blue-800">🎯 How it works:</p>
                  <ul className="list-disc list-inside text-blue-700 mt-1">
                    <li>Yellow box: Tracking face</li>
                    <li>Green box: Confirmed face</li>
                    <li>Blue box: Sent to backend</li>
                    <li>Orange box: Cooldown period</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm space-y-2">
                <p className="font-semibold text-red-600">
                  ⚠️ ONE PERSON AT A TIME ONLY
                </p>
                <p>1. 📹 Click "Start Camera" to begin</p>
                <p>2. 👤 Position ONLY ONE person in front of camera</p>
                <p>3. 🟡 Yellow box appears (tracking)</p>
                <p>4. 🟢 Green box means confirmed</p>
                <p>5. 🔵 Blue box means sent to backend</p>
                <p>6. Check "Sent to Backend" counter</p>
                <p>7. 🔄 Reset clears all tracking data</p>
                <p className="text-red-600 text-xs mt-2">
                  📢 If multiple people are detected, tracking stops until only
                  one person remains visible.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
