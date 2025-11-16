import React, { useRef, useState } from "react";
import * as XLSX from "xlsx";
import QRCode from "qrcode";

export interface Contact {
  id: string;
  name: string;
  designation: string;
  department: string;
  location: string;
  address: string;
  mobile: string;
  email: string;
  website: string;
  qrDataUrl?: string;
}

function buildVCard(c: Contact): string {
  return [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${c.name}`,
    c.designation && `TITLE:${c.designation}`,
    c.department && `ORG:${c.department}`,
    c.mobile && `TEL;CELL:${c.mobile}`,
    c.email && `EMAIL:${c.email}`,
    c.address && c.location && `ADR;TYPE=WORK:;;${c.address};${c.location};;`,
    c.website && `URL:${c.website}`,
    "END:VCARD",
  ]
    .filter(Boolean)
    .join("\n");
}

export default function App() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const fileRef = useRef<HTMLInputElement | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;

    const data = await f.arrayBuffer();
    const workbook = XLSX.read(data);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });

    const mapped: Contact[] = json.map((row, idx) => ({
      id: `contact-${Date.now()}-${idx}`,
      name: String(row["Name"] || ""),
      designation: String(row["Designation"] || ""),
      department: String(row["Department"] || ""),
      location: String(row["Location"] || ""),
      address: String(row["Address"] || ""),
      mobile: String(row["Mobile"] || ""),
      email: String(row["Email"] || ""),
      website: String(row["Website"] || ""),
    }));

    await generateQRCodesAndSet(mapped);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function generateQRCodesAndSet(newContacts: Contact[]) {
    const out: Contact[] = [];
    for (const c of newContacts) {
      const vcard = buildVCard(c);
      const qrDataUrl = await QRCode.toDataURL(vcard, {
        errorCorrectionLevel: "M",
        type: "image/png",
        margin: 1,
        scale: 8,
      });
      out.push({ ...c, qrDataUrl });
    }
    setContacts(out);
  }

  async function downloadQRasSVG(c: Contact) {
    const vcard = buildVCard(c);
    const svg = await QRCode.toString(vcard, {
      type: "svg",
      errorCorrectionLevel: "M",
      margin: 1,
    });

    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `qr-${c.name.replace(/\s+/g, "-")}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function downloadAllQRCodes() {
    for (const c of contacts) {
      await downloadQRasSVG(c);
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <style>{`
        @media print {
          .no-print { display: none !important; }
        }
      `}</style>

      <header className="mb-6 no-print">
        <h1 className="text-2xl font-bold">QR Card Generator</h1>
        <p className="text-gray-600 text-sm">Excel import + QR + Download</p>
      </header>

      <section className="bg-white p-4 rounded shadow mb-8 no-print">
        <h2 className="font-semibold mb-3">Upload Excel / CSV</h2>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFile}
          className="mb-3 w-full"
        />
      </section>

      {contacts.length > 0 && (
        <div className="mb-6 no-print">
          <button
            onClick={downloadAllQRCodes}
            className="bg-green-600 text-white px-6 py-3 rounded hover:bg-green-700"
          >
            Download All QR Codes ({contacts.length})
          </button>
        </div>
      )}

      <section>
        <h2 className="text-lg font-medium mb-4 no-print">
          Generated Cards ({contacts.length})
        </h2>
        {contacts.length === 0 && (
          <div className="text-gray-500">No contacts yet</div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {contacts.map((c) => (
            <div key={c.id} className="bg-white p-4 rounded shadow" style={{ width: 600 }}>
              <div className="flex gap-4 mb-4">
                <div className="w-24 h-24 bg-gray-100 shrink-0 rounded overflow-hidden">
                  <img
                    src="/logo.png"
                    alt="Logo"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                </div>

                <div className="flex-1">
                  <h3 className="text-xl font-bold">{c.name}</h3>
                  <p className="text-sm text-blue-700 font-medium">{c.designation}</p>

                  <div className="mt-2 text-sm text-gray-700 space-y-1">
                    {c.department && <div>{c.department}</div>}
                    {c.location && <div>{c.location}</div>}
                    {c.address && <div>{c.address}</div>}
                    {c.mobile && <div>{c.mobile}</div>}
                    {c.email && <div>{c.email}</div>}
                    {c.website && <div>{c.website}</div>}
                  </div>
                </div>

                <div className="w-32 shrink-0 flex items-center justify-center">
                  {c.qrDataUrl ? (
                    <img
                      src={c.qrDataUrl}
                      alt="QR"
                      className="w-32 h-32 object-contain border"
                    />
                  ) : (
                    <div className="w-32 h-32 border grid place-items-center text-xs text-gray-400">
                      QR
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2 no-print border-t pt-3">
                <button
                  onClick={() => downloadQRasSVG(c)}
                  className="flex-1 px-3 py-2 rounded border border-blue-600 text-blue-600 hover:bg-blue-50"
                >
                  Download QR (SVG)
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}