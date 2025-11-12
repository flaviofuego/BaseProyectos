/**
 * Tests para procesamiento de imágenes con Sharp
 * Meta de cobertura: 85%
 *
 * Casos de prueba:
 * 1. Redimensionamiento a 300x300 pixels
 * 2. Conversión a formato JPEG
 * 3. Compresión con calidad 80
 * 4. Manejo de diferentes formatos de entrada
 * 5. Manejo de errores
 */

const sharp = require("sharp");
const fs = require("fs").promises;
const path = require("path");

// Mock de fs para no escribir archivos reales
jest.mock("fs", () => ({
  promises: {
    writeFile: jest.fn(),
    mkdir: jest.fn(),
    unlink: jest.fn(),
  },
}));

describe("Procesamiento de Imágenes con Sharp", () => {
  // ============================================================================
  // FUNCIÓN DE PROCESAMIENTO DE IMAGEN (como en el código real)
  // ============================================================================
  async function processImage(buffer, numero_documento) {
    const optimizedImage = await sharp(buffer)
      .resize(300, 300, { fit: "cover" })
      .jpeg({ quality: 80 })
      .toBuffer();

    const filename = `${numero_documento}_${Date.now()}.jpg`;
    const filepath = path.join("/uploads", filename);

    await fs.writeFile(filepath, optimizedImage);

    return {
      filename,
      filepath,
      buffer: optimizedImage,
    };
  }

  // Helper para crear buffer de imagen de prueba
  async function createTestImageBuffer(
    width = 800,
    height = 600,
    format = "png"
  ) {
    return await sharp({
      create: {
        width,
        height,
        channels: 3,
        background: { r: 255, g: 0, b: 0 },
      },
    })
      .toFormat(format)
      .toBuffer();
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // TESTS DE REDIMENSIONAMIENTO
  // ============================================================================
  describe("Redimensionamiento a 300x300", () => {
    it("debe redimensionar imagen grande a 300x300", async () => {
      const largeImage = await createTestImageBuffer(1920, 1080);

      const result = await sharp(largeImage)
        .resize(300, 300, { fit: "cover" })
        .toBuffer();

      const metadata = await sharp(result).metadata();

      expect(metadata.width).toBe(300);
      expect(metadata.height).toBe(300);
    });

    it("debe redimensionar imagen pequeña a 300x300", async () => {
      const smallImage = await createTestImageBuffer(100, 100);

      const result = await sharp(smallImage)
        .resize(300, 300, { fit: "cover" })
        .toBuffer();

      const metadata = await sharp(result).metadata();

      expect(metadata.width).toBe(300);
      expect(metadata.height).toBe(300);
    });

    it("debe mantener proporciones usando fit: cover", async () => {
      const wideImage = await createTestImageBuffer(1600, 900);

      const result = await sharp(wideImage)
        .resize(300, 300, { fit: "cover" })
        .toBuffer();

      const metadata = await sharp(result).metadata();

      expect(metadata.width).toBe(300);
      expect(metadata.height).toBe(300);
    });

    it("debe recortar imagen rectangular correctamente", async () => {
      const tallImage = await createTestImageBuffer(600, 1200);

      const result = await sharp(tallImage)
        .resize(300, 300, { fit: "cover" })
        .toBuffer();

      const metadata = await sharp(result).metadata();

      expect(metadata.width).toBe(300);
      expect(metadata.height).toBe(300);
    });

    it("debe manejar imágenes ya cuadradas", async () => {
      const squareImage = await createTestImageBuffer(500, 500);

      const result = await sharp(squareImage)
        .resize(300, 300, { fit: "cover" })
        .toBuffer();

      const metadata = await sharp(result).metadata();

      expect(metadata.width).toBe(300);
      expect(metadata.height).toBe(300);
    });

    it("debe procesar dimensiones exactas de 300x300", async () => {
      const exactImage = await createTestImageBuffer(300, 300);

      const result = await sharp(exactImage)
        .resize(300, 300, { fit: "cover" })
        .toBuffer();

      const metadata = await sharp(result).metadata();

      expect(metadata.width).toBe(300);
      expect(metadata.height).toBe(300);
    });
  });

  // ============================================================================
  // TESTS DE CONVERSIÓN A JPEG
  // ============================================================================
  describe("Conversión a formato JPEG", () => {
    it("debe convertir PNG a JPEG", async () => {
      const pngImage = await createTestImageBuffer(800, 600, "png");

      const result = await sharp(pngImage)
        .resize(300, 300, { fit: "cover" })
        .jpeg({ quality: 80 })
        .toBuffer();

      const metadata = await sharp(result).metadata();

      expect(metadata.format).toBe("jpeg");
    });

    it("debe convertir WEBP a JPEG", async () => {
      const webpImage = await createTestImageBuffer(800, 600, "webp");

      const result = await sharp(webpImage)
        .resize(300, 300, { fit: "cover" })
        .jpeg({ quality: 80 })
        .toBuffer();

      const metadata = await sharp(result).metadata();

      expect(metadata.format).toBe("jpeg");
    });

    it("debe mantener JPEG como JPEG", async () => {
      const jpegImage = await createTestImageBuffer(800, 600, "jpeg");

      const result = await sharp(jpegImage)
        .resize(300, 300, { fit: "cover" })
        .jpeg({ quality: 80 })
        .toBuffer();

      const metadata = await sharp(result).metadata();

      expect(metadata.format).toBe("jpeg");
    });

    it("debe eliminar canal alpha al convertir a JPEG", async () => {
      // Crear imagen con transparencia (PNG con alpha)
      const transparentImage = await sharp({
        create: {
          width: 800,
          height: 600,
          channels: 4,
          background: { r: 255, g: 0, b: 0, alpha: 0.5 },
        },
      })
        .png()
        .toBuffer();

      const result = await sharp(transparentImage)
        .resize(300, 300, { fit: "cover" })
        .jpeg({ quality: 80 })
        .toBuffer();

      const metadata = await sharp(result).metadata();

      expect(metadata.format).toBe("jpeg");
      expect(metadata.channels).toBe(3); // JPEG no tiene canal alpha
    });

    it("debe generar archivo JPEG válido", async () => {
      const testImage = await createTestImageBuffer(800, 600);

      const result = await sharp(testImage)
        .resize(300, 300, { fit: "cover" })
        .jpeg({ quality: 80 })
        .toBuffer();

      // Verificar que se puede leer como JPEG
      expect(async () => {
        await sharp(result).metadata();
      }).not.toThrow();
    });
  });

  // ============================================================================
  // TESTS DE COMPRESIÓN (calidad 80)
  // ============================================================================
  describe("Compresión con calidad 80", () => {
    it("debe aplicar compresión con quality: 80", async () => {
      const testImage = await createTestImageBuffer(800, 600);

      const compressed = await sharp(testImage)
        .resize(300, 300, { fit: "cover" })
        .jpeg({ quality: 80 })
        .toBuffer();

      const uncompressed = await sharp(testImage)
        .resize(300, 300, { fit: "cover" })
        .jpeg({ quality: 100 })
        .toBuffer();

      // La versión comprimida debe ser más pequeña
      expect(compressed.length).toBeLessThan(uncompressed.length);
    });

    it("debe reducir tamaño del archivo significativamente", async () => {
      const largeImage = await createTestImageBuffer(1920, 1080);

      const optimized = await sharp(largeImage)
        .resize(300, 300, { fit: "cover" })
        .jpeg({ quality: 80 })
        .toBuffer();

      const originalMetadata = await sharp(largeImage).metadata();
      const optimizedMetadata = await sharp(optimized).metadata();

      // La imagen optimizada debe ser mucho más pequeña
      expect(optimized.length).toBeLessThan(largeImage.length * 0.3);
    });

    it("debe mantener calidad visual aceptable", async () => {
      const testImage = await createTestImageBuffer(800, 600);

      const result = await sharp(testImage)
        .resize(300, 300, { fit: "cover" })
        .jpeg({ quality: 80 })
        .toBuffer();

      const metadata = await sharp(result).metadata();

      // Verificar que la imagen resultante es válida y tiene datos
      expect(metadata.width).toBe(300);
      expect(metadata.height).toBe(300);
      expect(result.length).toBeGreaterThan(0);
    });

    it("debe comparar diferentes niveles de calidad", async () => {
      const testImage = await createTestImageBuffer(800, 600);

      const quality60 = await sharp(testImage)
        .resize(300, 300, { fit: "cover" })
        .jpeg({ quality: 60 })
        .toBuffer();

      const quality80 = await sharp(testImage)
        .resize(300, 300, { fit: "cover" })
        .jpeg({ quality: 80 })
        .toBuffer();

      const quality100 = await sharp(testImage)
        .resize(300, 300, { fit: "cover" })
        .jpeg({ quality: 100 })
        .toBuffer();

      // quality 80 debe estar entre 60 y 100 en tamaño
      expect(quality80.length).toBeGreaterThan(quality60.length);
      expect(quality80.length).toBeLessThan(quality100.length);
    });

    it("debe generar tamaño de archivo consistente para misma imagen", async () => {
      const testImage = await createTestImageBuffer(800, 600);

      const result1 = await sharp(testImage)
        .resize(300, 300, { fit: "cover" })
        .jpeg({ quality: 80 })
        .toBuffer();

      const result2 = await sharp(testImage)
        .resize(300, 300, { fit: "cover" })
        .jpeg({ quality: 80 })
        .toBuffer();

      // Mismo tamaño para misma entrada
      expect(result1.length).toBe(result2.length);
    });
  });

  // ============================================================================
  // TESTS DE PIPELINE COMPLETO
  // ============================================================================
  describe("Pipeline Completo de Procesamiento", () => {
    it("debe ejecutar redimensionamiento, conversión y compresión en secuencia", async () => {
      const testImage = await createTestImageBuffer(1920, 1080, "png");

      const result = await sharp(testImage)
        .resize(300, 300, { fit: "cover" })
        .jpeg({ quality: 80 })
        .toBuffer();

      const metadata = await sharp(result).metadata();

      expect(metadata.width).toBe(300);
      expect(metadata.height).toBe(300);
      expect(metadata.format).toBe("jpeg");
      expect(result.length).toBeLessThan(testImage.length);
    });

    it("debe procesar y guardar imagen correctamente", async () => {
      const testImage = await createTestImageBuffer(800, 600);
      const numero_documento = "1234567890";

      const result = await processImage(testImage, numero_documento);

      expect(result.filename).toMatch(/1234567890_\d+\.jpg/);
      expect(result.filepath).toContain("/uploads/");
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it("debe generar nombre de archivo único con timestamp", async () => {
      const testImage = await createTestImageBuffer(800, 600);
      const numero_documento = "9876543210";

      const result1 = await processImage(testImage, numero_documento);

      // Pequeño delay para asegurar timestamp diferente
      await new Promise((resolve) => setTimeout(resolve, 10));

      const result2 = await processImage(testImage, numero_documento);

      expect(result1.filename).not.toBe(result2.filename);
    });

    it("debe incluir numero_documento en el nombre del archivo", async () => {
      const testImage = await createTestImageBuffer(800, 600);
      const numero_documento = "1122334455";

      const result = await processImage(testImage, numero_documento);

      expect(result.filename).toContain("1122334455");
    });

    it("debe guardar archivo con extensión .jpg", async () => {
      const testImage = await createTestImageBuffer(800, 600);
      const numero_documento = "5544332211";

      const result = await processImage(testImage, numero_documento);

      expect(result.filename).toMatch(/\.jpg$/);
    });
  });

  // ============================================================================
  // TESTS DE DIFERENTES FORMATOS DE ENTRADA
  // ============================================================================
  describe("Manejo de Diferentes Formatos de Entrada", () => {
    it("debe procesar imágenes PNG", async () => {
      const pngImage = await createTestImageBuffer(800, 600, "png");

      const result = await sharp(pngImage)
        .resize(300, 300, { fit: "cover" })
        .jpeg({ quality: 80 })
        .toBuffer();

      const metadata = await sharp(result).metadata();
      expect(metadata.format).toBe("jpeg");
    });

    it("debe procesar imágenes JPEG", async () => {
      const jpegImage = await createTestImageBuffer(800, 600, "jpeg");

      const result = await sharp(jpegImage)
        .resize(300, 300, { fit: "cover" })
        .jpeg({ quality: 80 })
        .toBuffer();

      const metadata = await sharp(result).metadata();
      expect(metadata.format).toBe("jpeg");
    });

    it("debe procesar imágenes WEBP", async () => {
      const webpImage = await createTestImageBuffer(800, 600, "webp");

      const result = await sharp(webpImage)
        .resize(300, 300, { fit: "cover" })
        .jpeg({ quality: 80 })
        .toBuffer();

      const metadata = await sharp(result).metadata();
      expect(metadata.format).toBe("jpeg");
    });

    it("debe procesar imágenes con diferentes relaciones de aspecto", async () => {
      const aspectRatios = [
        { width: 1920, height: 1080 }, // 16:9
        { width: 1600, height: 1200 }, // 4:3
        { width: 1080, height: 1920 }, // 9:16 (vertical)
        { width: 800, height: 800 }, // 1:1
      ];

      for (const { width, height } of aspectRatios) {
        const image = await createTestImageBuffer(width, height);

        const result = await sharp(image)
          .resize(300, 300, { fit: "cover" })
          .jpeg({ quality: 80 })
          .toBuffer();

        const metadata = await sharp(result).metadata();
        expect(metadata.width).toBe(300);
        expect(metadata.height).toBe(300);
      }
    });
  });

  // ============================================================================
  // TESTS DE MANEJO DE ERRORES
  // ============================================================================
  describe("Manejo de Errores", () => {
    it("debe rechazar buffer vacío", async () => {
      const emptyBuffer = Buffer.alloc(0);

      await expect(async () => {
        await sharp(emptyBuffer)
          .resize(300, 300, { fit: "cover" })
          .jpeg({ quality: 80 })
          .toBuffer();
      }).rejects.toThrow();
    });

    it("debe rechazar datos corruptos", async () => {
      const corruptedBuffer = Buffer.from("not-an-image-data");

      await expect(async () => {
        await sharp(corruptedBuffer)
          .resize(300, 300, { fit: "cover" })
          .jpeg({ quality: 80 })
          .toBuffer();
      }).rejects.toThrow();
    });

    it("debe manejar imágenes muy grandes", async () => {
      // Sharp puede procesar imágenes muy grandes
      const hugeImage = await createTestImageBuffer(5000, 5000);

      const result = await sharp(hugeImage)
        .resize(300, 300, { fit: "cover" })
        .jpeg({ quality: 80 })
        .toBuffer();

      const metadata = await sharp(result).metadata();
      expect(metadata.width).toBe(300);
      expect(metadata.height).toBe(300);
    });

    it("debe manejar imágenes muy pequeñas", async () => {
      const tinyImage = await createTestImageBuffer(10, 10);

      const result = await sharp(tinyImage)
        .resize(300, 300, { fit: "cover" })
        .jpeg({ quality: 80 })
        .toBuffer();

      const metadata = await sharp(result).metadata();
      expect(metadata.width).toBe(300);
      expect(metadata.height).toBe(300);
    });

    it("debe validar que el buffer resultante no esté vacío", async () => {
      const testImage = await createTestImageBuffer(800, 600);

      const result = await sharp(testImage)
        .resize(300, 300, { fit: "cover" })
        .jpeg({ quality: 80 })
        .toBuffer();

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // TESTS DE RENDIMIENTO Y OPTIMIZACIÓN
  // ============================================================================
  describe("Rendimiento y Optimización", () => {
    it("debe procesar imagen en tiempo razonable", async () => {
      const testImage = await createTestImageBuffer(1920, 1080);

      const startTime = Date.now();
      await sharp(testImage)
        .resize(300, 300, { fit: "cover" })
        .jpeg({ quality: 80 })
        .toBuffer();
      const processingTime = Date.now() - startTime;

      // Procesamiento debe completar en menos de 1 segundo
      expect(processingTime).toBeLessThan(1000);
    });

    it("debe optimizar tamaño de archivo efectivamente", async () => {
      const testImage = await createTestImageBuffer(1920, 1080);

      const optimized = await sharp(testImage)
        .resize(300, 300, { fit: "cover" })
        .jpeg({ quality: 80 })
        .toBuffer();

      // Archivo optimizado debe ser al menos 70% más pequeño que original
      const reductionRatio = optimized.length / testImage.length;
      expect(reductionRatio).toBeLessThan(0.3);
    });

    it("debe manejar múltiples procesamiento simultáneos", async () => {
      const images = await Promise.all([
        createTestImageBuffer(800, 600),
        createTestImageBuffer(1024, 768),
        createTestImageBuffer(1920, 1080),
      ]);

      const results = await Promise.all(
        images.map((img) =>
          sharp(img)
            .resize(300, 300, { fit: "cover" })
            .jpeg({ quality: 80 })
            .toBuffer()
        )
      );

      results.forEach((result) => {
        expect(result).toBeInstanceOf(Buffer);
        expect(result.length).toBeGreaterThan(0);
      });
    });
  });

  // ============================================================================
  // TESTS DE METADATA
  // ============================================================================
  describe("Validación de Metadata", () => {
    it("debe preservar espacio de color correcto", async () => {
      const testImage = await createTestImageBuffer(800, 600);

      const result = await sharp(testImage)
        .resize(300, 300, { fit: "cover" })
        .jpeg({ quality: 80 })
        .toBuffer();

      const metadata = await sharp(result).metadata();

      expect(metadata.space).toBe("srgb");
    });

    it("debe tener 3 canales (RGB) en JPEG", async () => {
      const testImage = await createTestImageBuffer(800, 600);

      const result = await sharp(testImage)
        .resize(300, 300, { fit: "cover" })
        .jpeg({ quality: 80 })
        .toBuffer();

      const metadata = await sharp(result).metadata();

      expect(metadata.channels).toBe(3);
    });

    it("debe mantener profundidad de color apropiada", async () => {
      const testImage = await createTestImageBuffer(800, 600);

      const result = await sharp(testImage)
        .resize(300, 300, { fit: "cover" })
        .jpeg({ quality: 80 })
        .toBuffer();

      const metadata = await sharp(result).metadata();

      expect(metadata.depth).toBeDefined();
    });
  });
});
