# AGENTS.md

## Objetivo del proyecto

Backend en **Bun** para exponer endpoints HTTP dedicados a la **compresión y optimización de imágenes**.

El sistema debe aceptar imágenes de distintos tipos, procesarlas, comprimirlas y devolver una respuesta eficiente, segura y mantenible.

Formatos esperados:

* JPG / JPEG
* PNG
* WEBP
* AVIF
* GIF, si aplica
* SVG, si aplica

---

# Principios generales

## Clean Architecture

El proyecto debe separar claramente las responsabilidades en capas:

```txt
src/
  modules/
    image-compression/
      domain/
      application/
      infrastructure/
      presentation/
  shared/
```

Cada feature debe poder evolucionar sin depender directamente de frameworks, librerías externas o detalles técnicos.

---

# Capas

## Domain

Contiene reglas puras de negocio.

No debe importar:

* Bun
* Hono / Elysia / Express
* Sharp
* filesystem
* servicios externos
* HTTP

Ejemplos:

```txt
domain/
  entities/
    ImageFile.ts
    CompressionOptions.ts
    CompressionResult.ts

  errors/
    InvalidImageTypeError.ts
    ImageTooLargeError.ts

  services/
    ImageValidationService.ts
```

Reglas típicas:

* validar tamaño máximo
* validar formato permitido
* validar calidad mínima/máxima
* validar dimensiones
* definir contratos de compresión

---

## Application

Contiene casos de uso.

Ejemplos:

```txt
application/
  use-cases/
    CompressImageUseCase.ts
    CompressBatchImagesUseCase.ts

  ports/
    ImageCompressorPort.ts
    ImageStoragePort.ts
    ImageMetadataReaderPort.ts

  dtos/
    CompressImageInput.ts
    CompressImageOutput.ts
```

Los casos de uso coordinan el flujo, pero no conocen detalles técnicos.

Ejemplo:

```ts
export class CompressImageUseCase {
  constructor(
    private readonly compressor: ImageCompressorPort,
  ) {}

  async execute(input: CompressImageInput): Promise<CompressImageOutput> {
    // validar input
    // comprimir imagen
    // devolver resultado
  }
}
```

---

## Infrastructure

Contiene implementaciones concretas.

Ejemplos:

```txt
infrastructure/
  compressors/
    SharpImageCompressor.ts

  storage/
    LocalTempStorage.ts

  metadata/
    SharpImageMetadataReader.ts
```

Acá sí pueden usarse librerías como:

* sharp
* fs
* Bun.file
* S3 SDK
* logs
* métricas

---

## Presentation

Contiene endpoints, controllers, schemas y validaciones HTTP.

Ejemplos:

```txt
presentation/
  routes/
    imageCompressionRoutes.ts

  controllers/
    ImageCompressionController.ts

  schemas/
    compressImageSchema.ts
```

La capa HTTP debe ser fina.

No debe contener lógica de negocio.

---

# SOLID

## Single Responsibility Principle

Cada clase debe tener una sola razón para cambiar.

Mal:

```ts
class ImageService {
  validate() {}
  compress() {}
  saveToDisk() {}
  sendHttpResponse() {}
}
```

Bien:

```ts
ImageValidationService
CompressImageUseCase
SharpImageCompressor
ImageCompressionController
```

---

## Open / Closed Principle

El sistema debe permitir agregar nuevos compresores sin modificar casos de uso.

Ejemplo:

```ts
interface ImageCompressorPort {
  compress(input: ImageCompressionRequest): Promise<ImageCompressionResult>;
}
```

Implementaciones posibles:

```txt
SharpImageCompressor
SquooshImageCompressor
RemoteImageCompressor
```

---

## Liskov Substitution Principle

Cualquier implementación de `ImageCompressorPort` debe poder reemplazarse sin romper el caso de uso.

---

## Interface Segregation Principle

Evitar interfaces gigantes.

Mal:

```ts
interface ImageService {
  compress(): Promise<void>;
  resize(): Promise<void>;
  upload(): Promise<void>;
  delete(): Promise<void>;
}
```

Bien:

