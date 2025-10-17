import React, { useRef, useState } from 'react'
import type { Contact } from './types'
import { buildVCard } from './utils/vcard'
import * as XLSX from 'xlsx'
import QRCode from 'qrcode'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { saveAs } from 'file-saver'
import { v4 as uuidv4 } from 'uuid'

const sampleRowHeaders = [
  'Name',
  'Designation And Department',
  'Location',
  'Address And Others'
]

export default function App() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const fileRef = useRef<HTMLInputElement | null>(null)

  // --- Excel / CSV upload handler ---
  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    const data = await f.arrayBuffer()
    const workbook = XLSX.read(data)
    // take first sheet
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const json = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' })
    // Map rows to our structure
    const mapped = json.map((row) => {
      // If your column keys differ, change here.
      const name = row['Name'] || row['name'] || row['Full Name'] || ''
      const designation = row['Designation And Department'] || row['Designation'] || ''
      const location = row['Location'] || ''
      const addressAndOthers = row['Address And Others'] || row['Address'] || ''
      return {
        id: uuidv4(),
        name: String(name).trim(),
        designation: String(designation).trim(),
        location: String(location).trim(),
        addressAndOthers: String(addressAndOthers).trim()
      } as Contact
    })
    // generate QR dataURLs
    await generateQRCodesAndSet(mapped)
    // reset input to allow same file re-upload if needed
    if (fileRef.current) fileRef.current.value = ''
  }

  // --- Form manual add ---
  const [manual, setManual] = useState({
    name: '',
    designation: '',
    location: '',
    addressAndOthers: ''
  })

  async function addManual(e?: React.FormEvent) {
    e?.preventDefault()
    if (!manual.name) {
      alert('Name required')
      return
    }
    const c: Contact = {
      id: uuidv4(),
      name: manual.name,
      designation: manual.designation,
      location: manual.location,
      addressAndOthers: manual.addressAndOthers
    }
    await generateQRCodesAndSet([c], true)
    setManual({ name: '', designation: '', location: '', addressAndOthers: '' })
  }

  // takes array of contacts, optional append
  async function generateQRCodesAndSet(newContacts: Contact[], append = false) {
    const out: Contact[] = []
    for (const c of newContacts) {
      const vcard = buildVCard({
        name: c.name,
        designation: c.designation,
        location: c.location,
        addressAndOthers: c.addressAndOthers
      })
      // generate QR data URL (PNG)
      const qrDataUrl = await QRCode.toDataURL(vcard, {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        margin: 1,
        scale: 8
      })
      out.push({ ...c, qrDataUrl })
    }
    setContacts((prev) => (append ? [...prev, ...out] : out))
  }

  // --- Download handlers ---
  async function downloadCardAsPNG(cardId: string) {
    const el = document.getElementById(`card-${cardId}`)
    if (!el) return
    const canvas = await html2canvas(el, { scale: 3 })
    canvas.toBlob((blob) => {
      if (!blob) return
      saveAs(blob, `card-${cardId}.png`)
    }, 'image/png', 0.95)
  }

  async function downloadCardAsPDF(cardId: string) {
    const el = document.getElementById(`card-${cardId}`)
    if (!el) return
    const canvas = await html2canvas(el, { scale: 3 })
    const imgData = canvas.toDataURL('image/png', 0.95)
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: [650, 400] // adjust if you want A4, or custom size
    })
    // fit canvas into pdf
    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = pdf.internal.pageSize.getHeight()
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
    pdf.save(`card-${cardId}.pdf`)
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">QR Card Generator — React + TypeScript + Tailwind + Vite</h1>
        <p className="text-sm text-gray-600 mt-1">Upload Excel/CSV or add manually. QR encodes vCard for mobile scanners.</p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* File upload */}
        <div className="bg-white p-4 rounded shadow">
          <h2 className="font-semibold mb-2">Upload Excel / CSV</h2>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={handleFile}
            className="mb-2"
          />
          <p className="text-xs text-gray-500">Make sure your sheet columns include: {sampleRowHeaders.join(', ')}</p>
        </div>

        {/* Manual form */}
        <div className="bg-white p-4 rounded shadow">
          <h2 className="font-semibold mb-2">Add Manually</h2>
          <form onSubmit={addManual} className="space-y-2">
            <input
              placeholder="Name"
              value={manual.name}
              onChange={(e) => setManual((m) => ({ ...m, name: e.target.value }))}
              className="w-full border rounded px-3 py-2"
              required
            />
            <input
              placeholder="Designation And Department"
              value={manual.designation}
              onChange={(e) => setManual((m) => ({ ...m, designation: e.target.value }))}
              className="w-full border rounded px-3 py-2"
            />
            <input
              placeholder="Location"
              value={manual.location}
              onChange={(e) => setManual((m) => ({ ...m, location: e.target.value }))}
              className="w-full border rounded px-3 py-2"
            />
            <textarea
              placeholder="Address And Others (include mobile & email if available)"
              value={manual.addressAndOthers}
              onChange={(e) => setManual((m) => ({ ...m, addressAndOthers: e.target.value }))}
              className="w-full border rounded px-3 py-2"
              rows={3}
            />
            <div className="flex gap-2">
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Add</button>
              <button type="button" onClick={() => setManual({ name: '', designation: '', location: '', addressAndOthers: '' })} className="px-4 py-2 rounded border">Clear</button>
            </div>
          </form>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-medium mb-4">Generated Cards ({contacts.length})</h2>

        {contacts.length === 0 && (
          <div className="text-gray-500">No contacts yet — upload an Excel sheet or add manually.</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {contacts.map((c) => (
            <div id={`card-${c.id}`} key={c.id} className="bg-white p-4 rounded shadow relative">
              {/* Example layout modeled like your image: left logo, then text, QR right bottom */}
              <div className="flex gap-4">
                <div className="w-20 flex items-start">
                  {/* placeholder logo */}
                  <div className="w-16 h-16 bg-blue-600 text-white flex items-center justify-center font-bold">BR</div>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold">{c.name}</h3>
                  <p className="text-sm text-gray-700">{c.designation}</p>
                  <p className="text-sm text-gray-500 mt-1"><strong>Location:</strong> {c.location}</p>
                  <p className="text-sm text-gray-500 mt-2 whitespace-pre-line">{c.addressAndOthers}</p>
                </div>
                <div className="w-28 flex items-center justify-center">
                  {c.qrDataUrl ? (
                    <img src={c.qrDataUrl} alt={`QR for ${c.name}`} className="w-24 h-24 object-contain border" />
                  ) : (
                    <div className="w-24 h-24 border grid place-items-center text-xs text-gray-400">QR</div>
                  )}
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <button onClick={() => downloadCardAsPNG(c.id)} className="px-3 py-1 rounded border">Download PNG</button>
                <button onClick={() => downloadCardAsPDF(c.id)} className="px-3 py-1 rounded border">Download PDF</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
