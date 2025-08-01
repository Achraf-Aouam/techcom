"use client";

import { useEffect, useRef, useState } from "react";
import * as tf from "@tensorflow/tfjs";
import * as blazeface from "@tensorflow-models/blazeface";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Camera, CameraOff, Users } from "lucide-react";

interface Detection {
  topLeft: [number, number];
  bottomRight: [number, number];
  probability: number;
}

export default function AttendanceCameraPage({
  params,
}: {
  params: { event_id: string };
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [model, setModel] = useState<blazeface.BlazeFaceModel | null>(null);
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [detectionCount, setDetectionCount] = useState(0);
  const [error, setError] = useState<string>("");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load the BlazeFace model
  useEffect(() => {
    const loadModel = async () => {
      try {
        setIsModelLoading(true);
        await tf.ready();
        const loadedModel = await blazeface.load();
        setModel(loadedModel);
        setIsModelLoading(false);
        console.log("BlazeFace model loaded successfully");
      } catch (err) {
        console.error("Error loading model:", err);
        setError("Failed to load face detection model");
        setIsModelLoading(false);
      }
    };

    loadModel();
  }, []);

  // Function to start camera
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
        setIsCameraActive(true);
        setError("");

        // Start face detection when video is ready
        videoRef.current.onloadedmetadata = () => {
          startFaceDetection();
        };
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError(
        "Failed to access camera. Please ensure camera permissions are granted."
      );
    }
  };

  // Function to stop camera
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }

    setIsCameraActive(false);
    setFaceDetected(false);
  };

  // Function to detect faces
  const detectFaces = async () => {
    if (!model || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (!ctx || video.readyState !== 4) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    try {
      // Run face detection
      const predictions = (await model.estimateFaces(
        video,
        false
      )) as Detection[];

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw video frame on canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const currentlyDetected = predictions.length > 0;

      // Draw bounding boxes for detected faces
      if (currentlyDetected) {
        ctx.strokeStyle = "#00ff00";
        ctx.lineWidth = 3;

        predictions.forEach((prediction) => {
          const [x1, y1] = prediction.topLeft;
          const [x2, y2] = prediction.bottomRight;
          const width = x2 - x1;
          const height = y2 - y1;

          ctx.strokeRect(x1, y1, width, height);

          // Draw confidence score
          ctx.fillStyle = "#00ff00";
          ctx.font = "16px Arial";
          ctx.fillText(
            `Face: ${(prediction.probability * 100).toFixed(1)}%`,
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
          console.log("Person in frame");
        } else {
          console.log("Person out of frame");
        }
      }
    } catch (err) {
      console.error("Error during face detection:", err);
    }
  };

  // Start continuous face detection
  const startFaceDetection = () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
    }

    detectionIntervalRef.current = setInterval(detectFaces, 100); // Detect every 100ms
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Event Attendance</h1>
          <p className="text-muted-foreground">Event ID: {params.event_id}</p>
        </div>
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          <span className="text-sm">Detections: {detectionCount}</span>
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
                Live Camera Feed
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                {isCameraActive ? (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="absolute inset-0 w-full h-full object-cover opacity-0"
                    />
                    <canvas
                      ref={canvasRef}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    {faceDetected && (
                      <div className="absolute top-4 left-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                        Person Detected
                      </div>
                    )}
                  </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <CameraOff className="mx-auto h-12 w-12 mb-2" />
                      <p>Camera not active</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                {!isCameraActive ? (
                  <Button
                    onClick={startCamera}
                    disabled={isModelLoading}
                    className="flex-1"
                  >
                    {isModelLoading ? "Loading Model..." : "Start Camera"}
                  </Button>
                ) : (
                  <Button
                    onClick={stopCamera}
                    variant="outline"
                    className="flex-1"
                  >
                    Stop Camera
                  </Button>
                )}
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
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Model Status:</span>
                  <span
                    className={`font-medium ${
                      isModelLoading ? "text-yellow-600" : "text-green-600"
                    }`}
                  >
                    {isModelLoading ? "Loading..." : "Ready"}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>Camera:</span>
                  <span
                    className={`font-medium ${
                      isCameraActive ? "text-green-600" : "text-gray-600"
                    }`}
                  >
                    {isCameraActive ? "Active" : "Inactive"}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>Face Detected:</span>
                  <span
                    className={`font-medium ${
                      faceDetected ? "text-green-600" : "text-gray-600"
                    }`}
                  >
                    {faceDetected ? "Yes" : "No"}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>Total Detections:</span>
                  <span className="font-medium">{detectionCount}</span>
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
                <p>1. Click "Start Camera" to begin</p>
                <p>2. Position your face in front of the camera</p>
                <p>3. Green boxes will appear around detected faces</p>
                <p>
                  4. Status will show "Person Detected" when a face is found
                </p>
                <p>5. Check console for "in frame" / "out of frame" logs</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