```ts
ImageCompressorPort
ImageStoragePort
ImageMetadataReaderPort
```

---

## Dependency Inversion Principle

Las capas internas no deben depender de detalles externos.

El caso de uso depende de una abstracción:

```ts
ImageCompressorPort
```

No de:

```ts
SharpImageCompressor
```

---

# Estructura recomendada

```txt
src/
  main.ts

  modules/
    image-compression/
      domain/
        entities/
          ImageFile.ts
          CompressionOptions.ts
          CompressionResult.ts
        errors/
          InvalidImageTypeError.ts
          ImageTooLargeError.ts
        services/
          ImageValidationService.ts

      application/
        dtos/
          CompressImageInput.ts
          CompressImageOutput.ts
        ports/
          ImageCompressorPort.ts
          ImageMetadataReaderPort.ts
        use-cases/
          CompressImageUseCase.ts

      infrastructure/
        compressors/
          SharpImageCompressor.ts
        metadata/
          SharpImageMetadataReader.ts

      presentation/
        controllers/
          ImageCompressionController.ts
        routes/
          imageCompressionRoutes.ts
        schemas/
          compressImageSchema.ts

  shared/
    errors/
      AppError.ts
    http/
      errorHandler.ts
    config/
      env.ts
    logger/
      logger.ts
```

---

# Reglas para endpoints

Los endpoints deben delegar inmediatamente al controller o use case.

Ejemplo esperado:

```ts
POST /images/compress
```

Responsabilidades del endpoint:

* recibir archivo
* validar request básica
* llamar al controller
* devolver respuesta

No debe:

* comprimir directamente
* usar Sharp directamente
* guardar archivos directamente
* tener lógica de negocio

---

# Casos de uso esperados

## CompressImageUseCase

Responsabilidades:

* recibir archivo
* validar tipo
* validar tamaño
* aplicar opciones de compresión
* ejecutar compresor
* devolver buffer o archivo resultante

Input sugerido:

```ts
type CompressImageInput = {
  file: File | Blob | Uint8Array;
  filename: string;
  mimeType: string;
  quality?: number;
  outputFormat?: "jpeg" | "png" | "webp" | "avif";
  maxWidth?: number;
  maxHeight?: number;
};
```

Output sugerido:

```ts
type CompressImageOutput = {
  buffer: Uint8Array;
  mimeType: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  filename: string;
};
```

---

# Librerías externas

Las librerías externas deben quedar encapsuladas en infrastructure.

Ejemplo:

```ts
SharpImageCompressor
```

Ningún use case debe importar `sharp`.

---

# Manejo de errores

Usar errores propios del dominio o aplicación.

Ejemplos:

```txt
InvalidImageTypeError
ImageTooLargeError
CompressionFailedError
InvalidCompressionOptionsError
```

No devolver errores crudos de librerías externas.

---

# Validaciones importantes

Validar:

* MIME type
* extensión
* tamaño máximo del archivo
* dimensiones máximas
* calidad entre 1 y 100
* formato de salida permitido
* cantidad máxima de archivos en batch
* que el archivo realmente sea una imagen

---

# Seguridad

Tener en cuenta:

* limitar tamaño máximo de upload
* evitar nombres de archivo inseguros
* no confiar solamente en la extensión
* limpiar archivos temporales
* no exponer paths internos
* evitar procesar imágenes demasiado grandes
* configurar timeout de compresión
* controlar memoria usada por procesos batch

---

# Performance

Recomendaciones:

* usar streams cuando sea posible
* evitar cargar múltiples imágenes grandes en memoria
* usar límites para batch compression
* medir tiempo de compresión
* devolver métricas básicas
* permitir configurar calidad por defecto
* evitar bloquear innecesariamente el event loop

---

# Testing

Priorizar tests de:

```txt
domain/
application/
```

Tests recomendados:

* imagen válida
* imagen inválida
* formato no soportado
* archivo demasiado grande
* calidad fuera de rango
* compresión exitosa
* error del adapter externo
* batch parcial con errores

---

# Convenciones

## Naming

Usar nombres explícitos:

