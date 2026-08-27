require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { processChat } = require('./groq');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend')));

app.post('/chat', async (req, res) => {
  try {
    const { history } = req.body;
    if (!history || !Array.isArray(history)) {
      return res.status(400).json({ error: "Invalid history array provided." });
    }

    const responseText = await processChat(history);
    res.json({ response: responseText });
  } catch (error) {
    console.error("Error in /chat endpoint:", error);
    res.status(500).json({ error: "An error occurred while processing your request." });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
