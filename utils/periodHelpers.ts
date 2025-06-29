/**
 * Centralized period conversion utilities for sequence creation
 */

export const PERIOD_MAP = {
  REDUX_TO_SERVICE: {
    'weekly': '1week',
    'fortnightly': '2weeks', 
    'monthly': '1month'
  },
  SERVICE_TO_REDUX: {
    '1week': 'weekly',
    '2weeks': 'fortnightly',
    '1month': 'monthly'
  },
  DISPLAY_NAMES: {
    'weekly': '1 Week',
    'fortnightly': '2 Weeks',
    'monthly': '1 Month'
  },
  DATABASE_VALUES: {
    'weekly': 'weekly',
    'fortnightly': 'fortnightly',
    'monthly': 'monthly'
  }
} as const;

export type ReduxPeriod = keyof typeof PERIOD_MAP.REDUX_TO_SERVICE;
export type ServicePeriod = keyof typeof PERIOD_MAP.SERVICE_TO_REDUX;
export type DatabasePeriod = 'weekly' | 'fortnightly' | 'monthly';

/**
 * Convert Redux period format to service format
 */
export const convertReduxToService = (period: ReduxPeriod): ServicePeriod => {
  return PERIOD_MAP.REDUX_TO_SERVICE[period];
};

/**
 * Convert service period format to Redux format
 */
export const convertServiceToRedux = (period: ServicePeriod): ReduxPeriod => {
  return PERIOD_MAP.SERVICE_TO_REDUX[period];
};

/**
 * Get display name for a period
 */
export const getDisplayName = (period: ReduxPeriod): string => {
  return PERIOD_MAP.DISPLAY_NAMES[period];
};

/**
 * Calculate number of weeks for a period
 */
export const calculateWeeks = (period: ReduxPeriod): number => {
  switch (period) {
    case 'weekly': 
      return 1;
    case 'fortnightly': 
      return 2;
    case 'monthly': 
      return 4.34; // Average weeks in a month
    default: 
      return 1;
  }
};

/**
 * Calculate end date based on start date and period
 */
export const calculateEndDate = (startDate: string, period: ServicePeriod): string => {
  const start = new Date(startDate);
  const end = new Date(start);

  switch (period) {
    case '1week':
      end.setDate(start.getDate() + 7);
      break;
    case '2weeks':
      end.setDate(start.getDate() + 14);
      break;
    case '1month':
      end.setMonth(start.getMonth() + 1);
      break;
    default:
      // For ongoing, set a far future date
      end.setFullYear(start.getFullYear() + 10);
  }

  return end.toISOString().split('T')[0];
};

/**
 * Generate a name for the sequence based on period
 */
export const generateSequenceName = (startDate: string, period: ServicePeriod): string => {
  const start = new Date(startDate);
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  
  if (period === '1week') {
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return `Week of ${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
  } else if (period === '2weeks') {
    const end = new Date(start);
    end.setDate(start.getDate() + 13);
    return `Fortnight ${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
  } else if (period === '1month') {
    return `Month of ${start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
  }
  
  return `Ongoing from ${start.toLocaleDateString('en-US', options)}`;
};

/**
 * Map period values for database storage
 */
export const mapPeriodToDatabase = (period: ServicePeriod): DatabasePeriod => {
  const map: Record<ServicePeriod, DatabasePeriod> = {
    '1week': 'weekly',
    '2weeks': 'fortnightly',
    '1month': 'monthly',
  };
  return map[period] || 'weekly';
};

/**
 * Map database period values back to Redux format
 */
export const mapDatabaseToRedux = (type: DatabasePeriod): ReduxPeriod => {
  // Database already uses Redux format
  return type || 'weekly';
};