function partsToIso(parts: Intl.DateTimeFormatPart[]) {
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? "";
  const yyyy = get("year");
  const mm   = get("month").padStart(2, "0");
  const dd   = get("day").padStart(2, "0");
  const hh   = get("hour").padStart(2, "0");
  const mi   = get("minute").padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

/** Format a UTC instant (ms) into local wall time string for a given IANA tz */
export function toLocalYMDHM(instantMs: number, timeZone: string): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false
  });
  // @ts-ignore formatToParts exists at runtime
  return partsToIso(fmt.formatToParts(new Date(instantMs)));
}

/** Build a local ±(mins) window around a base ISO time (which may include Z) */
export function localWindowAround(baseIso: string, timeZone: string, halfWindowMinutes = 355) {
  const base = new Date(baseIso); // treat as an instant
  const delta = halfWindowMinutes * 60 * 1000;
  return {
    fromLocal: toLocalYMDHM(base.getTime() - delta, timeZone),
    toLocal:   toLocalYMDHM(base.getTime() + delta, timeZone),
  };
}

interface TimeFormatOptions {
  includeDate?: boolean;
  includeSeconds?: boolean;
  timeStyle?: 'short' | 'medium' | 'long';
  dateStyle?: 'short' | 'medium' | 'long' | 'full';
  hour12?: boolean; // Allow explicit override
}

/**
 * Formats time respecting user's locale and 12/24h preferences
 * Provides consistent, accessible time formatting across the app
 */
export function getLocalTime(
  isoString: string, 
  options: TimeFormatOptions = {}
): string {
  try {
    const date = new Date(isoString);
    
    if (isNaN(date.getTime())) {
      console.warn(`Invalid ISO string provided to getLocalTime: ${isoString}`);
      return 'Invalid time';
    }

    const {
      includeDate = false,
      includeSeconds = false,
      timeStyle = 'short',
      dateStyle = 'short',
      hour12 // Let browser decide if not specified
    } = options;

    // If both date and time are needed, use combined formatting
    if (includeDate) {
      return new Intl.DateTimeFormat(undefined, {
        dateStyle,
        timeStyle,
        hour12
      }).format(date);
    }

    // Time-only formatting
    const formatOptions: Intl.DateTimeFormatOptions = {
      hour: 'numeric',
      minute: '2-digit',
      hour12 // Respects user's system preference if undefined
    };

    if (includeSeconds) {
      formatOptions.second = '2-digit';
    }

    return new Intl.DateTimeFormat(undefined, formatOptions).format(date);
  } catch (error) {
    console.error('Error formatting time:', error);
    return 'Time unavailable';
  }
}

/**
 * Formats time difference for screen readers and display
 * Returns human-readable relative time
 */
export function getRelativeTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    
    if (isNaN(date.getTime())) {
      return 'Unknown time';
    }

    const diffMs = date.getTime() - now.getTime();
    const diffMinutes = Math.round(diffMs / (1000 * 60));
    
    if (Math.abs(diffMinutes) < 1) {
      return 'Now';
    }
    
    if (diffMinutes > 0) {
      if (diffMinutes < 60) {
        return `In ${diffMinutes} minute${diffMinutes === 1 ? '' : 's'}`;
      }
      const hours = Math.floor(diffMinutes / 60);
      const remainingMinutes = diffMinutes % 60;
      if (remainingMinutes === 0) {
        return `In ${hours} hour${hours === 1 ? '' : 's'}`;
      }
      return `In ${hours}h ${remainingMinutes}m`;
    } else {
      const absMinutes = Math.abs(diffMinutes);
      if (absMinutes < 60) {
        return `${absMinutes} minute${absMinutes === 1 ? '' : 's'} ago`;
      }
      const hours = Math.floor(absMinutes / 60);
      const remainingMinutes = absMinutes % 60;
      if (remainingMinutes === 0) {
        return `${hours} hour${hours === 1 ? '' : 's'} ago`;
      }
      return `${hours}h ${remainingMinutes}m ago`;
    }
  } catch (error) {
    console.error('Error calculating relative time:', error);
    return 'Time calculation error';
  }
}

/**
 * Creates accessible time element with both display and machine-readable formats
 */
export function createTimeElement(
  isoString: string, 
  displayOptions: TimeFormatOptions = {}
): { displayTime: string; isoTime: string; ariaLabel: string } {
  const displayTime = getLocalTime(isoString, displayOptions);
  const ariaLabel = getLocalTime(isoString, { 
    includeDate: true, 
    dateStyle: 'full', 
    timeStyle: 'medium' 
  });
  
  return {
    displayTime,
    isoTime: isoString,
    ariaLabel
  };
}
