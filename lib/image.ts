/**
 * Redimensiona y comprime una imagen seleccionada por el usuario utilizando la API de Canvas.
 * Recorta la imagen a un cuadrado centrado de `size` x `size` píxeles y la comprime a JPEG.
 */
export function resizeAndCompressImage(
  file: File,
  size: number = 300,
  quality: number = 0.7
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("La API de Canvas solo está disponible en el cliente."));
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const width = img.width;
        const height = img.height;

        let sx = 0;
        let sy = 0;
        let sWidth = width;
        let sHeight = height;

        if (width > height) {
          sWidth = height;
          sx = (width - height) / 2;
        } else {
          sHeight = width;
          sy = (height - width) / 2;
        }

        canvas.width = size;
        canvas.height = size;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("No se pudo obtener el contexto 2D del canvas."));
          return;
        }

        ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, size, size);

        // Exportar como JPEG con la calidad indicada
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error("Error al cargar la imagen."));
    };
    reader.onerror = () => reject(new Error("Error al leer el archivo."));
  });
}
