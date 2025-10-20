import dotenv from "dotenv";
import puppeteer from 'puppeteer';
dotenv.config();

/**
 * Search Reddit using Puppeteer (browser automation) - fallback when API is blocked
 * @param {string} keyword - The search term/keyword
 * @param {object} options - Search options
 * @returns {Promise<Object>} Search results
 */
async function searchRedditWithPuppeteer(keyword, options = {}) {
  const {
    sort = 'new',
    time = 'all',
    limit = 25,
    subreddit = null
  } = options;

  console.log('\n🤖 Using Puppeteer browser automation (API blocked)...');
  
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled'
      ]
    });

    const page = await browser.newPage();
    
    // Set realistic viewport and user agent
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');

    // Build URL
    const searchQuery = encodeURIComponent(keyword);
    let url;
    if (subreddit) {
      url = `https://old.reddit.com/r/${subreddit}/search?q=${searchQuery}&restrict_sr=on&sort=${sort}&t=${time}`;
    } else {
      url = `https://old.reddit.com/search?q=${searchQuery}&sort=${sort}&t=${time}`;
    }

    console.log('Navigating to:', url);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Wait for search results to load
    await page.waitForSelector('.search-result-link, .thing, .search-result', { timeout: 10000 }).catch(() => {
      console.log('⚠️ Search results took longer than expected to load');
    });

    // Take a screenshot for debugging (optional)
    if (process.env.DEBUG_REDDIT_SEARCH === 'true') {
      await page.screenshot({ path: `/tmp/reddit-search-${Date.now()}.png`, fullPage: true });
      console.log('📸 Debug screenshot saved to /tmp/');
    }

    // Extract post data from the page
    const posts = await page.evaluate((maxPosts) => {
      const results = [];
      
      // Try multiple selector patterns for old Reddit search results
      let postElements = document.querySelectorAll('.search-result-link');
      
      if (postElements.length === 0) {
        postElements = document.querySelectorAll('.thing.link');
      }
      
      if (postElements.length === 0) {
        postElements = document.querySelectorAll('.search-result');
      }
      
      console.log(`Found ${postElements.length} post elements on page`);
      
      for (let i = 0; i < Math.min(postElements.length, maxPosts); i++) {
        const post = postElements[i];
        
        // Try to extract data - handle both old and new Reddit formats
        let id = post.getAttribute('data-fullname');
        let permalink = post.getAttribute('data-permalink');
        let titleElement = post.querySelector('.title a.title, a.search-title');
        let subredditElement = post.querySelector('.subreddit, .search-subreddit-link');
        let authorElement = post.querySelector('.author, .search-author');
        let scoreElement = post.querySelector('.score.unvoted, .search-score');
        let commentsElement = post.querySelector('.comments, .search-comments');
        
        // For old Reddit search results
        if (!titleElement) {
          titleElement = post.querySelector('a.search-title');
        }
        
        if (titleElement) {
          // Extract ID from data attribute or URL
          if (!id && titleElement.href) {
            const match = titleElement.href.match(/comments\/([a-z0-9]+)\//);
            if (match) {
              id = `t3_${match[1]}`;
            }
          }
          
          const parsedId = id ? id.replace('t3_', '') : null;
          
          // Get permalink
          if (!permalink && titleElement.href) {
            const url = new URL(titleElement.href);
            permalink = url.pathname;
          }
          
          results.push({
            id: id || 'unknown',
            parsedId: parsedId || 'unknown',
            url: titleElement.href || `https://www.reddit.com${permalink}`,
            username: authorElement ? authorElement.textContent.trim() : 'unknown',
            userId: null,
            title: titleElement.textContent.trim(),
            communityName: subredditElement ? subredditElement.textContent.trim() : 'unknown',
            parsedCommunityName: subredditElement ? subredditElement.textContent.trim().replace('r/', '') : 'unknown',
            body: '',
            html: null,
            link: titleElement.href || `https://www.reddit.com${permalink}`,
            numberOfComments: commentsElement ? parseInt(commentsElement.textContent.match(/\d+/)?.[0] || '0') : 0,
            flair: null,
            upVotes: scoreElement ? parseInt(scoreElement.textContent.replace(/[^\d-]/g, '') || '0') : 0,
            upVoteRatio: 0,
            isVideo: false,
            isAd: post.classList.contains('promoted') || false,
            over18: post.classList.contains('over18') || false,
            thumbnailUrl: null,
            imageUrls: [],
            createdAt: new Date().toISOString(),
            scrapedAt: new Date().toISOString(),
            dataType: 'post'
          });
        }
      }
      
      console.log(`Extracted ${results.length} posts`);
      return results;
    }, limit);

    // If no posts found, get page HTML for debugging
    if (posts.length === 0) {
      console.log('⚠️ No posts found. Checking page content...');
      const bodyText = await page.evaluate(() => {
        const selectors = [
          '.search-result-link',
          '.thing.link',
          '.search-result',
          '.search-result-body',
          '#siteTable .thing'
        ];
        
        const found = {};
        selectors.forEach(sel => {
          found[sel] = document.querySelectorAll(sel).length;
        });
        
        return {
          selectors: found,
          bodySnippet: document.body.innerText.substring(0, 500)
        };
      });
      console.log('Page analysis:', JSON.stringify(bodyText, null, 2));
    }

    console.log(`✅ Found ${posts.length} posts via Puppeteer`);

    return {
      success: true,
      keyword: keyword,
      count: posts.length,
      posts: posts,
      method: 'puppeteer'
    };

  } catch (error) {
    console.error('Puppeteer search error:', error.message);
    return {
      success: false,
      keyword: keyword,
      error: error.message,
      count: 0,
      posts: [],
      method: 'puppeteer'
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Search Reddit posts by keyword using Reddit's native JSON API
 * @param {string} keyword - The search term/keyword
 * @param {object} options - Search options
 * @param {string} options.sort - Sort by: 'relevance', 'hot', 'top', 'new', 'comments' (default: 'new')
 * @param {string} options.time - Time filter: 'all', 'year', 'month', 'week', 'day', 'hour' (default: 'all')
 * @param {number} options.limit - Number of results to return (max 100, default: 25)
 * @param {string} options.subreddit - Optional: search within specific subreddit (e.g., 'technology')
 * @param {boolean} options.searchPosts - Search for posts (default: true)
 * @param {boolean} options.includeNSFW - Include NSFW content (default: false)
 * @param {boolean} options.forcePuppeteer - Force use of Puppeteer instead of API (default: false)
 * @returns {Promise<Array>} Array of post objects
 */
export async function searchReddit(keyword, options = {}) {
  const { forcePuppeteer = false } = options;
  
  // If forced to use Puppeteer, skip API attempt
  if (forcePuppeteer) {
    return searchRedditWithPuppeteer(keyword, options);
  }
  try {
    const {
      sort = 'new',
      time = 'all',
      limit = 25,
      subreddit = null,
      searchPosts = true,
      includeNSFW = false
    } = options;

    console.log('\n========================================');
    console.log('REDDIT KEYWORD SEARCH');
    console.log('========================================');
    console.log('Keyword:', keyword);
    console.log('Sort:', sort);
    console.log('Time:', time);
    console.log('Limit:', limit);
    console.log('Subreddit:', subreddit || 'All subreddits');
    console.log('Include NSFW:', includeNSFW);

    if (!keyword || keyword.trim() === '') {
      throw new Error('Keyword is required for Reddit search');
    }

    // Build the search URL - try old.reddit.com which is less strict
    let searchUrl;
    if (subreddit) {
      // Search within specific subreddit
      searchUrl = `https://old.reddit.com/r/${subreddit}/search.json`;
    } else {
      // Search all of Reddit
      searchUrl = 'https://old.reddit.com/search.json';
    }

    // Build query parameters
    const params = new URLSearchParams({
      q: keyword,
      sort: sort,
      t: time,
      limit: Math.min(limit, 100), // Reddit API max is 100
      type: searchPosts ? 'link' : 'sr', // 'link' for posts, 'sr' for subreddits
      include_over_18: includeNSFW ? 'on' : 'off'
    });

    // If searching within subreddit, add restrict_sr parameter
    if (subreddit) {
      params.append('restrict_sr', 'on');
    }

    const fullUrl = `${searchUrl}?${params.toString()}`;
    console.log('Search URL:', fullUrl);

    // Add a small random delay to avoid rate limiting (100-300ms)
    const delay = Math.floor(Math.random() * 200) + 100;
    await new Promise(resolve => setTimeout(resolve, delay));

    // Make the request with a realistic browser User-Agent
    const response = await fetch(fullUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0',
        'DNT': '1',
        'Referer': 'https://www.google.com/'
      }
    });

    console.log('Response Status:', response.status, response.statusText);

    if (!response.ok) {
      // If blocked, provide helpful error message
      if (response.status === 403) {
        console.error('⚠️  Reddit is blocking requests from this server IP.');
        console.error('💡 This is common for cloud/datacenter IPs.');
        console.error('💡 Consider using Reddit OAuth API or a proxy service.');
      }
      throw new Error(`Reddit API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Check if we have valid data
    if (!data.data || !data.data.children) {
      console.log('No results found or invalid response structure');
      return {
        success: true,
        keyword: keyword,
        count: 0,
        posts: []
      };
    }

    // Parse and format the posts
    const posts = data.data.children
      .filter(child => child.kind === 't3') // t3 is Reddit's type for posts
      .map(child => {
        const post = child.data;
        
        return {
          id: `t3_${post.id}`,
          parsedId: post.id,
          url: `https://www.reddit.com${post.permalink}`,
          username: post.author,
          userId: post.author_fullname || null,
          title: post.title,
          communityName: `r/${post.subreddit}`,
          parsedCommunityName: post.subreddit,
          body: post.selftext || '',
          html: post.selftext_html || null,
          link: `https://www.reddit.com${post.permalink}`,
          numberOfComments: post.num_comments || 0,
          flair: post.link_flair_text || null,
          upVotes: post.ups || 0,
          upVoteRatio: post.upvote_ratio || 0,
          isVideo: post.is_video || false,
          isAd: post.promoted || false,
          over18: post.over_18 || false,
          thumbnailUrl: post.thumbnail || null,
          imageUrls: post.url && (post.url.endsWith('.jpg') || post.url.endsWith('.png') || post.url.endsWith('.gif')) 
            ? [post.url] 
            : [],
          createdAt: new Date(post.created_utc * 1000).toISOString(),
          scrapedAt: new Date().toISOString(),
          dataType: 'post'
        };
      });

    console.log(`Found ${posts.length} posts`);
    console.log('========================================\n');

    return {
      success: true,
      keyword: keyword,
      count: posts.length,
      posts: posts
    };

  } catch (error) {
    console.error('Reddit Search Error:', error);
    console.log('========================================\n');
    
    // If we got a 403 error, try Puppeteer as fallback
    if (error.message.includes('403')) {
      console.log('🔄 Attempting fallback to Puppeteer browser automation...');
      return searchRedditWithPuppeteer(keyword, options);
    }
    
    return {
      success: false,
      keyword: keyword,
      error: error.message,
      count: 0,
      posts: []
    };
  }
}

