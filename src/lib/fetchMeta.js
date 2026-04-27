// Fetch Open Graph metadata from a URL using jsonlink.io (free, no key needed)
export async function fetchUrlMeta(url) {
  try {
    const res = await fetch(`https://jsonlink.io/api/extract?url=${encodeURIComponent(url)}`);
    if (!res.ok) throw new Error('Failed to fetch');
    const data = await res.json();
    return {
      title: data.title || '',
      description: data.description || '',
      image: (data.images && data.images[0]) || '',
      domain: data.domain || new URL(url).hostname,
    };
  } catch {
    // Fallback: just extract domain
    try {
      const domain = new URL(url).hostname;
      return { title: domain, description: '', image: '', domain };
    } catch {
      return { title: url, description: '', image: '', domain: '' };
    }
  }
}
