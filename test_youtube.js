import dotenv from 'dotenv';
import { postYouTubeComment } from './youtube_bot.js';

// Load environment variables
dotenv.config();

async function testYouTubeBot() {
  console.log("=== Starting YouTube Bot Test ===");
  console.log("Target URL: https://www.youtube.com/watch?v=z2SPBQMrye8");
  
  const videoUrl = "https://www.youtube.com/watch?v=z2SPBQMrye8";
  const testComment = "Great content! Thanks for sharing this valuable information.";
  
  console.log(`Test Comment: "${testComment}"`);
  console.log("Starting bot...\n");
  
  try {
    const result = await postYouTubeComment(videoUrl, testComment);
    
    console.log("\n=== TEST RESULT ===");
    console.log("✓ Success:", result.success);
    console.log("✓ Message:", result.message);
    console.log("✓ Video URL:", result.videoUrl);
    console.log("✓ Comment Posted:", result.comment);
    console.log("\n=== TEST PASSED ===");
    
  } catch (error) {
    console.error("\n=== TEST FAILED ===");
    console.error("✗ Error:", error.message);
    console.error("\nFull error details:");
    console.error(error);
    process.exit(1);
  }
}

testYouTubeBot();

