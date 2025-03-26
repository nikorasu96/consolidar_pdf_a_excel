# Convertidor PDF a EXCEL

Este proyecto es una aplicación web creada con [Next.js](https://nextjs.org/) (versión 15.2.4) utilizando TypeScript y Bootstrap. Su funcionalidad principal es la carga de archivos PDF, su validación y la conversión de los datos extraídos a un archivo Excel consolidado.

## Características

- **Carga de archivos PDF:** Permite seleccionar múltiples archivos y valida que sean PDFs y que no excedan el tamaño máximo configurado.
- **Procesamiento y extracción de datos:** Utiliza `pdf2json` para extraer información de los PDFs.
- **Generación de archivo Excel:** Con los datos extraídos se genera un archivo Excel utilizando `xlsx-populate`.
- **Limitación de concurrencia:** Procesa hasta 3 PDFs de forma simultánea gracias a `p-limit`.

## Dependencias necesarias

El proyecto utiliza las siguientes dependencias:

- **Next.js:** Framework para React.
- **React y React-DOM:** Para la renderización de componentes.
- **Bootstrap:** Framework CSS para el diseño.
- **TypeScript:** Para el tipado estático.
- **pdf2json:** Para parsear y extraer datos de PDFs.
- **xlsx-populate:** Para la creación y manipulación de archivos Excel.
- **p-limit:** Para limitar la concurrencia en el procesamiento de PDFs.

También se utilizan herramientas de desarrollo y testing:

- **Jest:** Para pruebas unitarias.
- **ts-jest:** Transformador de TypeScript para Jest.

## Instalación

1. **Clona el repositorio:**

   ```bash
   git clone https://tu-repositorio-url.git
   cd my-next-project
   ```

2. **Instala las dependencias:**

   ```bash
   npm install
   ```

## Configuración

### Variables de entorno

Crea un archivo `.env.local` en la raíz del proyecto y agrega la siguiente línea para definir el tamaño máximo permitido para los archivos (en bytes):

```env
NEXT_PUBLIC_MAX_FILE_SIZE=5242880
```

### Definiciones de tipos

Se incluye un archivo `global.d.ts` para declarar el módulo `xlsx-populate` y evitar errores de tipado en TypeScript.

## Scripts disponibles

### Desarrollo

Ejecuta la aplicación en modo desarrollo:

```bash
npm run dev
```

### Construcción

Construye la aplicación para producción:

```bash
npm run build
```

### Inicio en producción

Inicia la aplicación en modo producción:

```bash
npm run start
```

### Pruebas

Ejecuta las pruebas unitarias con Jest:

```bash
npm run test
```

## Estructura del proyecto

```bash
src/
├── app/
│   ├── layout.tsx         # Layout base de la aplicación
│   ├── page.tsx           # Página principal (carga y conversión)
│   └── api/
│       └── convert/
│           └── route.ts   # Endpoint para conversión de PDFs a Excel
├── components/
│   └── FileUpload.tsx     # Componente reutilizable
├── utils/
│   ├── fileUtils.ts       # Utilidades para manejo de archivos
│   ├── pdfUtils.ts        # Utilidades para procesamiento de PDFs
│   └── excelUtils.ts      # Utilidades para generación de Excel
tests/                     # (Opcional) Archivos de pruebas unitarias
```

## Notas adicionales

- **Lectura de PDFs:** Se utiliza la librería `pdf2json` para extraer el texto. Asegúrate de que el contenido esté en un formato legible por la librería.
- **Generación de Excel:** Se realiza con `xlsx-populate`, que permite manipular hojas de cálculo programáticamente.
- **Concurrencia:** El procesamiento se limita a 3 PDFs simultáneos con `p-limit` para evitar saturar el servidor.

## Contribuciones

Las contribuciones son bienvenidas. Si encuentras algún error o tienes sugerencias, por favor crea un issue o envía un pull request.

## Licencia

Este proyecto se distribuye bajo la licencia MIT.
