import * as tf from "@tensorflow/tfjs";

export interface EmbeddingResult {
  embedding: number[];
  processingTime: number;
  modelName: string;
  error?: string;
}

export interface EmbeddingComparison {
  distance: number;
  similarity: number;
  isSamePerson: boolean;
}

/**
 * Face Embedding Service for client-side face recognition
 * Supports multiple models: FaceNet-style and MobileFaceNet-style embeddings
 */
export class FaceEmbeddingService {
  private faceNetModel: tf.LayersModel | null = null;
  private isLoading = false;
  private loadingPromise: Promise<void> | null = null;

  // Similarity threshold for determining if two faces are the same person
  private readonly SIMILARITY_THRESHOLD = 0.85; // Stricter threshold

  // Store embeddings for duplicate detection
  private knownEmbeddings: {
    embedding: number[];
    personId: string;
    timestamp: number;
  }[] = [];

  /**
   * Initialize and load FaceNet model
   */
  async loadModels(): Promise<void> {
    if (this.isLoading && this.loadingPromise) {
      return this.loadingPromise;
    }

    if (this.faceNetModel) {
      return;
    }

    this.isLoading = true;
    this.loadingPromise = this._loadModels();

    try {
      await this.loadingPromise;
    } finally {
      this.isLoading = false;
      this.loadingPromise = null;
    }
  }

  private async _loadModels(): Promise<void> {
    console.log("🤖 Loading FaceNet embedding model...");

    try {
      // Create a FaceNet-style model (128-dimensional embeddings)
      console.log("📦 Creating FaceNet model...");
      this.faceNetModel = await this.createFaceNetModel();

      console.log("✅ FaceNet embedding model loaded successfully!");
    } catch (error) {
      console.error("❌ Error loading FaceNet embedding model:", error);
      throw error;
    }
  }

  /**
   * Create a FaceNet-style model
   * In production, you'd load this from a pre-trained model URL
   */
  private async createFaceNetModel(): Promise<tf.LayersModel> {
    const model = tf.sequential({
      layers: [
        tf.layers.conv2d({
          inputShape: [112, 112, 3],
          filters: 32,
          kernelSize: 3,
          activation: "relu",
          padding: "same",
        }),
        tf.layers.maxPooling2d({ poolSize: 2 }),
        tf.layers.conv2d({
          filters: 64,
          kernelSize: 3,
          activation: "relu",
          padding: "same",
        }),
        tf.layers.maxPooling2d({ poolSize: 2 }),
        tf.layers.conv2d({
          filters: 128,
          kernelSize: 3,
          activation: "relu",
          padding: "same",
        }),
        tf.layers.globalAveragePooling2d({}),
        tf.layers.dense({ units: 256, activation: "relu" }),
        tf.layers.dropout({ rate: 0.5 }),
        tf.layers.dense({ units: 128, activation: "linear" }), // 128-dim embedding (will normalize in post-processing)
      ],
    });

    return model;
  }

  /**
   * Preprocess face image for embedding models
   */
  private preprocessFaceImage(
    canvas: HTMLCanvasElement,
    bbox: number[]
  ): tf.Tensor {
    const [x1, y1, x2, y2] = bbox;
    const width = x2 - x1;
    const height = y2 - y1;

    // Create a tensor from the cropped face region
    const faceCanvas = document.createElement("canvas");
    const faceCtx = faceCanvas.getContext("2d")!;
    faceCanvas.width = 112;
    faceCanvas.height = 112;

    // Draw the cropped and resized face
    faceCtx.drawImage(
      canvas,
      x1,
      y1,
      width,
      height, // Source rectangle
      0,
      0,
      112,
      112 // Destination rectangle (resize to 112x112)
    );

    // Convert to tensor and normalize
    const tensor = tf.browser
      .fromPixels(faceCanvas)
      .expandDims(0) // Add batch dimension
      .cast("float32")
      .div(255.0); // Normalize to [0, 1]

    return tensor;
  }

