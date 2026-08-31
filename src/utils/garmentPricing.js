export const EMPTY_CATALOG_PRICES = {
  expressIroning: '',
  expressWashIron: '',
  normalIroning: '',
  normalWashIron: '',
};

export const SERVICE_PRICE_FIELDS = [
  { key: 'expressIroning', labelKey: 'expressIroningPrice' },
  { key: 'expressWashIron', labelKey: 'expressWashIronPrice' },
  { key: 'normalIroning', labelKey: 'normalIroningPrice' },
  { key: 'normalWashIron', labelKey: 'normalWashIronPrice' },
];

/** Map active service mode string → catalog price field key */
export const resolveServicePriceKey = (service) => {
  const s = String(service || '').toLowerCase().trim();

  if (s.includes('express') || s.includes('urgent')) {
    if (s.includes('iron') && !s.includes('wash')) return 'expressIroning';
    return 'expressWashIron';
  }

  if (
    s === 'iron only' ||
    s.includes('iron only') ||
    (s.includes('iron') && !s.includes('wash') && !s.includes('&'))
  ) {
    return 'normalIroning';
  }

  return 'normalWashIron';
};

export const parseCatalogPrices = (prices = {}) => ({
  expressIroning: Number(prices.expressIroning) || 0,
  expressWashIron: Number(prices.expressWashIron) || 0,
  normalIroning: Number(prices.normalIroning) || 0,
  normalWashIron: Number(prices.normalWashIron) || 0,
});

export const hasAnyCatalogPrice = (prices) =>
  Object.values(parseCatalogPrices(prices)).some((v) => v > 0);

/** Dynamic & legacy service price resolver */
export const getGarmentPriceForService = (garment, service) => {
  if (!garment) return 0;

  if (garment.prices && typeof garment.prices === 'object') {
    // 1. Direct match by service name
    if (garment.prices[service] !== undefined && garment.prices[service] !== '' && Number(garment.prices[service]) > 0) {
      return Number(garment.prices[service]);
    }
    // 2. Case-insensitive / trimmed match
    const targetService = String(service || '').trim().toLowerCase();
    const foundKey = Object.keys(garment.prices).find(k => k.trim().toLowerCase() === targetService);
    if (foundKey && garment.prices[foundKey] !== undefined && garment.prices[foundKey] !== '' && Number(garment.prices[foundKey]) > 0) {
      return Number(garment.prices[foundKey]);
    }
  }

  const key = resolveServicePriceKey(service);
  const parsed = parseCatalogPrices(garment.prices);

  if (parsed[key] > 0) return parsed[key];

  const fallback = Number(garment.price) || 0;
  return fallback;
};

export const getPrimaryCatalogPrice = (prices) => {
  if (!prices || typeof prices !== 'object') return 0;
  // Return first available positive price
  const values = Object.values(prices).map(v => Number(v) || 0).filter(v => v > 0);
  if (values.length > 0) return values[0];
  const parsed = parseCatalogPrices(prices);
  return (
    parsed.normalWashIron ||
    parsed.normalIroning ||
    parsed.expressWashIron ||
    parsed.expressIroning ||
    0
  );
};
