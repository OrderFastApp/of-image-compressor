# OF Image Compressor

API HTTP en **Bun** + **TypeScript** para compresión y optimización de imágenes. Implementa **Clean Architecture**, **SOLID** y **Ports & Adapters**.

## Requisitos

- [Bun](https://bun.sh) 1.x

## Inicio rápido

```bash
cp .env.example .env
bun install
bun run dev
```

El servidor arranca en `http://localhost:3000` con cluster automático por CPU.

## Endpoint principal

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

### Ejemplo con curl

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

## Documentación OpenAPI

- UI: [http://localhost:3000/docs](http://localhost:3000/docs)
- Spec JSON: [http://localhost:3000/docs/json](http://localhost:3000/docs/json)

## Variables de entorno

| Variable                | Default | Descripción                        |
|-------------------------|---------|------------------------------------|
| `PORT`                  | 3000    | Puerto HTTP                        |
| `MAX_UPLOAD_SIZE_MB`    | 20      | Tamaño máximo de upload            |
| `MAX_IMAGE_WIDTH`       | 10000   | Ancho máximo de imagen             |
| `MAX_IMAGE_HEIGHT`      | 10000   | Alto máximo de imagen              |
| `DEFAULT_QUALITY`       | 80      | Calidad por defecto                |
| `DEFAULT_OUTPUT_FORMAT` | webp    | Formato de salida por defecto      |
| `CORS_ENABLED`          | true    | Habilita CORS                      |
| `CORS_ORIGIN`           | `*`     | Orígenes permitidos (`*` o lista separada por comas) |
| `CORS_CREDENTIALS`      | false   | Permite cookies/credentials        |

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

```bash
cp .env.example .env
docker compose up --build
```

Healthcheck: `GET /health`

## Formatos soportados

**Entrada:** JPEG, PNG, WebP, AVIF, GIF, SVG

**Salida:** JPEG, PNG, WebP, AVIF

> **GIF:** Sharp puede procesar GIFs animados; la compresión puede aplanar frames según opciones.
>
> **SVG:** Sharp rasteriza SVG a bitmap. Se aplican límites estrictos de tamaño por seguridad.

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
  shared/                 # Config, errores, logger
```

### Capas

| Capa             | Responsabilidad                                              |
|------------------|--------------------------------------------------------------|
| **Domain**       | Entidades, value objects, validaciones, errores de negocio   |
| **Application**  | `CompressImageUseCase`, puertos (`ImageCompressorPort`, etc.) |
| **Infrastructure** | Implementaciones Sharp encapsuladas                        |
| **Presentation** | Controller, routes, schemas Zod, documentación OpenAPI       |
| **Shared**       | Configuración, manejo global de errores, logging             |

### Escalabilidad futura

- Nuevos módulos (`resize`, `crop`, `watermark`) siguen el patrón `createXModule()`
- `ImageMetadataReaderPort` reutilizable entre operaciones
- Composition root centralizado en `main.ts`

## Errores

Respuesta JSON estándar:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_IMAGE_TYPE",
    "message": "Unsupported image format"
  }
}
```

Códigos: `INVALID_IMAGE_TYPE`, `IMAGE_TOO_LARGE`, `COMPRESSION_FAILED`, `INVALID_COMPRESSION_OPTIONS`, `INVALID_REQUEST`, `INTERNAL_ERROR`

## Tests

```bash
bun run test
```

Casos cubiertos en `CompressImageUseCase`:

- Imagen válida
- Imagen inválida (buffer vacío)
- Formato no soportado
- Calidad inválida
- Compresión exitosa con métricas
- Error del compresor
