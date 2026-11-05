// One enquiry builder for carousel, catalogue cards and enlarged card previews.
export function cardCode(item) {
  const title = String(item && item.title != null ? item.title : '').trim();
  return /^MT[.\s-]/i.test(title) ? title : `MT. ${title}`;
}

export function inquiryUrl(item, phone) {
  const digits = (phone || '').replace(/[\s+()-]/g, '');
  if (!/^[1-9]\d{9,14}$/.test(digits)) return null;

  const code = cardCode(item);
  const price = item && item.sPrice != null ? String(item.sPrice).trim() : '';
  const category = item && item.type1 ? String(item.type1).trim() : '';
  const format = item && item.type2 ? String(item.type2).trim() : '';
  const description = item && item.description ? String(item.description).replace(/\s+/g, ' ').trim().slice(0, 140) : '';
  const photo = item && Array.isArray(item.image) && item.image.find(url => typeof url === 'string' && /^https:\/\//i.test(url));

  const message = [
    'नमस्ते, मुझे इस शादी के कार्ड के बारे में जानकारी चाहिए।',
    `कार्ड कोड: ${code}`,
    ...(price ? [`दिखाई गई कीमत: ₹${price} प्रति कार्ड`] : []),
    ...(category ? [`श्रेणी: ${category}`] : []),
    ...(format ? [`बनावट: ${format}`] : []),
    ...(description ? [`विवरण: ${description}`] : []),
    ...(photo ? [`कार्ड की तस्वीर: ${photo}`] : []),
    'कृपया उपलब्धता, प्रिंटिंग, मात्रा और अंतिम कीमत की जानकारी दें।'
  ].join('\n');
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
