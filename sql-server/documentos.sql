
-- ================================================
-- Script para crear las tablas para cada tipo de PDF
-- ================================================


USE PDFExcelDB;

GO



-- 1. Tabla para Certificado de Homologación
IF OBJECT_ID('dbo.CertificadoHomologacion', 'U') IS NOT NULL
    DROP TABLE dbo.CertificadoHomologacion;
GO

CREATE TABLE dbo.CertificadoHomologacion (
  Id INT IDENTITY(1,1) PRIMARY KEY,
  FechaDeEmision DATE NULL,               -- Ejemplo: '2025-01-01'
  NumeroCorrelativo VARCHAR(50) NULL,     -- Ejemplo: "ABC-123"
  CodigoInformeTecnico VARCHAR(50) NULL,  -- Ejemplo: "XYZ-789"
  Patente VARCHAR(50) NULL,               -- Ejemplo: "ABC123"
  ValidoHasta DATE NULL,                  -- Ejemplo: '2025-12-31'
  TipoDeVehiculo VARCHAR(50) NULL,         -- Ejemplo: "CAMION"
  Marca VARCHAR(50) NULL,                  -- Ejemplo: "TOYOTA"
  Ano INT NULL,                           -- Ejemplo: 2020
  Modelo VARCHAR(100) NULL,               -- Ejemplo: "Corolla"
  Color VARCHAR(50) NULL,                 -- Ejemplo: "AZUL"
  VIN VARCHAR(50) NULL,                   -- Ejemplo: "1HGCM82633A004352"
  NumeroMotor VARCHAR(50) NULL,           -- Ejemplo: "123456789"
  FirmadoPor VARCHAR(100) NULL,           -- Ejemplo: "JUAN PÉREZ"
  CreatedAt DATETIME DEFAULT GETDATE()
);
GO

-- 2. Tabla para Certificado de Revisión Técnica (CRT)
IF OBJECT_ID('dbo.CertificadoRevisionTecnica', 'U') IS NOT NULL
    DROP TABLE dbo.CertificadoRevisionTecnica;
GO

CREATE TABLE dbo.CertificadoRevisionTecnica (
  Id INT IDENTITY(1,1) PRIMARY KEY,
  FechaRevision DATE NULL,                -- Ejemplo: '2023-10-10'
  Planta VARCHAR(50) NULL,                -- Ejemplo: "PLANTA-01"
  PlacaPatente VARCHAR(50) NULL,          -- Ejemplo: "ABC123"
  ValidoHasta DATE NULL,                  -- Ejemplo: '2023-12-31'
  CreatedAt DATETIME DEFAULT GETDATE()
);
GO

-- 3. Tabla para Seguro Obligatorio (SOAP)
IF OBJECT_ID('dbo.SeguroObligatorioSoap', 'U') IS NOT NULL
    DROP TABLE dbo.SeguroObligatorioSoap;
GO

CREATE TABLE dbo.SeguroObligatorioSoap (
  Id INT IDENTITY(1,1) PRIMARY KEY,
  InscripcionRVM VARCHAR(50) NULL,        -- Ejemplo: "LXWJ75-4"
  BajoElCodigo VARCHAR(50) NULL,          -- Ejemplo: "ABC123"
  RUT VARCHAR(50) NULL,                   -- Ejemplo: "97006000-6"
  RigeDesde DATE NULL,                    -- Ejemplo: '2025-01-01'
  Hasta DATE NULL,                        -- Ejemplo: '2025-12-31'
  PolizaN VARCHAR(50) NULL,               -- Ejemplo: "POL123"
  Prima DECIMAL(10,2) NULL,               -- Ejemplo: 100.50
  CreatedAt DATETIME DEFAULT GETDATE()
);
GO

-- 4. Tabla para Permiso de Circulación
IF OBJECT_ID('dbo.PermisoCirculacion', 'U') IS NOT NULL
    DROP TABLE dbo.PermisoCirculacion;
GO

CREATE TABLE dbo.PermisoCirculacion (
  Id INT IDENTITY(1,1) PRIMARY KEY,
  PlacaUnica VARCHAR(50) NULL,            -- Ejemplo: "ABC-123"
  CodigoSII VARCHAR(50) NULL,             -- Ejemplo: "SII456"
  ValorPermiso INT NULL,                  -- Ejemplo: 1000
  PagoTotal BIT NULL,                     -- 1 si se marca "X", 0 si es "No aplica"
  PagoCuota1 BIT NULL,                    -- 1 si se marca "X", 0 si es "No aplica"
  PagoCuota2 BIT NULL,                    -- 1 si se marca "X", 0 si es "No aplica"
  TotalAPagar INT NULL,                   -- Ejemplo: 1500
  FechaEmision DATE NULL,                 -- Ejemplo: '2025-01-01'
  FechaVencimiento DATE NULL,             -- Ejemplo: '2025-12-31'
  FormaDePago VARCHAR(50) NULL,           -- Ejemplo: "EFECTIVO"
  CreatedAt DATETIME DEFAULT GETDATE()
);
GO
