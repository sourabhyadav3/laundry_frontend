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

/** Legacy single `price` fallback for default catalog items */
export const getGarmentPriceForService = (garment, service) => {
  if (!garment) return 0;

  const key = resolveServicePriceKey(service);
  const parsed = parseCatalogPrices(garment.prices);

  if (parsed[key] > 0) return parsed[key];

  const fallback = Number(garment.price) || 0;
  return fallback;
};

export const getPrimaryCatalogPrice = (prices) => {
  const parsed = parseCatalogPrices(prices);
  return (
    parsed.normalWashIron ||
    parsed.normalIroning ||
    parsed.expressWashIron ||
    parsed.expressIroning ||
    0
  );
};
