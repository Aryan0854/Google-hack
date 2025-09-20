require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { JSDOM } = require('jsdom');
const Readability = require('../lib/Readability.js');
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
    const { url, text, html } = req.body;
    
    // Validate input
    if (!url && !text && !html) {
      return res.status(400).json({ 
        error: 'Missing required parameters. Please provide either URL, text content, or HTML content.' 
      });
    }
    
    let articleContent;
    
    // Extract content from URL if provided
    if (url) {
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36'
          }
        });
        const htmlContent = await response.text();
        const doc = new JSDOM(htmlContent, { url });
        const reader = new Readability(doc.window.document);
        const article = reader.parse();
        articleContent = article.textContent;
      } catch (error) {
        console.error('Error fetching URL:', error);
        return res.status(500).json({ error: 'Failed to fetch or parse URL' });
      }
    } 
    // Use provided text content
    else if (text) {
      articleContent = text;
    } 
    // Parse HTML content
    else if (html) {
      try {
        const doc = new JSDOM(html);
        const reader = new Readability(doc.window.document);
        const article = reader.parse();
        articleContent = article.textContent;
      } catch (error) {
        console.error('Error parsing HTML:', error);
        return res.status(500).json({ error: 'Failed to parse HTML content' });
      }
    }
    
    // Perform fact-checking with Gemini API
    const factCheckResult = await performFactCheck(articleContent);
    
    // Compare with other news sources (if needed)
    const comparisonResults = await compareWithOtherSources(articleContent);
    
    // Return combined results
    res.status(200).json({
      factCheck: factCheckResult,
      comparisons: comparisonResults
    });
    
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: 'An error occurred during analysis' });
  }
});

async function performFactCheck(content) {
  try {
    // Use Gemini API for fact-checking
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      throw new Error('Gemini API key not configured');
    }
    
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${GEMINI_API_KEY}`;
    
    // Create a prompt for fact-checking
    const prompt = `You are a fact-checking assistant. Please analyze the following news article content and identify:
    1.  A brief summary of the article's main points.
    2.  Key factual claims that can be verified.
    3.  An assessment of the article's tone (e.g., neutral, biased, sensationalist).
    4.  Any potentially misleading or false information, with explanations.
    5.  An overall reliability score on a scale of 1-10, where 1 is completely unreliable and 10 is highly reliable.
    6.  A list of sources that could be used to verify the article's claims.

    Please provide the response in a clean JSON format with keys: "summary", "claims", "tone", "misleadingInfo", "reliabilityScore", and "verificationSources".

    Article content: ${content.substring(0, 15000)}`; // Limit content length
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });
    
    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Gemini API error response:', errorBody);
      throw new Error(`Gemini API error: ${response.status}`);
    }
    
    const data = await response.json();
    if (!data.candidates || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0].text) {
        console.error('Incomplete Gemini response:', data);
        return { error: 'Failed to get a valid fact-check from the AI. The response was empty or incomplete.' };
    }
    const result = data.candidates[0].content.parts[0].text;

    // The Gemini API might return the JSON wrapped in markdown 
    const jsonResult = result.replace(/```json\n/g, '').replace(/\n```/g, '');

    try {
      return JSON.parse(jsonResult);
    } catch (e) {
      console.error('Failed to parse JSON from Gemini:', e);
      // If parsing fails, return the raw text for debugging
      return { rawAnalysis: result };
    }
  } catch (error) {
    console.error('Fact-checking error:', error);
    return { error: 'Failed to perform fact-checking' };
  }
}

async function compareWithOtherSources(content) {
  try {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      throw new Error('Gemini API key not configured');
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${GEMINI_API_KEY}`;

    const prompt = `Please analyze the following news article. Then, find 2-3 other reputable news articles from different sources about the same event or topic.
    For each of the other articles, provide the title, source, and a brief summary.
    Finally, compare the original article with the others, highlighting any major differences in reporting, facts, or perspective.

    Respond in JSON format with a main key "comparison" which is an array of objects, where each object has "title", "source", and "summary", and a final key "analysis" with the overall comparison.

    Original article content: ${content.substring(0, 15000)}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Gemini API error response:', errorBody);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    // Check for empty or incomplete response
    if (!data.candidates || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0].text) {
        console.error('Incomplete Gemini response:', data);
        return { error: 'Failed to get a valid comparison from the AI. The response was empty or incomplete.' };
    }
    const result = data.candidates[0].content.parts[0].text;

    // The Gemini API might return the JSON wrapped in markdown 
    const jsonResult = result.replace(/```json\n/g, '').replace(/\n```/g, '');

    try {
      return JSON.parse(jsonResult);
    } catch (e) {
      console.error('Failed to parse JSON from Gemini:', e);
      // If parsing fails, return the raw text for debugging
      return { rawAnalysis: result };
    }
  } catch (error) {
    console.error('Comparison error:', error);
    return { error: 'Failed to compare with other sources' };
  }
}

app.listen(port, () => {
  console.log(`News Fact-Checker API running on port ${port}`);
});
