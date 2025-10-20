import dotenv from "dotenv";
dotenv.config();

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
 * @returns {Promise<Array>} Array of post objects
 */
export async function searchReddit(keyword, options = {}) {
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

    // Build the search URL
    let searchUrl;
    if (subreddit) {
      // Search within specific subreddit
      searchUrl = `https://www.reddit.com/r/${subreddit}/search.json`;
    } else {
      // Search all of Reddit
      searchUrl = 'https://www.reddit.com/search.json';
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
        'Cache-Control': 'max-age=0'
      }
    });

    console.log('Response Status:', response.status, response.statusText);

    if (!response.ok) {
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

