import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";

("use client");

export default function EventCamPage() {
  const { event_id } = useParams<{ event_id: string }>();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    async function getCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        setCameraError("Unable to access camera.");
      }
    }
    getCamera();
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach((track) => track.stop());
      }
    };
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h1>Event ID: {event_id}</h1>
      <div style={{ marginTop: 24 }}>
        <h2>Camera Preview</h2>
        {cameraError ? (
          <div style={{ color: "red" }}>{cameraError}</div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            width={320}
            height={240}
            style={{ border: "1px solid #ccc", borderRadius: 8 }}
          />
        )}
      </div>
    </div>
  );
}
