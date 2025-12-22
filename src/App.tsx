import React, { useRef, useState } from "react";
import * as XLSX from "xlsx";
import QRCode from "qrcode";

export interface Contact {
  id: string;
  name: string;
  designation: string;
  location: string;
  address: string;
  qrDataUrl?: string;
}

/* ---------------- vCard helpers ---------------- */

function escapeVCardText(text: string) {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function buildVCard(c: Contact): string {
  return [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${escapeVCardText(c.name)}`,
    c.designation && `TITLE:${escapeVCardText(c.designation)}`,
    c.location && `ORG:${escapeVCardText(c.location)}`,
    c.address && `NOTE:${escapeVCardText(c.address)}`,
    "END:VCARD",
  ]
    .filter(Boolean)
    .join("\n");
}

/* ---------------- App ---------------- */

export default function App() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  /* -------- Excel Import -------- */

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;

    const data = await f.arrayBuffer();
    const workbook = XLSX.read(data);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, {
      defval: "",
    });

    const mapped: Contact[] = rows.map((row, idx) => {
      const name = String(row["Name"] || "").trim();
      const designation = String(row["Designation And Department"] || "").trim();
      const location = String(row["Location"] || "").trim();

      /**
       * IMPORTANT:
       * Take ALL columns except Name & Designation & Location
       * and print them line-by-line
       */
      const addressLines = Object.entries(row)
        .filter(
          ([key, value]) =>
            !["Name", "Designation And Department", "Location"].includes(key) &&
            String(value).trim() !== ""
        )
        .map(([, value]) => String(value).trim());

      return {
        id: `contact-${Date.now()}-${idx}`,
        name,
        designation,
        location,
        address: addressLines.join("\n"), // 👈 line-by-line
      };
    });

    await generateQRCodesAndSet(mapped);
    if (fileRef.current) fileRef.current.value = "";
  }

  /* -------- QR generation -------- */

  async function generateQRCodesAndSet(newContacts: Contact[]) {
    const out: Contact[] = [];

    for (const c of newContacts) {
      const vcard = buildVCard(c);
      const qrDataUrl = await QRCode.toDataURL(vcard, {
        errorCorrectionLevel: "M",
        margin: 2,
        width: 256,
      });
      out.push({ ...c, qrDataUrl });
    }

    setContacts(out);
  }

  async function downloadQRasSVG(c: Contact, index: number) {
    const svg = await QRCode.toString(buildVCard(c), {
      type: "svg",
      errorCorrectionLevel: "M",
      margin: 2,
      width: 256,
    });

    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${String(index + 1).padStart(2, "0")}.${c.name.replace(
      /\s+/g,
      "-"
    )}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function downloadAllQRCodes() {
    setIsDownloading(true);
    try {
      for (let i = 0; i < contacts.length; i++) {
        await downloadQRasSVG(contacts[i], i);
        await new Promise((r) => setTimeout(r, 80));
      }
    } finally {
      setIsDownloading(false);
    }
  }

  /* -------- UI -------- */

  return (
    <div className="max-w-7xl mx-auto p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">QR Card Generator</h1>
      </header>

      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFile}
        className="mb-6"
      />

      {contacts.length > 0 && (
        <button
          onClick={downloadAllQRCodes}
          disabled={isDownloading}
          className="mb-6 bg-green-600 text-white px-6 py-2 rounded"
        >
          Download All ({contacts.length})
        </button>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {contacts.map((c, i) => (
          <div key={c.id} className="bg-white p-4 rounded shadow w-[600px]">
            <div className="flex gap-4">
              <div className="flex-1">
                <h3 className="text-xl font-bold">{c.name}</h3>

                {/* ✅ designation ONLY ONCE */}
                <p className="text-sm text-blue-700 font-medium">
                  {c.designation}
                </p>

                <div className="mt-2 text-sm text-gray-700 whitespace-pre-line">
                  {c.address}
                </div>
              </div>

              <div className="w-40">
                <img
                  src={c.qrDataUrl}
                  alt="QR"
                  className="w-40 h-40 border"
                />
              </div>
            </div>

            <button
              onClick={() => downloadQRasSVG(c, i)}
              className="mt-4 w-full border border-blue-600 text-blue-600 py-2 rounded"
            >
              Download QR (SVG)
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
