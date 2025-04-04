// // app/api/ocr/route.ts
// import { NextResponse } from 'next/server';
// import { createWorker, Worker as TesseractWorker } from 'tesseract.js';

// export const runtime = 'nodejs';

// export async function POST(request: Request) {
//   try {
//     const formData = await request.formData();
//     const imageFile = formData.get('image') as File;
//     if (!imageFile) {
//       return NextResponse.json({ error: 'No se proporcionó ninguna imagen.' }, { status: 400 });
//     }

//     const arrayBuffer = await imageFile.arrayBuffer();
//     const buffer = Buffer.from(arrayBuffer);

//     // 👇 Fíjate que hacemos un CAST a TesseractWorker para que TS no se queje.
//     const worker = createWorker({
//       logger: m => console.log(m)
//     }) as unknown as TesseractWorker;

//     await worker.load();
//     await worker.loadLanguage('eng');
//     await worker.initialize('eng');

//     const { data: { text } } = await worker.recognize(buffer);
//     await worker.terminate();

//     return NextResponse.json({ text });
//   } catch (error: any) {
//     console.error("Error en OCR:", error);
//     return NextResponse.json({ error: error.message || 'Error en OCR.' }, { status: 500 });
//   }
// }
