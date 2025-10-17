export function buildVCard(contact: {
  name: string;
  designation?: string;
  location?: string;
  addressAndOthers?: string;
}) {
  // We'll attempt to parse mobile & email out of addressAndOthers if present.
  const { name, designation = '', location = '', addressAndOthers = '' } = contact;

  // try extract mobile and email (simple regex)
  const phoneMatch = addressAndOthers.match(/(01[0-9]{9,})|(\+?88[0-9]{11,})/);
  const emailMatch = addressAndOthers.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);

  const phone = phoneMatch ? phoneMatch[0] : '';
  const email = emailMatch ? emailMatch[0] : '';

  // vCard (VERSION:3.0)
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${escapeV(name)}`,
    `N:${escapeV(name)};;;;`,
    `TITLE:${escapeV(designation)}`,
    `ORG:${escapeV(location)}`,
    `NOTE:${escapeV(addressAndOthers)}`,
  ];

  if (phone) lines.push(`TEL;TYPE=CELL:${phone}`);
  if (email) lines.push(`EMAIL;TYPE=INTERNET:${email}`);

  lines.push('END:VCARD');

  return lines.join('\n');
}

function escapeV(s: string) {
  return s.replace(/\n/g, '\\n').replace(/,/g, '\\,');
}
