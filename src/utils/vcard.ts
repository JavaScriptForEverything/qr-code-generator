// import type { Contact } from "../App";

// export function buildVCard(c: Contact): string {
//   return [
//     "BEGIN:VCARD",
//     "VERSION:3.0",
//     `FN:${c.name}`,
//     c.designation && `TITLE:${c.designation}`,
//     c.department && `ORG:${c.department}`,
//     c.mobile && `TEL;CELL:${c.mobile}`,
//     c.email && `EMAIL:${c.email}`,
//     c.address && `ADR;TYPE=work:${c.address}`,
//     c.location && `LABEL:${c.location}`,
//     "END:VCARD",
//   ]
//     .filter(Boolean)
//     .join("\n");
// }
