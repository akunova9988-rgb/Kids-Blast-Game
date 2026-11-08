export function sendSupabaseConfig(_req, res) {
  const url = process.env.SUPABASE_URL?.trim() || '';
  const anonKey = process.env.SUPABASE_ANON_KEY?.trim() || '';
  res.setHeader('Cache-Control', 'no-store');
  if (!url || !anonKey) {
    res.status(200).json({ configured: false });
    return;
  }
  res.status(200).json({ configured: true, url, anonKey });
}
