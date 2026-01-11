/**
 * Parse date string in format "11 Jan 2026" to Date object
 */
export function parseStoreDate(dateStr) {
  const months = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
  };
  
  const parts = dateStr.trim().split(' ');
  if (parts.length === 3) {
    const day = parseInt(parts[0]);
    const month = months[parts[1]];
    const year = parseInt(parts[2]);
    
    if (!isNaN(day) && month !== undefined && !isNaN(year)) {
      return new Date(year, month, day);
    }
  }
  return new Date();
}

/**
 * Format date to "11 Jan 2026" format
 */
export function formatStoreDate(date) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  
  return `${day} ${month} ${year}`;
}

/**
 * Aggregate store data by Intensi
 */
export function aggregateByIntensi(data) {
  const grouped = data.reduce((acc, item) => {
    const key = `${item.taft_name}|${item.store}`;
    if (!acc[key]) {
      acc[key] = {
        cs: item.taft_name,
        channel: item.store,
        totalVisitor: 0,
        totalIntensi: 0,
        intensiRate: '0.00',
        items: []
      };
    }
    acc[key].totalVisitor += item.visitor;
    acc[key].totalIntensi += item.intensi;
    acc[key].items.push(item);
    return acc;
  }, {});

  return Object.values(grouped).map((group) => ({
    ...group,
    intensiRate: group.totalVisitor > 0 
      ? ((group.totalIntensi / group.totalVisitor) * 100).toFixed(2) 
      : '0.00',
  }));
}

/**
 * Aggregate store data by Case
 */
export function aggregateByCase(data) {
  const grouped = data.reduce((acc, item) => {
    const key = `${item.taft_name}|${item.store}`;
    if (!acc[key]) {
      acc[key] = {
        cs: item.taft_name,
        channel: item.store,
        totalVisitor: 0,
        totalCase: 0,
        caseRate: '0.00',
        items: []
      };
    }
    acc[key].totalVisitor += item.visitor;
    acc[key].totalCase += item.case;
    acc[key].items.push(item);
    return acc;
  }, {});

  return Object.values(grouped).map((group) => ({
    ...group,
    caseRate: group.totalVisitor > 0 
      ? ((group.totalCase / group.totalVisitor) * 100).toFixed(2) 
      : '0.00',
  }));
}

/**
 * Filter store data by date range
 */
export function filterByDateRange(data, startDate, endDate) {
  if (!startDate || !endDate) return data;
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  return data.filter((item) => {
    const itemDate = parseStoreDate(item.date);
    return itemDate >= start && itemDate <= end;
  });
}

/**
 * Get unique CS names from store data
 */
export function getUniqueCS(data) {
  const csSet = new Set(data.map(item => item.taft_name).filter(Boolean));
  return Array.from(csSet).sort();
}

/**
 * Get unique store/channel names from store data
 */
export function getUniqueStores(data) {
  const storeSet = new Set(data.map(item => item.store).filter(Boolean));
  return Array.from(storeSet).sort();
}

/**
 * Calculate summary statistics for Intensi view
 */
export function calculateIntensiSummary(data) {
  const totals = data.reduce((acc, item) => {
    acc.totalVisitor += item.totalVisitor;
    acc.totalIntensi += item.totalIntensi;
    return acc;
  }, { totalVisitor: 0, totalIntensi: 0 });

  return {
    ...totals,
    averageIntensiRate: totals.totalVisitor > 0
      ? ((totals.totalIntensi / totals.totalVisitor) * 100).toFixed(2)
      : '0.00'
  };
}

/**
 * Calculate summary statistics for Case view
 */
export function calculateCaseSummary(data) {
  const totals = data.reduce((acc, item) => {
    acc.totalVisitor += item.totalVisitor;
    acc.totalCase += item.totalCase;
    return acc;
  }, { totalVisitor: 0, totalCase: 0 });

  return {
    ...totals,
    averageCaseRate: totals.totalVisitor > 0
      ? ((totals.totalCase / totals.totalVisitor) * 100).toFixed(2)
      : '0.00'
  };
}