/* Share or save an exported file from one of the /api/.../export endpoints.
 *
 * PWAs handle a normal download link badly — it tends to open the file in a new
 * browser tab that the installed app can't navigate back out of. Instead we
 * fetch the file ourselves and hand it to the device's native share sheet
 * (Web Share API). Where that isn't available we fall back to a real download,
 * which still keeps everything inside the app. */
export async function shareOrDownloadFile(
  url: string,
  fallbackName: string
): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Export failed (${res.status})`);
  const blob = await res.blob();

  // Prefer the filename the server suggested.
  const disposition = res.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match?.[1] || fallbackName;

  const type = blob.type || "application/octet-stream";
  const file = new File([blob], filename, { type });

  // Native share sheet (mobile / installed PWA). Share the file *only* — adding
  // a title/text makes some targets (AirDrop, Save to Files, Mail) attach it as
  // a separate one-line text file alongside the real export.
  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
  };
  if (typeof nav.share === "function" && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file] });
      return;
    } catch (err) {
      // User dismissed the sheet — nothing more to do.
      if (err instanceof DOMException && err.name === "AbortError") return;
      // Otherwise fall through and download instead.
    }
  }

  // Fallback: download the blob (stays within the app, no new page).
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}
