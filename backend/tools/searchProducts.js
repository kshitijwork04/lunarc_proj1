const fallbackProducts = require('../data/fallbackProducts.json');

async function searchLiveProducts(query) {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey || apiKey === 'YOUR_SERPER_API_KEY') {
    console.warn("No SERPER_API_KEY found, using fallback products.");
    return fallbackProducts;
  }

  try {
    const response = await fetch('https://google.serper.dev/shopping', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        q: query,
        gl: 'in' // Optional: setting location
      })
    });

    if (!response.ok) {
      throw new Error(`Serper API responded with status ${response.status}`);
    }

    const data = await response.json();
    
    if (data.shopping && data.shopping.length > 0) {
      const allowedSources = ['amazon', 'flipkart', 'myntra', 'ajio', 'tatacliq', 'meesho', 'nykaa'];
      
      const filtered = data.shopping.filter(item => {
        const sourceLower = item.source.toLowerCase();
        return allowedSources.some(allowed => sourceLower.includes(allowed));
      });

      if (filtered.length > 0) {
        const preferredMarkets = ['amazon', 'flipkart', 'myntra', 'ajio', 'tatacliq', 'meesho', 'nykaa'];

        // Is this a Google Shopping redirect rather than a real store page?
        const isShoppingRedirect = (l) =>
          !!l && (l.includes('google.com/search') || l.includes('ibp=oshop'));

        // Pick the best direct store link from an offers/sellers array, preferring
        // our supported marketplaces.
        const pickBestLink = (offers, fallback) => {
          const pool = offers || [];
          const preferredOffer = pool.find(o => {
            const hay = `${o.store || ''} ${o.name || ''} ${o.link || ''}`.toLowerCase();
            return preferredMarkets.some(p => hay.includes(p)) && !!o.link;
          });
          return (preferredOffer && preferredOffer.link) ||
                 (pool.find(o => o.link && !isShoppingRedirect(o.link))?.link) ||
                 (pool.find(o => o.link)?.link) ||
                 fallback;
        };

        // Ask Serper's web search to find the direct product page on a marketplace.
        async function resolveDirectLink(item, fallbackLink) {
          try {
            const searchRes = await fetch('https://google.serper.dev/search', {
              method: 'POST',
              headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                q: `${item.title} ${item.source ? item.source.split(' ')[0] : ''} buy online`,
                gl: 'in',
                num: 10
              })
            });
            if (!searchRes.ok) return fallbackLink;

            const searchData = await searchRes.json();
            const organic = searchData.organic || [];

            // Prefer a marketplace link that also contains the product title terms.
            const titleTerms = (item.title || '')
              .toLowerCase()
              .split(/\s+/)
              .filter(t => t.length > 2)
              .slice(0, 6);

            const marketplaceResult = organic.find(r => {
              const host = (r.link || '').toLowerCase();
              if (!preferredMarkets.some(m => host.includes(`.${m}.`) || host.includes(`${m}.`))) return false;
              if (host.includes('google.com')) return false;
              if (titleTerms.length === 0) return true;
              const hay = `${r.title || ''} ${r.link || ''}`.toLowerCase();
              return titleTerms.some(t => hay.includes(t));
            });

            if (marketplaceResult && marketplaceResult.link) {
              return marketplaceResult.link;
            }

            // Fall back to any non-Google direct link if available.
            const anyDirect = organic.find(r =>
              r.link && !r.link.includes('google.com') && /^https?:\/\//.test(r.link)
            );
            return (anyDirect && anyDirect.link) || fallbackLink;
          } catch (err) {
            console.warn("Direct link resolution failed for", item.title, err);
            return fallbackLink;
          }
        }

        // Map to required fields and resolve direct links
        const finalProducts = [];
        for (const item of filtered.slice(0, 5)) {
          let directLink = item.link;

          // (1) Prefer direct links already present in the base response.
          if (item.sellers && item.sellers.length > 0) {
            directLink = pickBestLink(item.sellers, directLink);
          } else if (item.offers && item.offers.length > 0) {
            directLink = pickBestLink(item.offers, directLink);
          }

          // (2) If we still only have a Google Shopping redirect, resolve a real
          //     store page via Serper's web search.
          if (!directLink || isShoppingRedirect(directLink)) {
            directLink = await resolveDirectLink(item, directLink);
          }

          finalProducts.push({
            name: item.title,
            price: item.price,
            source: item.source,
            link: directLink,
            ...(!isShoppingRedirect(directLink) && directLink ? { directLink: true } : {})
          });
        }
        return finalProducts;
      } else {
        return { error: "No marketplace results found. Please suggest broadening the search (e.g. remove brand filter or raise price limit)." };
      }
    } else {
      return { error: "No results found. Please suggest broadening the search (e.g. remove brand filter or raise price limit)." };
    }
  } catch (error) {
    console.error("Serper API error:", error);
    return fallbackProducts; // Fallback gracefully
  }
}

const searchLiveProductsDeclaration = {
  name: "searchLiveProducts",
  description: "Search for live products based on user query (extract keywords, price ceiling, brand). Use this for finding/comparing/checking products or prices.",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "The extracted product search query, including keywords, price limits, and brand."
      }
    },
    required: ["query"]
  }
};

module.exports = { searchLiveProducts, searchLiveProductsDeclaration };
