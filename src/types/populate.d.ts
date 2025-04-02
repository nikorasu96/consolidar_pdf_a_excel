declare module "xlsx-populate" {
    // Definición mínima para el uso que se le da en el proyecto
    export interface Sheet {
      cell(row: number, col: number): {
        value(): any;
        value(newValue: any): any;
        style(key: string, value: any): any;
      };
      column(index: number): {
        width(): number;
        width(newWidth: number): any;
        style(key: string, value: any): any;
      };
      row(index: number): {
        height(): number;
        height(newHeight: number): any;
      };
    }
  
    export interface Workbook {
      sheet(index: number): Sheet;
      sheet(name: string): Sheet;
      outputAsync(options?: { type?: string }): Promise<Buffer>;
    }
  
    export interface XlsxPopulateStatic {
      fromBlankAsync(): Promise<Workbook>;
    }
  
    const XlsxPopulate: XlsxPopulateStatic;
    export default XlsxPopulate;
  }
  