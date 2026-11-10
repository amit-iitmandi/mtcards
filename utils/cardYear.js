// Shop calendar year; Render may run in a different time zone.
const currentCardYear = (date = new Date()) => Number(new Intl.DateTimeFormat('en-US', { year: 'numeric', timeZone: 'Asia/Kolkata' }).format(date));
module.exports = { currentCardYear };
