/**
 * Simple test file to verify face embedding functionality
 * Run this in the browser console to test the embedding service
 */

import { faceEmbeddingService } from "./faceEmbedding";

export async function testEmbeddingService() {
  console.log("🧪 Testing Face Embedding Service...");

  try {
    // Load models
    console.log("📦 Loading models...");
    await faceEmbeddingService.loadModels();
    console.log("✅ Models loaded successfully!");

    // Create a test canvas with a simple pattern
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext("2d")!;

    // Draw a simple test pattern
    ctx.fillStyle = "#ff0000";
    ctx.fillRect(100, 100, 200, 200);

    // Test bounding box (simulating a face detection)
    const testBbox: [number, number, number, number] = [100, 100, 300, 300];

    console.log("🔍 Generating embeddings...");

    // Test both models
    const results = await faceEmbeddingService.processFaceWithBothModels(
      canvas,
      testBbox
    );

    console.log("📊 Results:");
    console.log(
      `FaceNet: ${results.faceNet.processingTime.toFixed(
        2
      )}ms, embedding length: ${results.faceNet.embedding.length}`
    );
    console.log(
      `MobileFaceNet: ${results.mobileFaceNet.processingTime.toFixed(
        2
      )}ms, embedding length: ${results.mobileFaceNet.embedding.length}`
    );
    console.log(`Total time: ${results.totalTime.toFixed(2)}ms`);

    // Test similarity calculation
    if (
      results.faceNet.embedding.length > 0 &&
      results.mobileFaceNet.embedding.length > 0
    ) {
      const similarity = faceEmbeddingService.calculateCosineSimilarity(
        results.faceNet.embedding,
        results.mobileFaceNet.embedding
      );
      console.log(`🔍 Cross-model similarity: ${similarity.toFixed(3)}`);
    }

    // Test duplicate detection
    faceEmbeddingService.addKnownEmbedding(
      results.faceNet.embedding,
      "test-person-1"
    );
    const duplicate = faceEmbeddingService.findMatchingPerson(
      results.faceNet.embedding
    );

    console.log(
      `🔄 Duplicate detection test: ${duplicate ? "FOUND" : "NOT FOUND"}`
    );
    if (duplicate) {
      console.log(
        `   Person ID: ${
          duplicate.personId
        }, Similarity: ${duplicate.similarity.toFixed(3)}`
      );
    }

    console.log("✅ All tests completed successfully!");

    return {
      success: true,
      faceNetTime: results.faceNet.processingTime,
      mobileFaceNetTime: results.mobileFaceNet.processingTime,
      totalTime: results.totalTime,
    };
  } catch (error) {
    console.error("❌ Test failed:", error);
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

// Make it available globally for browser console testing
if (typeof window !== "undefined") {
  (window as any).testEmbeddingService = testEmbeddingService;
}
