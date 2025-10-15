import axios from "axios";

async function getRedditAccessToken() {
  const clientId = "ox_IpudOacNTrC68D7yZkw";
  const clientSecret = "ouetFZNFOeiMNqmT0NNQnqmR3IAgXA";
  const username = "Commercial_Term_8918";
  const password = "Yadidiah@Humai.30";

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  try {
    const response = await axios.post(
      "https://www.reddit.com/api/v1/access_token",
      new URLSearchParams({
        grant_type: "password",
        username,
        password,
      }),
      {
        headers: {
          "User-Agent": "MyRedditBot/1.0 by u/Commepop918",
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
  
    console.log("Full response:", response.data); // 👈 add this line
    console.log("Access token:", response.data.access_token);
  } catch (error) {
    console.error("Error getting token:", error.response?.data || error.message);
  }
   
}

getRedditAccessToken();
