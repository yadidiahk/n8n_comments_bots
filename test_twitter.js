import { postTwitterComment } from './twitter_bot.js';

async function test() {
  try {
    // Replace with a real Twitter tweet URL for testing
    const testTweetUrl = 'https://twitter.com/username/status/1234567890';
    const testComment = 'This is a test reply from the automated bot!';
    
    console.log('Starting Twitter reply test...');
    console.log(`Tweet URL: ${testTweetUrl}`);
    console.log(`Reply: ${testComment}`);
    console.log('---');
    
    const result = await postTwitterComment(testTweetUrl, testComment);
    
    console.log('---');
    console.log('Test completed successfully!');
    console.log('Result:', result);
  } catch (error) {
    console.error('Test failed:', error.message);
    process.exit(1);
  }
}

test();

