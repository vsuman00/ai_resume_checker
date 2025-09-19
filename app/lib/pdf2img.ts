export interface PdfConversionResult {
    imageUrl: string;
    file: File | null;
    error?: string;
}

let pdfjsLib: any = null;
let isLoading = false;
let loadPromise: Promise<any> | null = null;

async function loadPdfJs(): Promise<any> {
    if (pdfjsLib) return pdfjsLib;
    if (loadPromise) return loadPromise;

    isLoading = true;
    try {
        // @ts-expect-error - pdfjs-dist/build/pdf.mjs is not a module
        loadPromise = import("pdfjs-dist/build/pdf.mjs").then((lib) => {
            // Set the worker source to use the local file (version-matched)
            lib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
            pdfjsLib = lib;
            isLoading = false;
            console.log("PDF.js loaded successfully with version-matched worker");
            return lib;
        });

        return loadPromise;
    } catch (error) {
        console.error("Failed to load PDF.js:", error);
        isLoading = false;
        loadPromise = null;
        throw error;
    }
}

export async function convertPdfToImage(
    file: File
): Promise<PdfConversionResult> {
    try {
        console.log("Starting PDF conversion for file:", file.name);
        
        // Validate file type
        if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
            throw new Error("File is not a PDF");
        }

        const lib = await loadPdfJs();
        console.log("PDF.js loaded, reading file...");

        const arrayBuffer = await file.arrayBuffer();
        console.log("File read, size:", arrayBuffer.byteLength, "bytes");

        if (arrayBuffer.byteLength === 0) {
            throw new Error("PDF file is empty");
        }

        const pdf = await lib.getDocument({ data: arrayBuffer }).promise;
        console.log("PDF parsed, pages:", pdf.numPages);

        const page = await pdf.getPage(1);
        console.log("First page loaded");

        const viewport = page.getViewport({ scale: 2 }); // Reduced scale for better performance
        console.log("Viewport:", viewport.width, "x", viewport.height);

        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        if (!context) {
            throw new Error("Failed to get canvas 2D context");
        }

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "high";

        console.log("Rendering page to canvas...");
        await page.render({ canvasContext: context, viewport }).promise;
        console.log("Page rendered successfully");

        return new Promise((resolve, reject) => {
            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        console.log("Blob created, size:", blob.size, "bytes");
                        // Create a File from the blob with the same name as the PDF
                        const originalName = file.name.replace(/\.pdf$/i, "");
                        const imageFile = new File([blob], `${originalName}.png`, {
                            type: "image/png",
                        });

                        resolve({
                            imageUrl: URL.createObjectURL(blob),
                            file: imageFile,
                        });
                    } else {
                        const error = "Failed to create image blob";
                        console.error(error);
                        resolve({
                            imageUrl: "",
                            file: null,
                            error,
                        });
                    }
                },
                "image/png",
                0.9 // Slightly reduced quality for better performance
            );
        });
    } catch (err) {
        const errorMessage = `Failed to convert PDF: ${err instanceof Error ? err.message : String(err)}`;
        console.error("PDF conversion error:", err);
        return {
            imageUrl: "",
            file: null,
            error: errorMessage,
        };
    }
}
