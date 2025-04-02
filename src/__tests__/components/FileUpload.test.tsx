// __tests__/components/FileUpload.test.tsx
import React from "react";
import { render, fireEvent, screen } from "@testing-library/react";
import FileUpload from "@/components/FileUpload";
// No hace falta importar "@testing-library/jest-dom" aquí
// si ya lo importaste en tu jest.setup.ts

describe("FileUpload Component", () => {
  test("muestra error si se selecciona un archivo no válido", () => {
    const handleFilesChange = jest.fn();
    render(<FileUpload onFilesChange={handleFilesChange} clearTrigger={false} disabled={false} />);

    // Localiza el input; podrías necesitar un data-testid en tu componente
    const input = screen.getByRole("textbox", { hidden: true }) 
      || screen.getByTestId("file-input");

    // Simula un evento de cambio con un archivo .txt
    const file = new File(["dummy content"], "test.txt", { type: "text/plain" });
    fireEvent.change(input, { target: { files: [file] } });

    // Esperas que la función se haya llamado con "null" o algún error
    expect(handleFilesChange).toHaveBeenCalled();

    // Revisa que aparezca el error en pantalla (según tu componente)
    expect(screen.getByText(/no es válido/i)).toBeInTheDocument();
  });
});
