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
    "END:VCARD",
  ]
    .filter(Boolean)
    .join("\n");
}

const sampleHeaders = ["Name", "Designation", "Department", "Location", "Address", "Mobile", "Email"];

export default function App() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [manual, setManual] = useState<Omit<Contact, "id" | "qrDataUrl">>({
    name: "",
    designation: "",
    department: "",
    location: "",
    address: "",
    mobile: "",
    email: "",
  });

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
    }));

    await generateQRCodesAndSet(mapped);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function addManual() {
    if (!manual.name) return alert("Name required");

    const newContact: Contact = {
      id: `contact-${Date.now()}`,
      ...manual,
    };
    await generateQRCodesAndSet([newContact], true);
    setManual({
      name: "",
      designation: "",
      department: "",
      location: "",
      address: "",
      mobile: "",
      email: "",
    });
  }

  async function generateQRCodesAndSet(newContacts: Contact[], append = false) {
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
    setContacts((prev) => (append ? [...prev, ...out] : out));
  }

  function downloadImage(dataUrl: string, filename: string) {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async function downloadCardAsPNG(c: Contact) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 800;
    canvas.height = 400;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const logo = new Image();
    logo.crossOrigin = "anonymous";
    logo.src = "/logo.png";

    await new Promise((resolve) => {
      logo.onload = resolve;
      logo.onerror = resolve;
    });

    if (logo.complete && logo.naturalWidth > 0) {
      ctx.drawImage(logo, 30, 30, 100, 100);
    }

    ctx.fillStyle = "#000000";
    ctx.font = "bold 28px Arial";
    ctx.fillText(c.name, 150, 60);

    ctx.font = "18px Arial";
    ctx.fillStyle = "#1e40af";
    ctx.fillText(c.designation, 150, 90);

    ctx.fillStyle = "#4b5563";
    ctx.font = "14px Arial";
    let y = 120;

    if (c.department) {
      ctx.fillText(`Department: ${c.department}`, 150, y);
      y += 25;
    }
    if (c.location) {
      ctx.fillText(`Location: ${c.location}`, 150, y);
      y += 25;
    }
    if (c.address) {
      ctx.fillText(`Address: ${c.address}`, 150, y);
      y += 25;
    }
    if (c.mobile) {
      ctx.fillText(`Mobile: ${c.mobile}`, 150, y);
      y += 25;
    }
    if (c.email) {
      ctx.fillText(`Email: ${c.email}`, 150, y);
      y += 25;
    }

    if (c.qrDataUrl) {
      const qr = new Image();
      qr.src = c.qrDataUrl;
      await new Promise((resolve) => {
        qr.onload = resolve;
        qr.onerror = resolve;
      });
      ctx.drawImage(qr, 620, 30, 150, 150);
    }

    const dataUrl = canvas.toDataURL("image/png");
    downloadImage(dataUrl, `card-${c.id}.png`);
  }

  async function downloadAllCards() {
    for (const c of contacts) {
      await downloadCardAsPNG(c);
      await new Promise((r) => setTimeout(r, 500));
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

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 no-print">
        <div className="bg-white p-4 rounded shadow">
          <h2 className="font-semibold mb-3">Upload Excel / CSV</h2>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFile}
            className="mb-3 w-full"
          />
          <div className="text-xs text-gray-700 bg-gray-50 p-3 rounded">
            <p className="font-semibold mb-2">Excel Format (Required Headers):</p>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border border-gray-300 px-2 py-1">Name</th>
                  <th className="border border-gray-300 px-2 py-1">Designation</th>
                  <th className="border border-gray-300 px-2 py-1">Department</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-300 px-2 py-1">John Doe</td>
                  <td className="border border-gray-300 px-2 py-1">Manager</td>
                  <td className="border border-gray-300 px-2 py-1">HR</td>
                </tr>
              </tbody>
            </table>
            <table className="w-full text-left border-collapse mt-2">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border border-gray-300 px-2 py-1">Location</th>
                  <th className="border border-gray-300 px-2 py-1">Address</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-300 px-2 py-1">Dhaka</td>
                  <td className="border border-gray-300 px-2 py-1">123 Main St</td>
                </tr>
              </tbody>
            </table>
            <table className="w-full text-left border-collapse mt-2">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border border-gray-300 px-2 py-1">Mobile</th>
                  <th className="border border-gray-300 px-2 py-1">Email</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-300 px-2 py-1">+880123456789</td>
                  <td className="border border-gray-300 px-2 py-1">john@example.com</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <h2 className="font-semibold mb-2">Add Manually</h2>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <input
              placeholder="Name"
              value={manual.name}
              onChange={(e) => setManual((m) => ({ ...m, name: e.target.value }))}
              className="border rounded px-3 py-2 text-sm"
            />
            <input
              placeholder="Designation"
              value={manual.designation}
              onChange={(e) => setManual((m) => ({ ...m, designation: e.target.value }))}
              className="border rounded px-3 py-2 text-sm"
            />
            <input
              placeholder="Department"
              value={manual.department}
              onChange={(e) => setManual((m) => ({ ...m, department: e.target.value }))}
              className="border rounded px-3 py-2 text-sm"
            />
            <input
              placeholder="Location"
              value={manual.location}
              onChange={(e) => setManual((m) => ({ ...m, location: e.target.value }))}
              className="border rounded px-3 py-2 text-sm"
            />
            <input
              placeholder="Address"
              value={manual.address}
              onChange={(e) => setManual((m) => ({ ...m, address: e.target.value }))}
              className="border rounded px-3 py-2 text-sm"
            />
            <input
              placeholder="Mobile"
              value={manual.mobile}
              onChange={(e) => setManual((m) => ({ ...m, mobile: e.target.value }))}
              className="border rounded px-3 py-2 text-sm"
            />
            <input
              placeholder="Email"
              value={manual.email}
              onChange={(e) => setManual((m) => ({ ...m, email: e.target.value }))}
              className="border rounded px-3 py-2 text-sm col-span-2"
            />
          </div>
          <button
            onClick={addManual}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full"
          >
            Add Contact
          </button>
        </div>
      </section>

      {contacts.length > 0 && (
        <div className="mb-6 no-print">
          <button
            onClick={downloadAllCards}
            className="bg-green-600 text-white px-6 py-3 rounded hover:bg-green-700"
          >
            Download All Cards ({contacts.length})
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
                <div className="w-24 h-24 bg-gray-100 flex-shrink-0 rounded overflow-hidden">
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
                  
                  <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-700">
                    {c.department && (
                      <>
                        <span className="font-semibold">Department:</span>
                        <span>{c.department}</span>
                      </>
                    )}
                    {c.location && (
                      <>
                        <span className="font-semibold">Location:</span>
                        <span>{c.location}</span>
                      </>
                    )}
                    {c.address && (
                      <>
                        <span className="font-semibold">Address:</span>
                        <span>{c.address}</span>
                      </>
                    )}
                    {c.mobile && (
                      <>
                        <span className="font-semibold">Mobile:</span>
                        <span>{c.mobile}</span>
                      </>
                    )}
                    {c.email && (
                      <>
                        <span className="font-semibold">Email:</span>
                        <span>{c.email}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="w-32 flex-shrink-0 flex items-center justify-center">
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
                  onClick={() => downloadCardAsPNG(c)}
                  className="flex-1 px-3 py-2 rounded border border-blue-600 text-blue-600 hover:bg-blue-50"
                >
                  Download PNG
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}