import dotenv from 'dotenv';
import { postYouTubeComment } from './youtube_bot.js';

dotenv.config();

const videoUrl = "https://www.youtube.com/watch?v=z2SPBQMrye8";
const comment = "memories!!!";

console.log('Testing YouTube Bot...');
console.log('Video URL:', videoUrl);
console.log('Comment:', comment);
console.log('\nChecking credentials...');
console.log('YouTube User:', process.env.YOUTUBE_USER ? '✅ Set' : '❌ Not set');
console.log('YouTube Pass:', process.env.YOUTUBE_PASS ? '✅ Set' : '❌ Not set');
console.log('\n---\n');

try {
  const result = await postYouTubeComment(videoUrl, comment);
  console.log('\n✅ SUCCESS!');
  console.log('Result:', JSON.stringify(result, null, 2));
} catch (error) {
  console.error('\n❌ ERROR!');
  console.error('Error message:', error.message);
  console.error('\nFull error:', error);
}
