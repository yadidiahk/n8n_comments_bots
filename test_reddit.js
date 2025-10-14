import { postRedditComment } from './reddit_bot.js';

async function test() {
  try {
    // Replace with a real Reddit post URL for testing
    const testPostUrl = 'https://www.reddit.com/r/test/comments/EXAMPLE/';
    const testComment = 'This is a test comment from the automated bot!';
    
    console.log('Starting Reddit comment test...');
    console.log(`Post URL: ${testPostUrl}`);
    console.log(`Comment: ${testComment}`);
    console.log('---');
    
    const result = await postRedditComment(testPostUrl, testComment);
    
    console.log('---');
    console.log('Test completed successfully!');
    console.log('Result:', result);
  } catch (error) {
    console.error('Test failed:', error.message);
    process.exit(1);
  }
}

test();

