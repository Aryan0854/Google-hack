require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');

const app = express();
const port = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

// Health check endpoint
app.get('/', (req, res) => {
  res.status(200).send('News Fact-Checker API is running');
});

// Main analysis endpoint
app.post('/analyze', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Missing required parameter: text' });
    }
    
    const factCheckResult = await performFactCheck(text);
    
    // Simplified to only return factCheck, as comparison was not being used.
    res.status(200).json({
      factCheck: factCheckResult
    });
    
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: 'An error occurred during analysis' });
  }
});

async function performFactCheck(content) {
  try {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      throw new Error('Gemini API key not configured on the server.');
    }
    
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${GEMINI_API_KEY}`;
    
    const prompt = `You are a fact-checking assistant. Please analyze the following news article content and provide a detailed analysis.
    
    Your analysis should include:
    1.  A brief, neutral summary of the article's main points.
    2.  A list of the key factual claims made in the article that can be verified.
    3.  An assessment of the article's tone (e.g., neutral, biased, sensationalist).
    4.  An analysis of the political bias (e.g., Left-leaning, Center, Right-leaning, Neutral).
    5.  An assessment of the source's credibility (e.g., High, Medium, Low) based on journalistic standards.
    6.  An overall reliability score on a scale of 1-10.
    7.  A list of sources that could be used to verify the article's claims.

    Please provide the response in a clean JSON format with exactly these keys: "summary", "claims", "tone", "bias", "credibility", "reliabilityScore", and "verificationSources".

    Article content: ${content.substring(0, 15000)}`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });
    
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errorBody}`);
    }
    
    const data = await response.json();
    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
        console.error('Incomplete Gemini response:', data);
        return { error: 'Failed to get a valid fact-check from the AI.' };
    }
    const resultText = data.candidates[0].content.parts[0].text;

    // Clean up potential markdown formatting from the response
    const jsonResult = resultText.replace(/```json\n/g, '').replace(/\n```/g, '');

    try {
      return JSON.parse(jsonResult);
    } catch (e) {
      console.error('Failed to parse JSON from Gemini:', e);
      // If parsing fails, return the raw text for debugging
      return { rawAnalysis: resultText };
    }
  } catch (error) {
    console.error('Fact-checking error:', error);
    return { error: 'Failed to perform fact-checking.' };
  }
}

app.listen(port, () => {
  console.log(`News Fact-Checker API running on port ${port}`);
});