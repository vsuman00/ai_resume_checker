export interface PdfConversionResult {
  imageUrl: string;
  imageUrls: string[];
  file: File | null;
  files: File[];
  error?: string;
}

let pdfjsLib: any = null;
let loadPromise: Promise<any> | null = null;

async function loadPdfJs(): Promise<any> {
  if (pdfjsLib) return pdfjsLib;
  if (loadPromise) return loadPromise;

  // @ts-expect-error pdfjs-dist does not ship declarations for this browser entry.
  loadPromise = import("pdfjs-dist/build/pdf.mjs")
    .then((lib) => {
      lib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      pdfjsLib = lib;
      return lib;
    })
    .catch((error) => {
      loadPromise = null;
      throw error;
    });
  return loadPromise;
}

function renderPage(
  page: any,
  filename: string,
): Promise<{ imageUrl: string; file: File }> {
  const viewport = page.getViewport({ scale: 2 });
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Failed to get canvas 2D context");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  return page.render({ canvasContext: context, viewport }).promise.then(
    () =>
      new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error("Failed to create image blob"));
            return;
          }
          const baseName = filename.replace(/\.pdf$/iu, "");
          resolve({
            imageUrl: URL.createObjectURL(blob),
            file: new File([blob], `${baseName}.png`, { type: "image/png" }),
          });
        }, "image/png");
      }),
  );
}

export async function convertPdfToImages(
  file: Blob & { name?: string },
): Promise<PdfConversionResult> {
  const empty = (error: string): PdfConversionResult => ({
    imageUrl: "",
    imageUrls: [],
    file: null,
    files: [],
    error,
  });

  try {
    const filename = file.name ?? "resume.pdf";
    if (!(file.type ?? "").includes("pdf") && !/\.pdf$/iu.test(filename)) {
      throw new Error("File is not a PDF");
    }
    const arrayBuffer = await file.arrayBuffer();
    if (arrayBuffer.byteLength === 0) throw new Error("PDF file is empty");

    const lib = await loadPdfJs();
    const pdf = await lib.getDocument({ data: arrayBuffer }).promise;
    const rendered = [] as { imageUrl: string; file: File }[];
    try {
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        rendered.push(
          await renderPage(await pdf.getPage(pageNumber), filename),
        );
      }
    } catch (error) {
      rendered.forEach(({ imageUrl }) => URL.revokeObjectURL(imageUrl));
      throw error;
    }

    return {
      imageUrl: rendered[0]?.imageUrl ?? "",
      imageUrls: rendered.map(({ imageUrl }) => imageUrl),
      file: rendered[0]?.file ?? null,
      files: rendered.map(({ file: imageFile }) => imageFile),
    };
  } catch (error) {
    return empty(
      `Failed to convert PDF: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function convertPdfToImage(
  file: Blob & { name?: string },
): Promise<PdfConversionResult> {
  return convertPdfToImages(file);
}