/**
 * Search multiple subreddits for a keyword
 * @param {string} keyword - The search term
 * @param {Array<string>} subreddits - Array of subreddit names (without 'r/')
 * @param {object} options - Same options as searchReddit
 * @returns {Promise<Object>} Object with results from all subreddits
 */
export async function searchMultipleSubreddits(keyword, subreddits, options = {}) {
  try {
    console.log('\n========================================');
    console.log('MULTI-SUBREDDIT SEARCH');
    console.log('========================================');
    console.log('Keyword:', keyword);
    console.log('Subreddits:', subreddits.join(', '));

    const results = {};
    let totalPosts = 0;

    for (const subreddit of subreddits) {
      console.log(`\nSearching r/${subreddit}...`);
      const result = await searchReddit(keyword, {
        ...options,
        subreddit: subreddit
      });

      results[subreddit] = result;
      if (result.success) {
        totalPosts += result.count;
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('\n========================================');
    console.log(`Total posts found across all subreddits: ${totalPosts}`);
    console.log('========================================\n');

    return {
      success: true,
      keyword: keyword,
      totalPosts: totalPosts,
      subreddits: results
    };

  } catch (error) {
    console.error('Multi-Subreddit Search Error:', error);
    return {
      success: false,
      keyword: keyword,
      error: error.message,
      totalPosts: 0,
      subreddits: {}
    };
  }
}

// Example usage when file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    // Test single search
    console.log('\n=== TEST 1: Single Keyword Search ===');
    const result1 = await searchReddit('javascript', {
      sort: 'new',
      time: 'week',
      limit: 5
    });
    console.log('Result:', JSON.stringify(result1, null, 2));

    // Test subreddit-specific search
    console.log('\n=== TEST 2: Subreddit-Specific Search ===');
    const result2 = await searchReddit('tutorial', {
      subreddit: 'learnprogramming',
      sort: 'top',
      time: 'month',
      limit: 3
    });
    console.log('Result:', JSON.stringify(result2, null, 2));

    // Test multiple subreddits
    console.log('\n=== TEST 3: Multiple Subreddits Search ===');
    const result3 = await searchMultipleSubreddits('nodejs', ['node', 'javascript', 'webdev'], {
      sort: 'new',
      limit: 2
    });
    console.log('Result:', JSON.stringify(result3, null, 2));
  })();
}

