// workers/pdfWorker.js
const { parentPort } = require("worker_threads");
const { procesarPDF } = require("../src/utils/pdfUtils");

parentPort.on("message", async ({ fileBuffer, fileName, pdfFormat, returnRegex }) => {
  try {
    // Creamos un objeto "pseudo File" para que la función procesarPDF funcione igual que antes
    const pseudoFile = {
      name: fileName,
      arrayBuffer: async () => Uint8Array.from(fileBuffer).buffer,
      size: fileBuffer.length,
      type: "application/pdf"
    };

    const result = await procesarPDF(pseudoFile, pdfFormat, returnRegex);
    parentPort.postMessage({ success: true, fileName, result });
  } catch (error) {
    parentPort.postMessage({ success: false, fileName, error: error.message });
  }
});