```txt
CompressImageUseCase
ImageCompressorPort
SharpImageCompressor
ImageCompressionController
```

Evitar nombres genéricos:

```txt
Service
Manager
Helper
Utils
```

---

# Regla principal

La lógica de negocio debe poder probarse sin levantar Bun, sin HTTP y sin Sharp.

Si un caso de uso necesita Bun, HTTP o Sharp para funcionar, la arquitectura está mal separada.

---

# Objetivo final

El backend debe ser:

* simple
* testeable
* extensible
* seguro
* fácil de refactorizar
* preparado para agregar nuevos formatos, storage o estrategias de compresión sin romper el core

---

## Flujo principal

El backend expone un endpoint:

```txt
POST /images/compress
```

Recibe:

```txt
multipart/form-data
  file: imagen original
  quality?: number
  outputFormat?: jpeg | png | webp | avif
  maxWidth?: number
  maxHeight?: number
```

Devuelve:

```txt
200 OK
Content-Type: image/webp
Content-Disposition: attachment; filename="optimized-image.webp"

Body: archivo optimizado
```

---

# Regla importante

El endpoint no debe devolver solamente metadata.

Debe devolver directamente el archivo optimizado.

La metadata puede enviarse opcionalmente en headers:

```txt
X-Original-Size: 2450000
X-Compressed-Size: 580000
X-Compression-Ratio: 76.3
X-Output-Format: webp
```

---

# Use case principal

```ts
CompressImageUseCase
```

Input:

```ts
type CompressImageInput = {
  fileBuffer: Uint8Array;
  originalFilename: string;
  mimeType: string;
  quality?: number;
  outputFormat?: "jpeg" | "png" | "webp" | "avif";
  maxWidth?: number;
  maxHeight?: number;
};
```

Output:

```ts
type CompressImageOutput = {
  fileBuffer: Uint8Array;
  filename: string;
  mimeType: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
};
```

---

# Controller esperado

El controller debe:

1. leer el archivo del request
2. convertirlo a `Uint8Array`
3. llamar al `CompressImageUseCase`
4. devolver una response binaria

Ejemplo conceptual:

```ts
return new Response(result.fileBuffer, {
  status: 200,
  headers: {
    "Content-Type": result.mimeType,
    "Content-Disposition": `attachment; filename="${result.filename}"`,
    "X-Original-Size": String(result.originalSize),
    "X-Compressed-Size": String(result.compressedSize),
    "X-Compression-Ratio": String(result.compressionRatio),
  },
});
```

---

# Temp file

Si se usa archivo temporal, debe pertenecer a infrastructure.

Ejemplo:

```txt
infrastructure/
  temp/
    BunTempFileStorage.ts
```

Puerto:

```ts
interface TempFileStoragePort {
  write(input: {
    buffer: Uint8Array;
    filename: string;
  }): Promise<{
    path: string;
    filename: string;
    size: number;
  }>;

  delete(path: string): Promise<void>;
}
```

Regla:

* El use case puede pedir guardar un archivo temporal mediante un puerto.
* La implementación concreta con `Bun.write`, `/tmp`, filesystem o S3 temporal queda en infrastructure.
* El controller puede leer el temp file y devolverlo como response.
* El archivo temporal debe limpiarse después de responder o mediante job de limpieza.

---

# Flujo recomendado con temp file

```txt
Request multipart
  ↓
Controller
  ↓
CompressImageUseCase
  ↓
ImageCompressorPort
  ↓
TempFileStoragePort
  ↓
Response binaria
  ↓
Cleanup temp file
```

---

# Respuesta recomendada

Aunque internamente se use temp file, el cliente debería recibir directamente el archivo optimizado.

No recomendaría devolver solamente esto:

```json
{
  "tempFile": "/tmp/optimized.webp"
}
```

Porque expone detalles internos y obliga al cliente a hacer otra request.

Mejor:

```txt
POST /images/compress
→ devuelve el archivo optimizado directamente
```

Si necesitás devolver una URL temporal, crear otro flujo separado:

```txt
POST /images/compress-to-temp
→ devuelve { downloadUrl, expiresAt }
```
