# OF Image Compressor

API HTTP en **Bun** + **TypeScript** para compresión y optimización de **imágenes** y **videos**. Implementa **Clean Architecture**, **SOLID** y **Ports & Adapters**.

## Requisitos

- [Bun](https://bun.sh) 1.x
- [ffmpeg](https://ffmpeg.org/) y **ffprobe** en el `PATH` (o configurá `FFMPEG_PATH` / `FFPROBE_PATH`) para compresión de video

## Inicio rápido

```bash
cp .env.example .env
bun install
bun run dev
```

El servidor arranca en `http://localhost:3000` con cluster automático por CPU.

## Endpoints

### `POST /api/v1/images/compress`

**Content-Type:** `multipart/form-data`

| Campo          | Tipo    | Requerido | Descripción                          |
|----------------|---------|-----------|--------------------------------------|
| `file`         | binary  | Sí        | Imagen a comprimir                   |
| `quality`      | integer | No        | Calidad 1–100 (default: 80)          |
| `outputFormat` | string  | No        | `jpeg`, `png`, `webp`, `avif`        |
| `maxWidth`     | integer | No        | Ancho máximo en píxeles              |
| `maxHeight`    | integer | No        | Alto máximo en píxeles               |
| `aspectRatio`  | string  | No        | Ratio de aspecto en formato `W:H` (ej. `16:9`, `1:1`). Recorta la imagen centrada al ratio indicado. Opcionalmente combinado con `maxWidth`/`maxHeight` |

**Respuesta:** archivo optimizado en binario con headers:

- `Content-Type`
- `Content-Disposition`
- `X-Original-Size`
- `X-Compressed-Size`
- `X-Compression-Ratio`
- `X-Output-Format`

#### Ejemplo con curl

```bash
curl -X POST http://localhost:3000/api/v1/images/compress \
  -F "file=@./photo.jpg" \
  -F "quality=75" \
  -F "outputFormat=webp" \
  -F "aspectRatio=16:9" \
  -F "maxWidth=1920" \
  -o optimized.webp \
  -D headers.txt
```

### `POST /api/v1/videos/compress`

**Content-Type:** `multipart/form-data`

| Campo          | Tipo    | Requerido | Descripción |
|----------------|---------|-----------|-------------|
| `file`         | binary  | Sí        | Video a comprimir |
| `quality`      | integer | No        | Calidad UX 1–100 (se mapea a CRF de ffmpeg). Si se omite, usa `DEFAULT_VIDEO_CRF` |
| `outputFormat` | string  | No        | `mp4`, `webm` (default: `mp4`) |
| `maxWidth`     | integer | No        | Ancho máximo en píxeles |
| `maxHeight`    | integer | No        | Alto máximo en píxeles |

**Respuesta:** `text/event-stream` (SSE)

```txt
event: progress
data: {"percent":42.5}

event: complete
data: {"downloadUrl":"/api/v1/videos/download/<id>","filename":"...","mimeType":"video/mp4","originalSize":N,"compressedSize":M,"compressionRatio":R,"expiresAt":"..."}

event: error
data: {"code":"...","message":"..."}
```

### `GET /api/v1/videos/download/:id`

Descarga el video comprimido (binario). El archivo se elimina tras la descarga o al expirar el TTL.

Headers de métricas: `X-Original-Size`, `X-Compressed-Size`, `X-Compression-Ratio`, `X-Output-Format`.

#### Ejemplo con curl (SSE + download)

```bash
# Comprimir y capturar el stream SSE
curl -N -X POST http://localhost:3000/api/v1/videos/compress \
  -F "file=@./clip.mp4" \
  -F "quality=70" \
  -F "outputFormat=mp4"

# Luego descargar con el id del evento complete
curl -L "http://localhost:3000/api/v1/videos/download/<id>" -o optimized.mp4 -D headers.txt
```

## Documentación OpenAPI

- UI: [http://localhost:3000/docs](http://localhost:3000/docs)
- Spec JSON: [http://localhost:3000/docs/json](http://localhost:3000/docs/json)

## Variables de entorno

| Variable | Default | Descripción |
|------------------------------|---------|-------------|
| `PORT` | 3000 | Puerto HTTP |
| `MAX_UPLOAD_SIZE_MB` | 20 | Tamaño máximo de upload de imágenes |
| `MAX_IMAGE_WIDTH` | 10000 | Ancho máximo de imagen |
| `MAX_IMAGE_HEIGHT` | 10000 | Alto máximo de imagen |
| `DEFAULT_QUALITY` | 80 | Calidad por defecto (imágenes) |
| `DEFAULT_OUTPUT_FORMAT` | webp | Formato de salida por defecto (imágenes) |
| `MAX_VIDEO_UPLOAD_SIZE_MB` | 200 | Tamaño máximo de upload de videos |
| `MAX_VIDEO_DURATION_SECONDS` | 600 | Duración máxima del video |
| `DEFAULT_VIDEO_CRF` | 28 | CRF por defecto si no se envía `quality` |
| `DEFAULT_VIDEO_OUTPUT_FORMAT` | mp4 | Formato de salida por defecto (videos) |
| `FFMPEG_PATH` | ffmpeg | Binario de ffmpeg |
| `FFPROBE_PATH` | ffprobe | Binario de ffprobe |
| `VIDEO_TEMP_DIR` | `{tmpdir}/of-video-compressor` | Directorio de archivos temporales |
| `VIDEO_DOWNLOAD_TTL_SECONDS` | 300 | TTL de la URL de descarga |
| `CORS_ENABLED` | true | Habilita CORS |
| `CORS_ORIGIN` | `*` | Orígenes permitidos (`*` o lista separada por comas) |
| `CORS_CREDENTIALS` | false | Permite cookies/credentials |

## Scripts

```bash
bun run dev        # Desarrollo con hot reload
bun run start      # Producción local
bun run test       # Tests unitarios (Vitest)
bun run lint       # Biome check
bun run lint:fix   # Biome check + autofix
bun run format     # Biome format
```

## Docker

La imagen instala `ffmpeg` (incluye ffprobe).

```bash
cp .env.example .env
docker compose up --build
```

Healthcheck: `GET /health`

## Formatos soportados

### Imágenes

**Entrada:** JPEG, PNG, WebP, AVIF, GIF, SVG

**Salida:** JPEG, PNG, WebP, AVIF

> **GIF:** Sharp puede procesar GIFs animados; la compresión puede aplanar frames según opciones.
>
> **SVG:** Sharp rasteriza SVG a bitmap. Se aplican límites estrictos de tamaño por seguridad.

### Videos

**Entrada:** MP4, WebM, MOV, AVI, MKV

**Salida:** MP4 (H.264/AAC), WebM (VP9/Opus)

## Arquitectura

```
src/
  main.ts                 # Composition root (DI)
  index.ts                # Cluster bootstrap
  modules/
    image-compression/
      domain/             # Reglas de negocio puras
      application/        # Casos de uso y puertos
      infrastructure/     # Sharp (adapters)
      presentation/       # HTTP, Zod, OpenAPI
      composition/        # Wiring del módulo
    video-compression/
      domain/
      application/
      infrastructure/     # ffmpeg / ffprobe / temp / download store
      presentation/       # SSE + download
      composition/
  shared/                 # Config, errores, logger
```

### Capas

| Capa             | Responsabilidad                                              |
|------------------|--------------------------------------------------------------|
| **Domain**       | Entidades, value objects, validaciones, errores de negocio   |
| **Application**  | Use cases y puertos                                          |
| **Infrastructure** | Sharp / ffmpeg encapsulados                                |
| **Presentation** | Controller, routes, schemas Zod, documentación OpenAPI       |
| **Shared**       | Configuración, manejo global de errores, logging             |

### Escalabilidad futura

- Nuevos módulos siguen el patrón `createXModule()`
- Composition root centralizado en `main.ts`

## Errores

Respuesta JSON estándar (endpoints no-SSE):

```json
{
  "success": false,
  "error": {
    "code": "INVALID_IMAGE_TYPE",
    "message": "Unsupported image format"
  }
}
```

En el stream SSE de video, los errores mid-stream llegan como `event: error`.

Códigos: `INVALID_IMAGE_TYPE`, `IMAGE_TOO_LARGE`, `COMPRESSION_FAILED`, `INVALID_COMPRESSION_OPTIONS`, `INVALID_VIDEO_TYPE`, `VIDEO_TOO_LARGE`, `VIDEO_TOO_LONG`, `VIDEO_COMPRESSION_FAILED`, `INVALID_VIDEO_COMPRESSION_OPTIONS`, `VIDEO_DOWNLOAD_NOT_FOUND`, `INVALID_REQUEST`, `INTERNAL_ERROR`

## Tests

```bash
bun run test
```

Casos cubiertos:

- `CompressImageUseCase` (imagen válida, inválida, formato, calidad, error del compresor)
- `CompressVideoUseCase` / `DownloadCompressedVideoUseCase` (mocks de ports)
- Validación de dominio de video
