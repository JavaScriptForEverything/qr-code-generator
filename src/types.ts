export type Contact = {
  id: string;
  name: string;
  designation: string;
  location: string;
  addressAndOthers: string;
  // computed
  qrDataUrl?: string;
}
