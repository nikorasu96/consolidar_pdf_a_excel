// src/components/InstructionsModal.tsx
"use client";

interface InstructionsModalProps {
  onClose: () => void;
}

export default function InstructionsModal({ onClose }: InstructionsModalProps) {
  return (
    <div
      className="modal d-block"
      tabIndex={-1}
      role="dialog"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
    >
      <div className="modal-dialog modal-dialog-centered" role="document">
        <div className="modal-content" style={{ color: "#000" }}>
          <div className="modal-header">
            <h5 className="modal-title">Instrucciones de Uso</h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              aria-label="Close"
            ></button>
          </div>
          <div className="modal-body">
            <p>
              Bienvenido a la aplicación de conversión de PDFs a Excel. Para comenzar:
            </p>
            <ul>
              <li>Selecciona uno o más archivos PDF.</li>
              <li>Elige el formato correspondiente al contenido del PDF.</li>
              <li>Haz clic en "Convertir" para iniciar el proceso.</li>
              <li>Revisa el progreso y, al finalizar, descarga el archivo Excel generado.</li>
            </ul>
            <p>
              Asegúrate de que los archivos sean PDFs válidos y correspondan al formato
              seleccionado.
            </p>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-primary" onClick={onClose}>
              Entendido
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
