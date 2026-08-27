# AI Shopping Assistant Chatbot

A full-stack AI-powered e-commerce shopping assistant chatbot built with Node.js, Express, vanilla HTML/CSS/JS, and the Google Gemini API. Features live product search via Serper.dev, order tracking, and an automated FAQ.

## Features
- **Live Product Search**: Extracts product details from natural language and searches live using Serper.dev.
- **Order Tracking**: Looks up mock orders natively without hallucinations.
- **Support FAQ**: Answers common queries instantly using context injection.
- **Context-Aware Memory**: Handles conversational follow-ups accurately.
- **Graceful Fallbacks**: Uses pre-fetched data if the live API fails.

## Setup Instructions

1. **Install Dependencies**
   Run the following command in the root directory:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**
   - Copy `.env.example` to `.env`.
   - Obtain a Google Gemini API Key from [Google AI Studio](https://aistudio.google.com/).
   - Obtain a Serper API Key from [Serper.dev](https://serper.dev/).
   - Add the keys to the `.env` file.

3. **Start the Server**
   ```bash
   npm start
   ```
   *Alternatively, run `node backend/server.js` if you don't have the script set.*

4. **Access the Chatbot**
   Open your browser and navigate to `http://localhost:3000`.

## Directory Structure
- `/backend`: Contains the Express server, Gemini integration, and tools logic.
- `/frontend`: Contains the vanilla HTML, CSS, and JS UI.
