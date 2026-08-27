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
        // Map to required fields and resolve direct links
        const finalProducts = [];
        for (const item of filtered.slice(0, 5)) {
          let directLink = item.link;
          
          // (1) Check if sellers or offers array exists in the basic response
          if (item.sellers && item.sellers.length > 0) {
            directLink = item.sellers[0].link || directLink;
          } else if (item.offers && item.offers.length > 0) {
            directLink = item.offers[0].link || directLink;
          } else if (item.productId) {
            // (2) If not, call Serper's Product API using the productId
            try {
              const prodRes = await fetch('https://google.serper.dev/product', {
                method: 'POST',
                headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId: item.productId, gl: 'in' })
              });
              
              if (prodRes.ok) {
                const prodData = await prodRes.json();
                if (prodData.offers && prodData.offers.length > 0) {
                  // Find the first Amazon or Flipkart link
                  const amzFlpOffer = prodData.offers.find(o => 
                    (o.store && (o.store.toLowerCase().includes('amazon') || o.store.toLowerCase().includes('flipkart'))) ||
                    (o.name && (o.name.toLowerCase().includes('amazon') || o.name.toLowerCase().includes('flipkart')))
                  );
                  directLink = (amzFlpOffer && amzFlpOffer.link) ? amzFlpOffer.link : (prodData.offers[0].link || directLink);
                }
              }
            } catch (err) {
              console.warn("Product API fetch failed for", item.productId, err);
            }
          }

          finalProducts.push({
            name: item.title,
            price: item.price,
            source: item.source,
            link: directLink
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
    type: "OBJECT",
    properties: {
      query: {
        type: "STRING",
        description: "The extracted product search query, including keywords, price limits, and brand."
      }
    },
    required: ["query"]
  }
};

module.exports = { searchLiveProducts, searchLiveProductsDeclaration };
