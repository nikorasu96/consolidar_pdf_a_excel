// src/utils/__tests__/route.test.ts
jest.mock("p-limit", () => {
  return () => <T>(fn: () => T) => fn();
});

import { POST } from "@/app/api/convert/route";

describe("API route POST", () => {
test("retorna error si no se proporciona ningún archivo PDF", async () => {
  const formData = new FormData();
  formData.append("pdfFormat", "CERTIFICADO_DE_HOMOLOGACION");

  const request = new Request("http://localhost/api/convert", {
    method: "POST",
    body: formData,
  });

  const response = await POST(request);
  const data = await response.json();

  expect(response.status).toBe(400);
  expect(data.error).toMatch(/No se proporcionó ningún archivo PDF/);
});
});
