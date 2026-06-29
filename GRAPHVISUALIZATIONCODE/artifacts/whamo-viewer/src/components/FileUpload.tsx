import { useCallback, useRef } from "react";
import { Upload } from "lucide-react";

interface FileUploadProps {
  onFileLoaded: (fileName: string, content: string) => void;
  isLoading: boolean;
}

export default function FileUpload({ onFileLoaded, isLoading }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        onFileLoaded(file.name, text);
      };
      reader.readAsText(file);
    },
    [onFileLoaded]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  return (
    <div
      className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center cursor-pointer transition-colors hover:border-blue-400 hover:bg-blue-50/30"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".out,.OUT"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
      <div className="flex flex-col items-center gap-3">
        <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center">
          <Upload className="w-6 h-6 text-blue-500" />
        </div>
        <div>
          <p className="text-base font-semibold text-gray-800">
            {isLoading ? "Processing..." : "Upload WHAMO .OUT File"}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            Drag and drop or click to browse
          </p>
        </div>
      </div>
    </div>
  );
}
