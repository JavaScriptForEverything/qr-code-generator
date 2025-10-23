import React, { useRef, useState } from "react";
import * as XLSX from "xlsx";
import QRCode from "qrcode";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { v4 as uuidv4 } from "uuid";
// import { saveAs } from "file-saver";
import { buildVCard } from "./utils/vcard"; // we’ll adjust this file below

// 👇 define Contact type
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

// 📄 expected Excel headers
const sampleHeaders = [
  "Name",
  "Designation",
  "Department",
  "Location",
  "Address",
  "Mobile",
  "Email",
];

export default function App() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // 🧾 Excel Upload
  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;

    const data = await f.arrayBuffer();
    const workbook = XLSX.read(data);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });

    const mapped: Contact[] = json.map((row) => ({
      id: uuidv4(),
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

  // ✍️ Manual Add
  const [manual, setManual] = useState<Omit<Contact, "id" | "qrDataUrl">>({
    name: "",
    designation: "",
    department: "",
    location: "",
    address: "",
    mobile: "",
    email: "",
  });

  async function addManual(e: React.FormEvent) {
    e.preventDefault();
    if (!manual.name) return alert("Name required");

    const newContact: Contact = {
      id: uuidv4(),
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

  // 🧠 Generate QR
  async function generateQRCodesAndSet(newContacts: Contact[], append = false) {
    const out: Contact[] = [];
    for (const c of newContacts) {
      const vcard = buildVCard(c);

      const qrDataUrl = await QRCode.toDataURL(vcard, {
        errorCorrectionLevel: "L",
        type: "image/png",
        margin: 1,
        scale: 10,
      });

      out.push({ ...c, qrDataUrl });
    }
    setContacts((prev) => (append ? [...prev, ...out] : out));
  }

  // 🧩 Wait for images (QR) before render
  async function waitForImagesLoaded(element: HTMLElement) {
    const imgs = Array.from(element.querySelectorAll("img"));
    await Promise.all(
      imgs.map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete) resolve();
            else {
              img.onload = () => resolve();
              img.onerror = () => resolve();
            }
          })
      )
    );
  }

  // 🖼️ Download PNG
  async function downloadCardAsPNG(id: string) {
    const el = document.getElementById(`card-${id}`);
    if (!el) return;

    try {
      await waitForImagesLoaded(el);
      await new Promise((r) => setTimeout(r, 300));

      const canvas = await html2canvas(el, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
      });

      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `card-${id}.png`;
      link.click();
    } catch (err) {
      console.error("PNG export error:", err);
      alert("Failed to export PNG.");
    }
  }

  // 📄 Download PDF
  async function downloadCardAsPDF(id: string) {
    const el = document.getElementById(`card-${id}`);
    if (!el) return;

    try {
      await waitForImagesLoaded(el);
      await new Promise((r) => setTimeout(r, 300));

      const canvas = await html2canvas(el, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "pt",
        format: [650, 400],
      });
      pdf.addImage(imgData, "PNG", 0, 0, 650, 400);
      pdf.save(`card-${id}.pdf`);
    } catch (err) {
      console.error("PDF export error:", err);
      alert("Failed to export PDF.");
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <style>{`
        @media print {
          .no-print { display: none !important; }
        }
      `}</style>

      <header className="mb-6">
        <h1 className="text-2xl font-bold">QR Card Generator — Clean Fields</h1>
        <p className="text-gray-600 text-sm">
          Excel import + QR + Download (buttons hidden in print).
        </p>
      </header>

      {/* Upload & Manual Add */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-4 rounded shadow">
          <h2 className="font-semibold mb-2">Upload Excel / CSV</h2>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFile}
            className="mb-2"
          />
          <p className="text-xs text-gray-500">
            Headers required: {sampleHeaders.join(", ")}
          </p>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <h2 className="font-semibold mb-2">Add Manually</h2>
          <form onSubmit={addManual} className="space-y-2">
            {sampleHeaders.map(
              (field) =>
                field !== "id" && (
                  <input
                    key={field}
                    placeholder={field}
                    value={(manual as any)[field.toLowerCase()] || ""}
                    onChange={(e) =>
                      setManual((m) => ({
                        ...m,
                        [field.toLowerCase()]: e.target.value,
                      }))
                    }
                    className="w-full border rounded px-3 py-2"
                  />
                )
            )}
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Add
            </button>
          </form>
        </div>
      </section>

      {/* Cards */}
      <section>
        <h2 className="text-lg font-medium mb-4">
          Generated Cards ({contacts.length})
        </h2>
        {contacts.length === 0 && (
          <div className="text-gray-500">
            No contacts yet — upload Excel or add manually.
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {contacts.map((c) => (
            <div
              id={`card-${c.id}`}
              key={c.id}
              className="bg-white p-4 rounded shadow relative"
              style={{ width: 600 }}
            >
              <div className="flex gap-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold">{c.name}</h3>
                  <p className="text-sm text-gray-700">{c.designation}</p>
                  <p className="text-sm text-gray-700">{c.department}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    <strong>Location:</strong> {c.location}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    <strong>Address:</strong> {c.address}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    <strong>Mobile:</strong> {c.mobile}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    <strong>Email:</strong> {c.email}
                  </p>
                </div>
                <div className="w-32 flex items-center justify-center">
                  {c.qrDataUrl ? (
                    <img
                      src={c.qrDataUrl}
                      alt={`QR for ${c.name}`}
                      className="w-28 h-28 object-contain border"
                    />
                  ) : (
                    <div className="w-28 h-28 border grid place-items-center text-xs text-gray-400">
                      QR
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 flex gap-2 no-print">
                <button
                  onClick={() => downloadCardAsPNG(c.id)}
                  className="px-3 py-1 rounded border hover:bg-gray-100"
                >
                  Download PNG
                </button>
                <button
                  onClick={() => downloadCardAsPDF(c.id)}
                  className="px-3 py-1 rounded border hover:bg-gray-100"
                >
                  Download PDF
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
