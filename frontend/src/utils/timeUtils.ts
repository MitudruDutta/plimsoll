/**
 * UTC Time Utilities
 *  UTC 
 */

/**
 *  UTC  ISO 
 */
export const getUTCISOString = (): string => {
  return new Date().toISOString();
};

/**
 *  UTC ()
 */
export const getUTCTimestamp = (): number => {
  return Date.now();
};

/**
 *  UTC 
 * @param date - Date ,ISO 
 * @param format - 
 */
export const formatUTCTime = (
  date: Date | string | number,
  format: 'time' | 'date' | 'datetime' | 'full' = 'datetime'
): string => {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'UTC',
  };

  switch (format) {
    case 'time':
      options.hour = '2-digit';
      options.minute = '2-digit';
      options.second = '2-digit';
      options.hour12 = false;
      break;
    case 'date':
      options.year = 'numeric';
      options.month = '2-digit';
      options.day = '2-digit';
      break;
    case 'datetime':
      options.year = 'numeric';
      options.month = '2-digit';
      options.day = '2-digit';
      options.hour = '2-digit';
      options.minute = '2-digit';
      options.second = '2-digit';
      options.hour12 = false;
      break;
    case 'full':
      options.year = 'numeric';
      options.month = 'long';
      options.day = 'numeric';
      options.hour = '2-digit';
      options.minute = '2-digit';
      options.second = '2-digit';
      options.hour12 = false;
      options.weekday = 'long';
      break;
  }

  return d.toLocaleString('en-US', options) + ' UTC';
};

/**
 *  UTC  (HH:MM:SS)
 */
export const formatUTCTimeShort = (date?: Date | string | number): string => {
  const d = date 
    ? (typeof date === 'string' || typeof date === 'number' ? new Date(date) : date)
    : new Date();
  
  return d.toLocaleTimeString('en-US', {
    timeZone: 'UTC',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

/**
 *  UTC 
 * @param date - Date ,ISO 
 */
export const formatUTCDateTimeCN = (date: Date | string | number): string => {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  
  return d.toLocaleString('zh-CN', {
    timeZone: 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }) + ' UTC';
};

/**
 *  UTC 
 */
export const getUTCParts = (date?: Date): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
} => {
  const d = date || new Date();
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
    second: d.getUTCSeconds(),
    millisecond: d.getUTCMilliseconds()
  };
};

/**
 * ()
 */
export const getTimeDiff = (
  start: Date | string | number,
  end: Date | string | number
): number => {
  const startTime = typeof start === 'string' || typeof start === 'number' 
    ? new Date(start).getTime() 
    : start.getTime();
  const endTime = typeof end === 'string' || typeof end === 'number'
    ? new Date(end).getTime()
    : end.getTime();
  
  return endTime - startTime;
};

/**
 * 
 */
export const formatTimeDiff = (diffMs: number): string => {
  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} ${hours % 24}`;
  if (hours > 0) return `${hours} ${minutes % 60}`;
  if (minutes > 0) return `${minutes} ${seconds % 60}`;
  return `${seconds}`;
};

