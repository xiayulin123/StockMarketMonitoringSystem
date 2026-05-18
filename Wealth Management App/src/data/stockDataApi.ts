import 'dotenv/config';

export async function fetchDailyData(symbol: string, full = false) {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;

  if (!apiKey) {
    throw new Error('ALPHA_VANTAGE_API_KEY is not defined');
  }

  const url = new URL('https://www.alphavantage.co/query');
  url.searchParams.set('function', 'TIME_SERIES_DAILY');
  url.searchParams.set('symbol', symbol);
  url.searchParams.set('apikey', apiKey);

  if (full) {
    url.searchParams.set('outputsize', 'full');
  }

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Failed to fetch daily data: ${res.status}`);
  }

  return res.json();
}
