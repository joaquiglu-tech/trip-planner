export default async function handler(req, res) {
  const { hotel_key, chk_in, chk_out } = req.query;
  if (!hotel_key || !chk_in || !chk_out) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }
  try {
    const url = `https://data.xotelo.com/api/rates?hotel_key=${encodeURIComponent(hotel_key)}&chk_in=${encodeURIComponent(chk_in)}&chk_out=${encodeURIComponent(chk_out)}`;
    const response = await fetch(url);
    const data = await response.json();
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch rates' });
  }
}
