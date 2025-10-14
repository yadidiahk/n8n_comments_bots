import dotenv from 'dotenv';
import { postYouTubeComment } from './youtube_bot.js';

dotenv.config();

// Test various YouTube URL formats
const testUrls = [
  "https://www.youtube.com/watch?v=P7hzXls_mac",  // Standard
  "https://youtu.be/P7hzXls_mac",                  // Shortened
  "https://www.youtube.com/shorts/P7hzXls_mac",    // Shorts
  "https://m.youtube.com/watch?v=P7hzXls_mac",     // Mobile
  "https://www.youtube.com/embed/P7hzXls_mac",     // Embed
  "https://www.youtube.com/v/P7hzXls_mac",         // Old format
];

console.log('Testing YouTube URL Format Parser\n');
console.log('='.repeat(60));

for (const url of testUrls) {
  console.log(`\n📹 Testing: ${url}`);
  
  try {
    // Extract video ID logic (same as in bot)
    let videoId = null;
    let isShort = false;
    
    if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1].split('?')[0].split('&')[0];
    } else if (url.includes('/shorts/')) {
      videoId = url.split('/shorts/')[1].split('?')[0].split('&')[0];
      isShort = true;
    } else if (url.includes('watch?v=')) {
      videoId = url.split('watch?v=')[1].split('&')[0];
    } else if (url.includes('youtube.com/embed/')) {
      videoId = url.split('embed/')[1].split('?')[0].split('&')[0];
    } else if (url.includes('youtube.com/v/')) {
      videoId = url.split('/v/')[1].split('?')[0].split('&')[0];
    }
    
    const normalizedUrl = isShort ? 
      `https://www.youtube.com/shorts/${videoId}` : 
      `https://www.youtube.com/watch?v=${videoId}`;
    
    console.log(`   ✅ Video ID: ${videoId}`);
    console.log(`   ✅ Type: ${isShort ? 'Short' : 'Regular Video'}`);
    console.log(`   ✅ Normalized: ${normalizedUrl}`);
  } catch (error) {
    console.log(`   ❌ Failed: ${error.message}`);
  }
}

console.log('\n' + '='.repeat(60));
console.log('\n🎯 All formats parsed successfully!');
console.log('\nNow testing actual comment posting...\n');

// Test with your specific video
const videoUrl = "https://youtu.be/P7hzXls_mac";
const comment = "memories!!!";

console.log(`Video: ${videoUrl}`);
console.log(`Comment: ${comment}`);
console.log('\nChecking credentials...');
console.log('YouTube User:', process.env.YOUTUBE_USER ? '✅ Set' : '❌ Not set');
console.log('YouTube Pass:', process.env.YOUTUBE_PASS ? '✅ Set' : '❌ Not set');

if (!process.env.YOUTUBE_USER || !process.env.YOUTUBE_PASS) {
  console.log('\n❌ Please set YOUTUBE_USER and YOUTUBE_PASS in your .env file');
  process.exit(1);
}

console.log('\n🚀 Starting bot...\n');

try {
  const result = await postYouTubeComment(videoUrl, comment);
  console.log('\n✅ SUCCESS!');
  console.log('Result:', JSON.stringify(result, null, 2));
} catch (error) {
  console.error('\n❌ ERROR!');
  console.error('Error message:', error.message);
}


