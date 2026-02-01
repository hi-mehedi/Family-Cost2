
export const getBDTDate = (): string => {
  // Returns date in YYYY-MM-DD format for Asia/Dhaka timezone
  return new Intl.DateTimeFormat('en-CA', { 
    timeZone: 'Asia/Dhaka', 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit' 
  }).format(new Date());
};

export const getBDTMonth = (): string => {
  // Returns YYYY-MM for Asia/Dhaka timezone
  const bdtDate = getBDTDate();
  return bdtDate.slice(0, 7);
};
