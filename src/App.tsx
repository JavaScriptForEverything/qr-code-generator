import React, { useRef, useState, useEffect } from "react";
import * as XLSX from "xlsx";
import QRCode from "qrcode";

export interface Contact {
  id: string;
  name: string;
  designation: string;
  location: string;
  address: string;
  qrDataUrl?: string;
  rawText?: string; // Store the original text
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
  // Use the raw text directly for the vCard
  const lines = c.rawText?.split('\n') || [];
  const vcardLines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${escapeVCardText(c.name)}`,
    c.designation && `TITLE:${escapeVCardText(c.designation)}`,
    // Include all address lines in the NOTE field
    c.address && `NOTE:${escapeVCardText(c.address)}`,
    "END:VCARD",
  ]
    .filter(Boolean)
    .join("\n");
  
  return vcardLines;
}

/* ---------------- Text Input Processing ---------------- */

function parseTextInput(text: string): Contact[] {
  const blocks = text.trim().split('\n\n').filter(block => block.trim() !== '');
  const contacts: Contact[] = [];

  blocks.forEach((block, idx) => {
    const lines = block.split('\n').map(line => line.trim()).filter(line => line !== '');
    
    if (lines.length === 0) return;

    // First line is name
    const name = lines[0] || "";
    
    // Second line is designation/title (if exists)
    const designation = lines.length > 1 ? lines[1] : "";
    
    // Third line is location (if exists) - but we're not using location separately for text input
    const location = lines.length > 2 ? lines[2] : "";
    
    // Remaining lines (from line 3 onward) become address
    // For text input, we want to preserve ALL lines after name and designation
    const addressLines = lines.slice(2).filter(line => line !== "");
    const address = addressLines.join("\n");

    contacts.push({
      id: `contact-${Date.now()}-${idx}`,
      name,
      designation,
      location: "", // Not using location for text input
      address,
      rawText: block, // Store original text block
    });
  });

  return contacts;
}

/* ---------------- App ---------------- */

export default function App() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [textInput, setTextInput] = useState<string>("");
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Process text input when it changes
  useEffect(() => {
    if (textInput.trim()) {
      const parsedContacts = parseTextInput(textInput);
      generateQRCodesAndSet(parsedContacts);
    } else {
      setContacts([]);
    }
  }, [textInput]);

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
        address: addressLines.join("\n"),
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
    const vcard = buildVCard(c);
    const svg = await QRCode.toString(vcard, {
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
        <p className="text-gray-600 mt-2">Enter contacts manually (one contact per block) or upload an Excel file</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Left Column - Text Input */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Manual Input (One contact per text block, separate blocks with empty line)
            </label>
            <p className="text-sm text-gray-500 mb-2">
              Format: <br />
              Line 1: Name <br />
              Line 2: Title/Designation <br />
              Line 3+: Address/Contact details (each line preserved as-is)
            </p>
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={`Meheriar Munim Hasan
Chairman
+88 01847 196403, +880-2-41082898
+1-415-218-0757, +880-2-41082897
+880-2-41082896
meheriar.hasan@bracbank.com
www.bracbank.com

Most. Nusrat Jahan
Associate Relationship Manager
Rokeyasarani Branch
Cemcon EL Mercado, 1st Floor
Phone: 01716102732
Email: nusrat.jahan@bracbank.com`}
              className="w-full h-64 p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={10}
            />
            <p className="text-sm text-gray-500 mt-2">
              {contacts.length > 0 ? `${contacts.length} contact(s) detected` : 'Enter contacts above'}
            </p>
          </div>
        </div>

        {/* Right Column - File Upload */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Excel/CSV File
            </label>
            <p className="text-sm text-gray-500 mb-4">
              Upload an Excel file with columns: Name, Designation And Department, Location, and other address fields
            </p>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFile}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Choose Excel File
              </label>
              <p className="text-sm text-gray-500 mt-2">
                .xlsx, .xls, or .csv files only
              </p>
            </div>
          </div>

          {contacts.length > 0 && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Ready to Download</h3>
                  <p className="text-sm text-gray-600">{contacts.length} QR code(s) generated</p>
                </div>
                <button
                  onClick={downloadAllQRCodes}
                  disabled={isDownloading}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {isDownloading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 mr-2 text-white" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Downloading...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download All
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* QR Cards Display */}
      {contacts.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Generated Cards ({contacts.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {contacts.map((c, i) => (
              <div key={c.id} className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-800">{c.name}</h3>
                    
                    {c.designation && (
                      <p className="text-sm text-blue-700 font-medium mt-1">
                        {c.designation}
                      </p>
                    )}
                    
                    {c.address && (
                      <div className="mt-3 text-sm text-gray-700 whitespace-pre-line bg-gray-50 p-3 rounded">
                        {c.address.split('\n').map((line, idx) => (
                          <div key={idx}>{line}</div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-center">
                    <img
                      src={c.qrDataUrl}
                      alt="QR Code"
                      className="w-32 h-32 border-2 border-gray-300 rounded"
                    />
                    <button
                      onClick={() => downloadQRasSVG(c, i)}
                      className="mt-3 text-sm border border-blue-600 text-blue-600 px-3 py-1 rounded hover:bg-blue-50 transition-colors"
                    >
                      Download QR
                    </button>
                  </div>
                </div>
                
                {/* QR Data Preview (for debugging) */}
                <div className="mt-3 text-xs text-gray-500 bg-gray-100 p-2 rounded overflow-auto max-h-20">
                  <div className="font-medium">QR contains:</div>
                  <div className="whitespace-pre-wrap font-mono">
                    {buildVCard(c)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}