// components/InstructionsModal.tsx
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
              <li>
                Selecciona uno o más archivos PDF arrastrándolos o haciendo clic en
                el área designada.
              </li>
              <li>
                Elige el formato de PDF correspondiente mediante los botones:
                <br />
                - <strong>Certificado de Homologación</strong>
                <br />
                - <strong>Certificado de Revisión Técnica (CRT)</strong>
                <br />
                - <strong>Seguro Obligatorio (SOAP)</strong>
                <br />
                - <strong>Permiso de Circulación</strong>
              </li>
              <li>
                Ten en cuenta que mientras más archivos se procesen, el tiempo de
                conversión será mayor.
              </li>
              <li>
                Al finalizar, se mostrará un resumen del procesamiento en tiempo real.
              </li>
              <li>
                Al descargar el archivo Excel, éste se nombrará según la opción que
                elegiste (por ejemplo, "Certificado de Homologación.xlsx").
              </li>
            </ul>
            <p>
              Asegúrate de que los archivos sean PDFs válidos y correspondan al formato
              seleccionado. ¡Buena suerte!
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
