export const currentCardYear = (date = new Date()) => Number(new Intl.DateTimeFormat('en-US', { year: 'numeric', timeZone: 'Asia/Kolkata' }).format(date));
