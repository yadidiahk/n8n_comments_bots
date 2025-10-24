import fetch from 'node-fetch';

// Test to see what HTML structure old Reddit search actually has
async function testRedditHTML() {
  const keyword = 'javascript';
  const url = `https://old.reddit.com/search?q=${encodeURIComponent(keyword)}&sort=new&t=week&limit=5`;
  
  console.log('Fetching:', url);
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    }
  });
  
  console.log('Status:', response.status);
  
  const html = await response.text();
  
  // Look for common selectors
  const selectors = [
    'class="search-result-link"',
    'class="thing link"',
    'class="search-result"',
    'class="search-title"',
    'class="search-link"',
    'data-fullname="t3_',
    'id="siteTable"'
  ];
  
  console.log('\n=== Selector Check ===');
  selectors.forEach(sel => {
    const count = (html.match(new RegExp(sel, 'g')) || []).length;
    console.log(`${sel}: ${count} matches`);
  });
  
  // Extract a sample of the HTML around search results
  const siteTableMatch = html.match(/<div[^>]+id="siteTable"[^>]*>([\s\S]{0,2000})/);
  if (siteTableMatch) {
    console.log('\n=== SiteTable HTML Sample ===');
    console.log(siteTableMatch[0].substring(0, 1500));
  }
  
  // Look for search result items
  const thingMatches = html.match(/<div[^>]+class="[^"]*thing[^"]*"[^>]*>/g);
  if (thingMatches) {
    console.log('\n=== First Thing Element ===');
    console.log(thingMatches[0]);
  }
}

testRedditHTML().catch(console.error);


