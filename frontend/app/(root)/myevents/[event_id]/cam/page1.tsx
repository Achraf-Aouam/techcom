"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";
import * as tf from "@tensorflow/tfjs";
import * as blazeface from "@tensorflow-models/blazeface";
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
  params: { event_id: string };
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
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");

  // Camera configuration
  const videoConstraints = {
    width: 640,
    height: 480,
    facingMode: facingMode,
  };

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

  // Handle camera ready callback
  const onUserMedia = useCallback(() => {
    console.log("📹 Camera is ready!");
    setIsCameraActive(true);
    setError("");
    startFaceDetection();
  }, []);

  // Handle camera error callback
  const onUserMediaError = useCallback((error: string | DOMException) => {
    console.error("❌ Camera error:", error);
    setError("Failed to access camera. Please check permissions.");
    setIsCameraActive(false);
  }, []);

  // Function to detect faces
  const detectFaces = async () => {
    if (!model || !webcamRef.current || !canvasRef.current || !isCameraActive) {
      return;
    }

    const webcam = webcamRef.current;
    const video = webcam.video;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (!video || !ctx || video.readyState !== 4) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    try {
      // Run face detection on the video element
      const predictions = (await model.estimateFaces(
        video,
        false
      )) as Detection[];

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw video frame on canvas (mirror for front camera)
      if (facingMode === "user") {
        ctx.scale(-1, 1);
        ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
        ctx.scale(-1, 1);
      } else {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }

      const currentlyDetected = predictions.length > 0;

      // Draw bounding boxes for detected faces
      if (currentlyDetected) {
        predictions.forEach((prediction, index) => {
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
      }

      // Update face detection status
      if (currentlyDetected !== faceDetected) {
        setFaceDetected(currentlyDetected);
        if (currentlyDetected) {
          setDetectionCount((prev) => prev + 1);
          console.log(`👤 ${predictions.length} person(s) detected in frame`);
        } else {
          console.log("👻 No person in frame");
        }
      }
    } catch (err) {
      console.error("❌ Error during face detection:", err);
    }
  };

  // Start continuous face detection
  const startFaceDetection = () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
    }
    detectionIntervalRef.current = setInterval(detectFaces, 150); // Detect every 150ms
  };

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

  // Toggle between front and back camera
  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
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
            Event ID: {params.event_id} • Using react-webcam
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
                    {/* Webcam component - much simpler than manual getUserMedia */}
                    <Webcam
                      ref={webcamRef}
                      audio={false}
                      width={640}
                      height={480}
                      videoConstraints={videoConstraints}
                      onUserMedia={onUserMedia}
                      onUserMediaError={onUserMediaError}
                      className="absolute inset-0 w-full h-full object-cover opacity-0"
                      mirrored={facingMode === "user"}
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

                    {/* Camera type indicator */}
                    <div className="absolute top-4 right-4 bg-blue-500 text-white px-2 py-1 rounded text-xs">
                      {facingMode === "user" ? "Front" : "Back"} Camera
                    </div>
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
                  onClick={toggleFacingMode}
                  disabled={!isCameraActive || isModelLoading}
                  variant="outline"
                >
                  <RotateCcw className="h-4 w-4" />
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

                <div className="flex justify-between items-center">
                  <span>Camera Mode:</span>
                  <span className="font-medium text-sm">
                    {facingMode === "user" ? "Front" : "Back"}
                  </span>
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
                    <li>Easy camera switching</li>
                    <li>Automatic mirroring</li>
                  </ul>
                </div>
                <div className="bg-blue-50 p-2 rounded">
                  <p className="font-medium text-blue-800">📋 Features:</p>
                  <ul className="list-disc list-inside text-blue-700 mt-1">
                    <li>One-click camera toggle</li>
                    <li>Front/back camera switch</li>
                    <li>Visual status indicators</li>
                    <li>Cleaner code structure</li>
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
                <p>4. 🔄 Click rotate button to switch cameras</p>
                <p>5. 📊 Check console for detection logs</p>
                <p>6. 🔄 Reset counter with reset button</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
