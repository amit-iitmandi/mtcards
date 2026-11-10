export function whatsappUrl({ card = '', quantity = '', price, category = '' } = {}, phone = process.env.REACT_APP_WHATSAPP_NUMBER) {
  const digits = (phone || '').replace(/[\s+()-]/g, '');
  if (!/^[1-9]\d{9,14}$/.test(digits)) return null;
  const count = /^[1-9]\d*$/.test(String(quantity)) ? quantity : 'अभी तय नहीं';
  const message = `नमस्ते, मुझे विवाह कार्ड के बारे में जानकारी चाहिए।\nकार्ड: ${card || 'चुनने में मदद चाहिए'}${price != null ? `\nप्रदर्शित कीमत: ₹${price}` : ''}${category ? `\nश्रेणी: ${category}` : ''}\nमात्रा: ${count}\nकृपया कीमत, उपलब्धता और प्रिंटिंग का खर्च बताएँ। मात्रा के अनुसार कुल कोटेशन भी भेजें।`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
export function inquiryUrl(item, phone = process.env.REACT_APP_WHATSAPP_NUMBER, quantity = '') {
  return whatsappUrl({ card: `MT. ${item.title}`, quantity, price: item.cPrice, category: item.type1 }, phone);
}
