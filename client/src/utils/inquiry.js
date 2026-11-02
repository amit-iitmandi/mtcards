export function inquiryUrl(item, phone) {
  const digits = (phone || '').replace(/[\s+()-]/g, '');
  if (!/^[1-9]\d{9,14}$/.test(digits)) return null;
  const message = `नमस्ते, मुझे कार्ड MT. ${item.title} के बारे में जानकारी चाहिए। कीमत: ₹${item.sPrice}। कृपया उपलब्धता और प्रिंटिंग की जानकारी दें।`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
