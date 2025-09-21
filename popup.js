// popup.js

// Global error handlers to catch any unexpected issues
window.addEventListener('error', (event) => {
    console.error('Global error caught:', event.error, event.message);
});
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});

// Main function that runs after the popup HTML is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Popup DOM loaded');

    // --- Element References ---
    const contentDiv = document.getElementById('content');
    const summarizeBtn = document.getElementById('summarizeBtn');
    const summarizedContentDiv = document.getElementById('summarizedContent');
    const translateBtn = document.getElementById('translateBtn');
    const targetLanguageSelect = document.getElementById('targetLanguage');
    const translatedContentDiv = document.getElementById('translatedContent');
    const shareTwitterBtn = document.getElementById('shareTwitterBtn');
    const shareFacebookBtn = document.getElementById('shareFacebookBtn');

    // --- State Variables ---
    let currentAnalysisData = null;
    let currentArticleTitle = '';
    let currentTabUrl = '';

    // --- Initial Setup ---
    // Show the initial loading state for the main analysis
    contentDiv.innerHTML = `
        <div class="loading-state">
            <div class="loader"></div>
            <p class="message">Analyzing article...</p>
        </div>
    `;

    // Get the active tab's URL and trigger the analysis
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].url) {
            currentTabUrl = tabs[0].url;
            // Send the initial message to background.js to start the fact-check
            chrome.runtime.sendMessage({ action: 'analyzeUrl', url: currentTabUrl }, (response) => {
                if (response?.error) {
                    displayError(response.error);
                }
            });
        } else {
            displayError("No active tab found or URL is not accessible.");
        }
    });

    // --- Main Message Listener ---
    // This single listener handles all incoming messages from the background script
    chrome.runtime.onMessage.addListener((message) => {
        console.log('📨 Message received in popup:', message.type, message);

        switch (message.type) {
            case 'ANALYSIS_RESULT':
                console.log('✅ Displaying analysis results');
                displayResults(message.data, message.articleTitle, message.note);
                break;
            case 'ANALYSIS_ERROR':
            case 'RUNTIME_ERROR':
                console.log('❌ Displaying analysis error:', message.error);
                displayError(message.error);
                break;
            case 'SUMMARY_RESULT':
                console.log('✅ Displaying summary result');
                summarizedContentDiv.innerHTML = `<p>${message.summary}</p>`;
                break;
            case 'TRANSLATION_RESULT':
                console.log('✅ Displaying translation result');
                translatedContentDiv.innerHTML = `<p>${message.translation}</p>`;
                break;
            case 'SUMMARY_ERROR':
            case 'TRANSLATION_ERROR':
            case 'ERROR': // Generic error for tools
                console.log('❌ Displaying tool error:', message.error);
                // Display the error in the correct tool's output div
                const errorDiv = message.type.includes('SUMMARY') ? summarizedContentDiv : translatedContentDiv;
                if(errorDiv) {
                    errorDiv.innerHTML = `<p class="error-message">${message.error}</p>`;
                }
                break;
        }
    });

    // --- Display Functions ---
    // Function to render the main fact-check analysis
    function displayResults(data, articleTitle, note) {
        currentAnalysisData = data;
        currentArticleTitle = articleTitle;
        const noteHtml = note ? `<div class="info-note">ℹ️ ${note}</div>` : '';
        let resultsHtml = '';

        if (data?.factCheck) {
            const { summary, claims, tone, reliabilityScore, bias, credibility } = data.factCheck;
            const claimsList = Array.isArray(claims) && claims.length > 0 ? `<ul>${claims.map(claim => `<li>${claim}</li>`).join('')}</ul>` : '<p>No specific claims identified.</p>';

            resultsHtml = `
                <div class="analysis-section"><h4>Summary</h4><p>${summary || 'Not available.'}</p></div>
                <div class="analysis-section"><h4>Key Claims</h4>${claimsList}</div>
                <div class="result-grid">
                    <div class="result-item"><h4>Reliability Score</h4><p class="score">${reliabilityScore || 'N/A'} / 10</p></div>
                    <div class="result-item"><h4>Detected Tone</h4><p>${tone || 'Unknown'}</p></div>
                    <div class="result-item"><h4>Bias</h4><p>${bias || 'Unknown'}</p></div>
                    <div class="result-item"><h4>Source Credibility</h4><p>${credibility || 'Unknown'}</p></div>
                </div>
            `;
        } else if (data?.results) { // Fallback view
            resultsHtml = `<div class="result-grid simple">${Object.entries(data.results).map(([key, value]) => `<div class="result-item"><h4>${key}</h4><p>${value}%</p></div>`).join('')}</div>`;
        } else {
            resultsHtml = `<div class="error-message">Could not parse the analysis data.</div>`;
        }

        contentDiv.innerHTML = `
            <div class="result-container">
                <h3>${articleTitle || 'Article Analysis'}</h3>
                ${noteHtml}
                ${resultsHtml}
            </div>
        `;
    }

    // Function to display an error message
    function displayError(message) {
        contentDiv.innerHTML = `<div class="error-message"><h4>Analysis Failed</h4><p>${message}</p></div>`;
    }

    // --- Accordion Tool Event Listeners ---
    summarizeBtn.addEventListener('click', () => {
        const isActive = summarizedContentDiv.classList.toggle('active');
        if (isActive) {
            translatedContentDiv.classList.remove('active'); // Close other tool
            summarizedContentDiv.innerHTML = '<div class="loading-state"><div class="loader-small"></div><p>Summarizing...</p></div>';
            chrome.runtime.sendMessage({ action: 'summarizeArticle' });
        }
    });

    translateBtn.addEventListener('click', () => {
        const isActive = translatedContentDiv.classList.toggle('active');
        if (isActive) {
            summarizedContentDiv.classList.remove('active'); // Close other tool
            const targetLang = targetLanguageSelect.value;
            translatedContentDiv.innerHTML = `<div class="loading-state"><div class="loader-small"></div><p>Translating to ${targetLang}...</p></div>`;
            chrome.runtime.sendMessage({ action: 'translateArticle', targetLang: targetLang });
        }
    });

    // --- Social Sharing Event Listeners ---
    shareTwitterBtn.addEventListener('click', () => {
        if (currentTabUrl) {
            const bias = currentAnalysisData?.factCheck?.bias || 'N/A';
            const credibility = currentAnalysisData?.factCheck?.credibility || 'N/A';
            const text = `Fact-check for "${currentArticleTitle}": Bias: ${bias}, Credibility: ${credibility}. See more: ${currentTabUrl}`;
            const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
            window.open(url, '_blank');
        }
    });

    shareFacebookBtn.addEventListener('click', () => {
        if (currentTabUrl) {
            const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentTabUrl)}`;
            window.open(url, '_blank');
        }
    });
});