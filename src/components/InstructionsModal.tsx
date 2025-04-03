// src/components/InstructionsModal.tsx
"use client";

interface InstructionsModalProps {
  onClose: () => void;
}

export default function InstructionsModal({ onClose }: InstructionsModalProps) {
  return (
    <div
      className="modal d-block instructions-modal"
      tabIndex={-1}
      role="dialog"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
    >
      <div className="modal-dialog modal-dialog-centered modal-lg" role="document">
        <div className="modal-content instructions-modal-content">
          <div className="modal-header instructions-modal-header">
            <h5 className="modal-title">Instrucciones de Uso</h5>
            <button
              type="button"
              className="btn-close instructions-modal-close"
              onClick={onClose}
              aria-label="Cerrar"
            ></button>
          </div>
          <div className="modal-body instructions-modal-body">
            <p>
              Bienvenido a la aplicación de conversión de PDFs a Excel. Para comenzar:
            </p>
            <ul>
              <li>
                Selecciona uno o más archivos PDF arrastrándolos o haciendo clic en el área designada.
              </li>
              <li>
                Elige el formato de PDF correspondiente mediante los botones:
                <ul>
                  <li>
                    <strong>Certificado de Homologación</strong>
                  </li>
                  <li>
                    <strong>Certificado de Revisión Técnica (CRT)</strong>
                  </li>
                  <li>
                    <strong>Seguro Obligatorio (SOAP)</strong>
                  </li>
                  <li>
                    <strong>Permiso de Circulación</strong>
                  </li>
                </ul>
              </li>
              <li>
                Mientras más archivos se procesen, mayor será el tiempo de conversión.
              </li>
              <li>
                Al finalizar, se mostrará un resumen del procesamiento en tiempo real.
              </li>
              <li>
                Al descargar el archivo Excel, se nombrará según la opción elegida (por ejemplo, "Certificado de Homologación.xlsx").
              </li>
            </ul>
            <p>
              Asegúrate de que los archivos sean PDFs válidos y correspondan al formato seleccionado. ¡Buena suerte!
            </p>
          </div>
          <div className="modal-footer instructions-modal-footer">
            <button type="button" className="btn btn-primary" onClick={onClose}>
              Entendido
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
