"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";
import * as tf from "@tensorflow/tfjs";
import * as blazeface from "@tensorflow-models/blazeface";
import { detectFacesInVideo } from "@/lib/faceDetection";
import { faceEmbeddingService, EmbeddingResult } from "@/lib/faceEmbedding";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Camera, CameraOff, Users, RotateCcw } from "lucide-react";
import { registerattendance } from "@/lib/actions";

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

  // Embedding state
  const [isEmbeddingModelsLoading, setIsEmbeddingModelsLoading] =
    useState(true);
  const [embeddingResults, setEmbeddingResults] = useState<{
    embedding?: EmbeddingResult;
    processingTime?: number;
  }>({});
  const [isProcessingEmbedding, setIsProcessingEmbedding] = useState(false);
  const [duplicateDetected, setDuplicateDetected] = useState<{
    personId: string;
    similarity: number;
  } | null>(null);

  // Track processed people in this session to prevent duplicates
  const processedPeopleRef = useRef<Set<string>>(new Set());

  // Tracking configuration
  const STABILITY_THRESHOLD = 12; // Requires 12 stable frames (~1.8 seconds at 150ms intervals)
  const IOU_THRESHOLD = 0.8; // Intersection over Union threshold for matching
  const MAX_ABSENCE_TIME = 1000; // Remove faces that disappear for more than 1 second
  // Dynamic cooldown based on embedding processing time (minimum 2 seconds)
  const getCooldownPeriod = () =>
    Math.max(2000, (embeddingResults.processingTime || 0) * 2);

  // Camera configuration - simplified for laptop webcam only
  const videoConstraints = {
    width: 640,
    height: 480,
    facingMode: "user", // Always use front camera for laptop
  };

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
      if (!webcamRef.current?.video || !canvasRef.current) return;

      try {
        console.log(
          `🚀 Processing face ${faceId} with FaceNet embedding generation...`
        );
        setIsProcessingEmbedding(true);
        setDuplicateDetected(null);

        // Generate embedding using FaceNet model only
        const embeddingResult =
          await faceEmbeddingService.generateFaceNetEmbedding(
            canvasRef.current,
            bbox
          );

        setEmbeddingResults({
          embedding: embeddingResult,
          processingTime: embeddingResult.processingTime,
        });

        console.log(
          `⏱️ FaceNet embedding took: ${embeddingResult.processingTime.toFixed(
            2
          )}ms`
        );

        // Check for duplicates using strict similarity threshold (0.85 = very strict)
        if (embeddingResult.embedding.length > 0) {
          const matchingPerson = faceEmbeddingService.findMatchingPerson(
            embeddingResult.embedding,
            0.85 // Very strict threshold - only prevent if we're very sure it's the same person
          );

          if (matchingPerson) {
            console.log(
              `🔄 Very high similarity detected! Person ${
                matchingPerson.personId
              } with similarity ${matchingPerson.similarity.toFixed(
                3
              )} - skipping duplicate`
            );
            setDuplicateDetected(matchingPerson);
            setIsProcessingEmbedding(false);
            return; // Don't send to backend if very high similarity
          }

          // Check if this face ID was already processed in this session
          if (processedPeopleRef.current.has(faceId)) {
            console.log(
              `🔄 Face ${faceId} already processed in this session - skipping`
            );
            setIsProcessingEmbedding(false);
            return;
          }

          // Add this person to known embeddings and processed set
          faceEmbeddingService.addKnownEmbedding(
            embeddingResult.embedding,
            faceId
          );
          processedPeopleRef.current.add(faceId);
          console.log(
            `➕ Added new person ${faceId} to known embeddings. Total known: ${faceEmbeddingService.getKnownEmbeddingsCount()}`
          );
        }

        if (testMode) {
          // Test mode - simulate backend request
          console.log(
            `🧪 TEST MODE: Simulating backend request for face ${faceId}`
          );
          await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate network delay
          console.log(`✅ TEST: Face ${faceId} processed successfully`);
          setProcessedCount((prev) => prev + 1);
          setIsProcessingEmbedding(false);
          return;
        }

        // Send embedding to backend
        const backendPayload = {
          embedding: embeddingResult.embedding,
          modelName: embeddingResult.modelName,
          event_id: eventId,
          face_id: faceId,
        };

        // TODO: Replace with your actual FastAPI backend endpoint
        const response = await registerattendance(backendPayload);

        if (response.ok) {
          const result = await response.json();
          console.log(`✅ Face ${faceId} processed successfully:`, result);
          setProcessedCount((prev) => prev + 1);
        } else {
          console.error(
            `❌ Backend request failed for face ${faceId}:`,
            response.statusText
          );
        }
      } catch (error) {
        console.error(`❌ Error processing face ${faceId}:`, error);
      } finally {
        setIsProcessingEmbedding(false);
      }
    },
    [eventId, testMode]
  );

  // Await params on mount
  useEffect(() => {
    const getParams = async () => {
      const resolvedParams = await params;
      setEventId(resolvedParams.event_id);
    };
    getParams();
  }, [params]);

  // Load the BlazeFace model and embedding models
  useEffect(() => {
    const loadModels = async () => {
      try {
        setIsModelLoading(true);
        setIsEmbeddingModelsLoading(true);

        // Load BlazeFace for detection
        await tf.ready();
        const loadedModel = await blazeface.load();
        setModel(loadedModel);
        console.log("✅ BlazeFace model loaded successfully");

        // Load FaceNet embedding model
        await faceEmbeddingService.loadModels();
        setIsEmbeddingModelsLoading(false);
        console.log("✅ FaceNet embedding model loaded successfully");

        setIsModelLoading(false);
      } catch (err) {
        console.error("❌ Error loading models:", err);
        setError("Failed to load face detection or FaceNet embedding model");
        setIsModelLoading(false);
        setIsEmbeddingModelsLoading(false);
      }
    };

    loadModels();
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
          cooldownPeriod: getCooldownPeriod(),
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
    getCooldownPeriod,
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
    setEmbeddingResults({}); // Clear embedding results
    setDuplicateDetected(null); // Clear duplicate detection
    processedPeopleRef.current.clear(); // Clear processed people set
    faceEmbeddingService.clearKnownEmbeddings(); // Clear known embeddings
    console.log(
      "🔄 All tracking data, embeddings, and processed people cleared"
    );
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
                  disabled={isModelLoading || isEmbeddingModelsLoading}
                  className="flex-1"
                  variant={isCameraActive ? "outline" : "default"}
                >
                  {isModelLoading || isEmbeddingModelsLoading
                    ? "Loading Models..."
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
                  🧪 Test Mode: Face embeddings are generated client-side and
                  backend requests are simulated. Set testMode to false when
                  your FastAPI backend is ready to receive embedding vectors.
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
                        isModelLoading || isEmbeddingModelsLoading
                          ? "bg-yellow-500"
                          : "bg-green-500"
                      }`}
                    />
                    <span
                      className={`font-medium text-sm ${
                        isModelLoading || isEmbeddingModelsLoading
                          ? "text-yellow-600"
                          : "text-green-600"
                      }`}
                    >
                      {isModelLoading || isEmbeddingModelsLoading
                        ? "Loading..."
                        : "Ready"}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span>Embedding Models:</span>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        isEmbeddingModelsLoading
                          ? "bg-yellow-500"
                          : "bg-green-500"
                      }`}
                    />
                    <span
                      className={`font-medium text-sm ${
                        isEmbeddingModelsLoading
                          ? "text-yellow-600"
                          : "text-green-600"
                      }`}
                    >
                      {isEmbeddingModelsLoading ? "Loading..." : "Ready"}
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
                  <p className="font-medium text-green-800">
                    ✨ Smart Features:
                  </p>
                  <ul className="list-disc list-inside text-green-700 mt-1">
                    <li>Stateful face tracking</li>
                    <li>
                      Stability confirmation ({STABILITY_THRESHOLD} frames)
                    </li>
                    <li>Client-side face embeddings</li>
                    <li>Automatic duplicate detection</li>
                    <li>Dynamic cooldown based on processing time</li>
                    <li>95% bandwidth savings vs images</li>
                  </ul>
                </div>
                <div className="bg-blue-50 p-2 rounded">
                  <p className="font-medium text-blue-800">
                    🎯 Embedding Models:
                  </p>
                  <ul className="list-disc list-inside text-blue-700 mt-1">
                    <li>FaceNet: Higher accuracy, slower</li>
                    <li>MobileFaceNet: Faster, mobile-optimized</li>
                    <li>128-dimensional face vectors</li>
                    <li>Cosine similarity matching</li>
                  </ul>
                </div>
                <div className="bg-purple-50 p-2 rounded">
                  <p className="font-medium text-purple-800">🚀 Performance:</p>
                  <ul className="list-disc list-inside text-purple-700 mt-1">
                    <li>Both models run in parallel</li>
                    <li>Real-time duplicate detection</li>
                    <li>No backend load for embeddings</li>
                    <li>Cooldown = 2x embedding time</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Embedding Performance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isProcessingEmbedding ? (
                <div className="flex items-center gap-2 text-blue-600">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm font-medium">
                    Generating embedding...
                  </span>
                </div>
              ) : embeddingResults.embedding ? (
                <div className="space-y-3">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold text-blue-800">
                        FaceNet Embedding
                      </span>
                      <span
                        className={`text-sm ${
                          embeddingResults.embedding.error
                            ? "text-red-600"
                            : "text-blue-600"
                        }`}
                      >
                        {embeddingResults.embedding.error
                          ? "Error"
                          : `${embeddingResults.embedding.processingTime.toFixed(
                              0
                            )}ms`}
                      </span>
                    </div>
                    {embeddingResults.embedding.error ? (
                      <p className="text-xs text-red-600">
                        {embeddingResults.embedding.error}
                      </p>
                    ) : (
                      <p className="text-xs text-blue-700">
                        Embedding: {embeddingResults.embedding.embedding.length}{" "}
                        dimensions
                      </p>
                    )}
                  </div>

                  <div className="bg-purple-50 p-2 rounded">
                    <span className="text-sm font-medium text-purple-800">
                      Processing: {embeddingResults.processingTime?.toFixed(0)}
                      ms
                    </span>
                    <span className="text-xs text-purple-600 ml-2">
                      (Cooldown: {getCooldownPeriod()}ms)
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  No embeddings generated yet
                </p>
              )}

              {duplicateDetected && (
                <div className="bg-orange-50 border border-orange-200 p-3 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-orange-600">🔄</span>
                    <span className="font-semibold text-orange-800">
                      Duplicate Detected!
                    </span>
                  </div>
                  <p className="text-xs text-orange-700">
                    Person already seen (similarity:{" "}
                    {(duplicateDetected.similarity * 100).toFixed(1)}%)
                  </p>
                  <p className="text-xs text-orange-600">
                    Not sending to backend to avoid duplicate attendance
                  </p>
                </div>
              )}

              <div className="text-xs space-y-1 bg-gray-50 p-2 rounded">
                <p>
                  <strong>Known people:</strong>{" "}
                  {faceEmbeddingService.getKnownEmbeddingsCount()}
                </p>
                <p>
                  <strong>Detection type:</strong> Client-side embeddings
                </p>
                <p>
                  <strong>Bandwidth saved:</strong> ~95% (vectors vs images)
                </p>
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
                <p>5. 🔵 Blue box means generating embeddings</p>
                <p>6. 🧠 FaceNet & MobileFaceNet process face</p>
                <p>7. 🔍 System checks for duplicates</p>
                <p>8. ✅ New person gets sent to backend</p>
                <p>9. 🔄 Duplicates are blocked automatically</p>
                <p className="text-blue-600 text-xs mt-2">
                  � Embeddings are generated client-side for faster processing
                  and bandwidth savings!
                </p>
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