  /**
   * Normalize embedding vector using L2 normalization
   */
  private normalizeEmbedding(embedding: number[]): number[] {
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return norm > 0 ? embedding.map((val) => val / norm) : embedding;
  }

  /**
   * Generate FaceNet embedding for a face
   */
  async generateFaceNetEmbedding(
    canvas: HTMLCanvasElement,
    bbox: number[]
  ): Promise<EmbeddingResult> {
    const startTime = performance.now();

    try {
      if (!this.faceNetModel) {
        throw new Error("FaceNet model not loaded");
      }

      const preprocessedFace = this.preprocessFaceImage(canvas, bbox);

      const embeddingTensor = this.faceNetModel.predict(
        preprocessedFace
      ) as tf.Tensor;
      const embeddingArray = await embeddingTensor.data();
      const rawEmbedding = Array.from(embeddingArray);

      // L2 normalize the embedding
      const embedding = this.normalizeEmbedding(rawEmbedding);

      // Clean up tensors
      preprocessedFace.dispose();
      embeddingTensor.dispose();

      const processingTime = performance.now() - startTime;

      return {
        embedding,
        processingTime,
        modelName: "FaceNet",
      };
    } catch (error) {
      const processingTime = performance.now() - startTime;
      return {
        embedding: [],
        processingTime,
        modelName: "FaceNet",
        error: (error as Error).message,
      };
    }
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  calculateCosineSimilarity(
    embedding1: number[],
    embedding2: number[]
  ): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error("Embeddings must have the same length");
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    norm1 = Math.sqrt(norm1);
    norm2 = Math.sqrt(norm2);

    if (norm1 === 0 || norm2 === 0) {
      return 0;
    }

    return dotProduct / (norm1 * norm2);
  }

  /**
   * Calculate Euclidean distance between two embeddings
   */
  calculateEuclideanDistance(
    embedding1: number[],
    embedding2: number[]
  ): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error("Embeddings must have the same length");
    }

    let sum = 0;
    for (let i = 0; i < embedding1.length; i++) {
      const diff = embedding1[i] - embedding2[i];
      sum += diff * diff;
    }

    return Math.sqrt(sum);
  }

  /**
   * Compare two embeddings and determine if they represent the same person
   */
  compareEmbeddings(
    embedding1: number[],
    embedding2: number[]
  ): EmbeddingComparison {
    const similarity = this.calculateCosineSimilarity(embedding1, embedding2);
    const distance = this.calculateEuclideanDistance(embedding1, embedding2);
    const isSamePerson = similarity > this.SIMILARITY_THRESHOLD;

    return {
      distance,
      similarity,
      isSamePerson,
    };
  }

  /**
   * Check if a face embedding matches any known embedding (duplicate detection)
   */
  findMatchingPerson(
    newEmbedding: number[],
    threshold: number = this.SIMILARITY_THRESHOLD
  ): {
    personId: string;
    similarity: number;
  } | null {
    let bestMatch = null;
    let bestSimilarity = -1;

    for (const known of this.knownEmbeddings) {
      const similarity = this.calculateCosineSimilarity(
        newEmbedding,
        known.embedding
      );
      if (similarity > threshold && similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestMatch = {
          personId: known.personId,
          similarity,
        };
      }
    }

    return bestMatch;
  }

  /**
   * Add a new embedding to the known embeddings list
   */
  addKnownEmbedding(embedding: number[], personId: string): void {
    this.knownEmbeddings.push({
      embedding,
      personId,
      timestamp: Date.now(),
    });

    // Limit the number of stored embeddings to prevent memory issues
    if (this.knownEmbeddings.length > 100) {
      this.knownEmbeddings = this.knownEmbeddings.slice(-50); // Keep last 50
    }
  }

  /**
   * Clear all known embeddings
   */
  clearKnownEmbeddings(): void {
    this.knownEmbeddings = [];
  }

  /**
   * Get the number of known embeddings
   */
  getKnownEmbeddingsCount(): number {
    return this.knownEmbeddings.length;
  }
}

// Export a singleton instance
export const faceEmbeddingService = new FaceEmbeddingService();
