import { ClipboardPaste, X } from "lucide-react";
import { useState, type ClipboardEvent, type DragEvent } from "react";
import { toast } from "sonner";

/**
 * Lets a student paste (Ctrl+V) a screenshot of the mark scheme straight
 * into the grader or Live Examiner, so the examiner AI can read the actual
 * page — not just the retrieved text chunks — while marking. Paste-only by
 * design (no file picker): a screenshot is something already on the
 * clipboard, and adding an upload path here would just duplicate the
 * diagram-attach flow that already exists for that.
 */

export type MarkSchemeImage = { id: string; dataUrl: string };

const MAX_IMAGES = 4;
// Generous for a cropped screenshot of a mark scheme page; keeps the
// eventual base64 payload (and the vision call's token cost) bounded.
const MAX_BYTES = 6 * 1024 * 1024;

function firstImageFile(items: DataTransferItemList | FileList | null): File | null {
  if (!items) return null;
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (!item) continue;
    if ("getAsFile" in item) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) return file;
      }
    } else if (item.type.startsWith("image/")) {
      return item;
    }
  }
  return null;
}

export function MarkSchemeScreenshots({
  images,
  onAdd,
  onRemove,
}: {
  images: MarkSchemeImage[];
  onAdd: (image: MarkSchemeImage) => void;
  onRemove: (id: string) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const atLimit = images.length >= MAX_IMAGES;

  function handleFile(file: File) {
    if (atLimit) {
      toast.error(`You can attach up to ${MAX_IMAGES} mark scheme screenshots.`);
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("That clipboard item isn't an image — copy a screenshot first.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("That screenshot is too large — try a tighter crop.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      onAdd({ id: crypto.randomUUID(), dataUrl: reader.result as string });
      toast.success("Mark scheme screenshot attached — the examiner will read it directly.");
    };
    reader.onerror = () => toast.error("Couldn't read that image.");
    reader.readAsDataURL(file);
  }

  function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    const file = firstImageFile(event.clipboardData?.items ?? null);
    if (!file) {
      toast.error("No image found on the clipboard — copy a mark scheme screenshot first.");
      return;
    }
    event.preventDefault();
    handleFile(file);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    const file = firstImageFile(event.dataTransfer?.files ?? null);
    if (file) handleFile(file);
  }

  return (
    <div className="space-y-2">
      <div
        role="button"
        tabIndex={0}
        onPaste={handlePaste}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        aria-disabled={atLimit}
        className={`flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed p-4 text-center transition-colors focus:outline-none focus:ring-2 focus:ring-ring ${
          isDragging ? "border-primary bg-primary/5" : "border-border bg-background"
        } ${atLimit ? "opacity-60" : ""}`}
      >
        <ClipboardPaste className="size-4 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">
          {atLimit ? (
            `Up to ${MAX_IMAGES} screenshots attached.`
          ) : (
            <>
              Click here, then{" "}
              <kbd className="rounded border border-border bg-muted px-1 py-0.5 text-[10px]">
                Ctrl
              </kbd>
              +
              <kbd className="rounded border border-border bg-muted px-1 py-0.5 text-[10px]">V</kbd>{" "}
              to paste a screenshot of the mark scheme.
            </>
          )}
        </p>
      </div>

      {images.length > 0 ? (
        <ul className="grid grid-cols-4 gap-2">
          {images.map((img) => (
            <li
              key={img.id}
              className="group relative overflow-hidden rounded-md border border-border"
            >
              <img
                src={img.dataUrl}
                alt="Mark scheme screenshot"
                className="h-16 w-full object-cover"
              />
              <button
                type="button"
                onClick={() => onRemove(img.id)}
                aria-label="Remove mark scheme screenshot"
                className="absolute right-1 top-1 rounded-full bg-background/90 p-0.5 text-muted-foreground opacity-0 shadow transition-opacity group-hover:opacity-100 focus:opacity-100"
              >
                <X className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
