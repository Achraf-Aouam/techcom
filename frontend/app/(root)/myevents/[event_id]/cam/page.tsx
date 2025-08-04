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

export default function AlternativeAttendancePage({
  params,
}: {
  params: Promise<{ event_id: string }>;
}) {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [model, setModel] = useState<blazeface.BlazeFaceModel | null>(null);
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [detectionCount, setDetectionCount] = useState(0);
  const [error, setError] = useState<string>("");
  const [eventId, setEventId] = useState<string>("");

  // Camera configuration - simplified for laptop webcam only
  const videoConstraints = {
    width: 640,
    height: 480,
    facingMode: "user", // Always use front camera for laptop
  };

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

  // Function to detect faces (delegated to lib/faceDetection)
  const detectFaces = useCallback(async () => {
    console.log("🔍 detectFaces called");
    console.log("🤖 Model exists:", !!model);
    console.log("📷 Webcam ref exists:", !!webcamRef.current);
    console.log("🖼️ Canvas ref exists:", !!canvasRef.current);

    if (!model || !webcamRef.current || !canvasRef.current) {
      if (!model) console.log("❌ Early return - missing dependency: model");
      if (!webcamRef.current)
        console.log("❌ Early return - missing dependency: webcamRef.current");
      if (!canvasRef.current)
        console.log("❌ Early return - missing dependency: canvasRef.current");
      return;
    }

    const webcam = webcamRef.current;
    const video = webcam.video;
    const canvas = canvasRef.current;

    console.log("🎥 Video element:", !!video);
    console.log("🖼️ Canvas element:", !!canvas);

    if (!video || !canvas) {
      console.log("❌ Video or canvas is null");
      return;
    }

    // Robust: Only proceed if video is actually ready (readyState 4 = HAVE_ENOUGH_DATA)
    if (video.readyState !== 4) {
      console.log("⏳ Video not ready, readyState:", video.readyState);
      return;
    }

    console.log("📹 Video ready state:", video.readyState);
    console.log(
      "📏 Video dimensions:",
      video.videoWidth,
      "x",
      video.videoHeight
    );

    const result = await detectFacesInVideo({
      model,
      video,
      canvas,
      facingMode: "user", // Always use front camera for laptop
    });

    console.log("🎯 Detection result:", result);
    const currentlyDetected = result.faceCount > 0;

    // Update face detection status
    if (currentlyDetected !== faceDetected) {
      setFaceDetected(currentlyDetected);
      if (currentlyDetected) {
        setDetectionCount((prev) => prev + 1);
        console.log(`👤 ${result.faceCount} person(s) detected in frame`);
      } else {
        console.log("👻 No person in frame");
      }
    }
    if (result.error) {
      console.error("❌ Error during face detection:", result.error);
    }
  }, [model, faceDetected]);

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
      stopFaceDetection();
    } else {
      setIsCameraActive(true);
    }
  };

  // Reset detection count
  const resetCount = () => {
    setDetectionCount(0);
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
          <h1 className="text-3xl font-bold">Event Attendance (Alternative)</h1>
          <p className="text-muted-foreground">
            Event ID: {eventId} • Using react-webcam
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <span className="text-sm">Detections: {detectionCount}</span>
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
                    {faceDetected && (
                      <div className="absolute top-4 left-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium animate-pulse">
                        👤 Person Detected
                      </div>
                    )}
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
              </div>
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
                  <span>Face Detected:</span>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        faceDetected
                          ? "bg-green-500 animate-pulse"
                          : "bg-gray-400"
                      }`}
                    />
                    <span
                      className={`font-medium text-sm ${
                        faceDetected ? "text-green-600" : "text-gray-600"
                      }`}
                    >
                      {faceDetected ? "Yes" : "No"}
                    </span>
                  </div>
                </div>

                <div className="border-t pt-2">
                  <div className="flex justify-between items-center">
                    <span>Total Detections:</span>
                    <span className="font-bold text-lg text-blue-600">
                      {detectionCount}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Key Differences</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm space-y-2">
                <div className="bg-green-50 p-2 rounded">
                  <p className="font-medium text-green-800">✅ Advantages:</p>
                  <ul className="list-disc list-inside text-green-700 mt-1">
                    <li>Simpler camera setup</li>
                    <li>Built-in error handling</li>
                    <li>Optimized for laptop webcam</li>
                    <li>Automatic mirroring</li>
                  </ul>
                </div>
                <div className="bg-blue-50 p-2 rounded">
                  <p className="font-medium text-blue-800">📋 Features:</p>
                  <ul className="list-disc list-inside text-blue-700 mt-1">
                    <li>One-click camera toggle</li>
                    <li>Real-time face detection</li>
                    <li>Visual status indicators</li>
                    <li>Detection counter</li>
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
                <p>1. 📹 Click "Start Camera" to begin</p>
                <p>2. 👤 Position your face in front of camera</p>
                <p>3. 🟢 Green boxes show detected faces</p>
                <p>4. Check console for detection logs</p>
                <p>5. 🔄 Reset counter with reset button</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
