// background.js 

const GEMINI_API_KEY = 'AIzaSyA3_FSwOIgI7JvuDR3dQb3Ic3rUSB7Wh6M'; // Replace with your actual Gemini API key

async function callGeminiApi(prompt) {
    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'AIzaSyA3_FSwOIgI7JvuDR3dQb3Ic3rUSB7Wh6M') {
        throw new Error('Gemini API key not configured.');
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${GEMINI_API_KEY}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();

        if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
            return data.candidates[0].content.parts[0].text;
        } else {
            console.error('❌ Invalid Gemini API response structure:', data);
            throw new Error('Invalid API response structure.');
        }
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error('Request timed out after 30 seconds');
        }
        throw error;
    }
}

let lastAnalyzedArticle = null;

const newsDomains = [
    "nytimes.com", "bbc.com", "cnn.com", "reuters.com", "wsj.com", "theguardian.com", 
    "washingtonpost.com", "foxnews.com", "apnews.com", "bloomberg.com", "politico.com",
    "huffpost.com", "usatoday.com", "npr.org", "cbsnews.com", "nbcnews.com", 
    "abcnews.go.com", "time.com", "newsweek.com", "economist.com", "forbes.com",
    "businessinsider.com", "axios.com", "vice.com", "vox.com"
];

function isNewsSite(url) {
    try {
        const hostname = new URL(url).hostname;
        return newsDomains.some(domain => hostname.includes(domain));
    } catch (e) {
        return false;
    }
}

async function retryBackendCall(backendUrl, articleText, maxRetries = 3) {
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 25000);
            const response = await fetch(backendUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: articleText }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }
            return await response.json();
        } catch (error) {
            lastError = error;
            console.warn(`❌ Backend call attempt ${attempt} failed:`, error.message);
            if (error.message.includes('404') || error.message.includes('403')) break;
            if (attempt < maxRetries) {
                const delay = Math.min(1000 * 2 ** (attempt - 1), 5000);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    throw lastError;
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
        if (isNewsSite(tab.url)) {
            chrome.action.setBadgeText({ text: 'NEWS', tabId: tabId });
            chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
            chrome.action.setTitle({ title: 'News Article Detected!', tabId: tabId });
        } else {
            chrome.action.setBadgeText({ text: '', tabId: tabId });
            chrome.action.setTitle({ title: 'FactCheck AI', tabId: tabId });
        }
    }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "analyzeUrl") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.scripting.executeScript({
                    target: { tabId: tabs[0].id },
                    files: ['lib/Readability.js', 'content.js']
                }, () => {
                    if (chrome.runtime.lastError) sendResponse({ error: chrome.runtime.lastError.message });
                    else setTimeout(() => sendResponse({ success: true }), 200);
                });
            } else {
                sendResponse({ error: "No active tab found." });
            }
        });
        return true;
    }

    if (message.type === "ARTICLE_CONTENT") {
        console.log('📨 Received ARTICLE_CONTENT from content script');
        lastAnalyzedArticle = message.article;
        const backendUrl = 'https://news-fact-checker-995472578081.asia-south1.run.app/analyze';
        const truncatedText = message.article.textContent.substring(0, 4000);
        console.log('🚀 Starting backend API call to:', backendUrl);

        retryBackendCall(backendUrl, truncatedText)
            .then(data => {
                console.log("✅ Backend API call successful");
                console.log("FULL BACKEND RESPONSE:", JSON.stringify(data, null, 2));
                const bias = data?.factCheck?.bias || 'Unknown';
                const credibility = data?.factCheck?.credibility || 'Unknown';

                console.log('📤 Sending ANALYSIS_RESULT to popup');
                chrome.runtime.sendMessage({
                    type: 'ANALYSIS_RESULT',
                    data: data,
                    articleTitle: message.article.title,
                    bias: bias,
                    credibility: credibility
                });
            })
            .catch(error => {
                console.error('❌ Backend call failed:', error);
                console.log('📤 Sending ANALYSIS_ERROR to popup');
                chrome.runtime.sendMessage({ type: 'ANALYSIS_ERROR', error: `Service Error: ${error.message}` });
            });
        return true;
    }

    if (message.action === "summarizeArticle" || message.action === "translateArticle") {
        if (!lastAnalyzedArticle?.textContent) {
            sendResponse({ type: 'ERROR', error: "No article content available." });
            return true;
        }

        let prompt = '';
        if (message.action === "summarizeArticle") {
            prompt = `Provide a concise, neutral summary of the following article in 3-4 sentences:\n\n---\n${lastAnalyzedArticle.textContent.substring(0, 4000)}`;
        } else {
            prompt = `Translate the following article to ${message.targetLang}:\n\n---\n${lastAnalyzedArticle.textContent.substring(0, 4000)}`;
        }

        callGeminiApi(prompt)
            .then(result => {
                if (message.action === "summarizeArticle") {
                    sendResponse({ type: 'SUMMARY_RESULT', summary: result });
                } else {
                    sendResponse({ type: 'TRANSLATION_RESULT', translation: result, lang: message.targetLang });
                }
            })
            .catch(error => sendResponse({ type: 'ERROR', error: `AI call failed: ${error.message}` }));
        
        return true;
    }
});