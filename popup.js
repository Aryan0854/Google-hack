// Global error handler
window.addEventListener('error', (event) => {
    console.error('Global error caught:', event.error);
    console.error('Error message:', event.message);
    console.error('Error stack:', event.error.stack);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});

document.addEventListener('DOMContentLoaded', () => {
    console.log('Popup DOM loaded');
    const contentDiv = document.getElementById('content');
    const themeToggle = document.getElementById('themeToggle');
    let currentAnalysisData = null;
    let currentArticleTitle = '';
    let currentArticleContent = '';
    let currentBias = '';
    let currentCredibility = '';
    let currentTabUrl = '';

    // Log button availability
    console.log('Theme toggle button found:', !!themeToggle);
    console.log('Content div found:', !!contentDiv);

    // Theme toggle
    console.log('Loading theme preference from storage...');
    chrome.storage.sync.get(['darkMode'], (data) => {
        if (chrome.runtime.lastError) {
            console.error('Error loading theme preference:', chrome.runtime.lastError);
            // Fallback to light mode
            document.body.classList.remove('dark-mode');
            themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
            return;
        }
        console.log('Storage data received:', data);
        const isDark = data.darkMode || false;
        console.log('Setting dark mode to:', isDark);
        document.body.classList.toggle('dark-mode', isDark);
        themeToggle.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        console.log('Initial theme setup complete');
    });

    themeToggle.addEventListener('click', () => {
        console.log('Theme toggle clicked');
        const isDark = document.body.classList.toggle('dark-mode');
        console.log('Dark mode toggled to:', isDark);
        chrome.storage.sync.set({ darkMode: isDark }, () => {
            if (chrome.runtime.lastError) {
                console.error('Error saving theme preference:', chrome.runtime.lastError);
            } else {
                console.log('Theme preference saved successfully');
            }
        });
        themeToggle.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        console.log('Theme toggle icon updated');
    });

    // Show loading state initially
    contentDiv.innerHTML = `
        <div class="loading-state">
            <div class="loader"></div>
            <p class="message">Analyzing article...</p>
        </div>
    `;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        console.log('Active tab query result:', tabs);
        if (tabs && tabs[0]) {
            currentTabUrl = tabs[0].url;
            console.log('Current tab URL set to:', currentTabUrl);
        } else {
            console.error('No active tab found');
        }
    });

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const currentTab = tabs[0];
        console.log('🔍 Sending analyzeUrl message to background script for URL:', currentTab.url);
        // Send message to background.js to process the URL
        chrome.runtime.sendMessage({ action: 'analyzeUrl', url: currentTab.url }, (response) => {
            console.log('📡 Response from background script:', response);
            if (response && response.error) {
                displayError(response.error);
            } else if (response && response.success) {
                // Wait for analysis results
                console.log('✅ Content scripts injected successfully');
            } else {
                displayError('Could not analyze this content.');
            }
        });
    });

    // Listen for analysis results from background script
    chrome.runtime.onMessage.addListener((message) => {
        console.log('📨 Message received in popup:', message);
        if (message.type === 'ANALYSIS_RESULT') {
            console.log('✅ Displaying analysis results');
            displayResults(message.data, message.articleTitle, message.articleContent, message.bias, message.credibility, message.note);
        } else if (message.type === 'ANALYSIS_ERROR') {
            console.log('❌ Displaying analysis error:', message.error);
            displayError(message.error);
        } else if (message.type === 'RUNTIME_ERROR') {
            console.log('❌ Displaying runtime error:', message.error);
            displayError(`Runtime error: ${message.error}`);
        } else if (message.type === 'SUMMARY_RESULT') {
            console.log('📝 Displaying summary result');
            const summarizedContentDiv = document.getElementById('summarizedContent');
            summarizedContentDiv.innerHTML = `<h4>Summary:</h4><p>${message.summary}</p>`;
        } else if (message.type === 'SUMMARY_ERROR') {
            console.log('❌ Displaying summary error:', message.error);
            const summarizedContentDiv = document.getElementById('summarizedContent');
            summarizedContentDiv.innerHTML = `<div class="error-message">${message.error}</div>`;
        } else if (message.type === 'TRANSLATION_RESULT') {
            console.log('🌐 Displaying translation result');
            const translatedContentDiv = document.getElementById('translatedContent');
            translatedContentDiv.innerHTML = `<h4>Translation (${message.lang}):</h4><p>${message.translation}</p>`;
        } else if (message.type === 'TRANSLATION_ERROR') {
            console.log('❌ Displaying translation error:', message.error);
            const translatedContentDiv = document.getElementById('translatedContent');
            translatedContentDiv.innerHTML = `<div class="error-message">${message.error}</div>`;
        } else {
            console.log('⚠️ Unknown message type:', message.type);
        }
    });

    function displayResults(data, articleTitle, articleContent, bias, credibility, note) {
        console.log('Displaying analysis results');
        console.log('Data received:', data);
        console.log('Article title:', articleTitle);
        console.log('Article content length:', articleContent ? articleContent.length : 0);

        currentAnalysisData = data;
        currentArticleTitle = articleTitle;
        currentArticleContent = articleContent;
        currentBias = bias;
        currentCredibility = credibility;

        const noteHtml = note ? `<div class="info-note" style="background: #e3f2fd; padding: 10px; border-radius: 5px; margin-bottom: 15px; font-size: 0.9em; color: #1565c0;">ℹ️ ${note}</div>` : '';

        let resultsHtml = '';
        if (typeof data === 'string') {
            resultsHtml = `<p>${data}</p>`;
        } else if (typeof data === 'object' && data !== null) {
            if (data.results && typeof data.results === 'object') {
                resultsHtml = Object.entries(data.results).map(([key, value]) => `
                    <div class="result-item">
                        <h4>${key}:</h4>
                        <p>${value}%</p>
                    </div>
                `).join('');
            } else {
                resultsHtml = Object.entries(data).map(([key, value]) => `
                    <div class="result-item">
                        <h4>${key}:</h4>
                        <p>${JSON.stringify(value, null, 2)}</p>
                    </div>
                `).join('');
            }
        } else {
            resultsHtml = `<p>Unexpected data format from backend.</p>`;
        }


        contentDiv.innerHTML = `
            <div class="result-container">
                <h3>${articleTitle || 'Article Analysis'}</h3>
                <p>${(articleContent || '').substring(0, 500)}...</p> <!-- Display first 500 characters -->
                ${noteHtml}
                <h4>Analysis Complete</h4>
                ${resultsHtml}
                <div class="result-item">
                    <h4>Bias:</h4>
                    <p>${bias || 'Unknown'}</p>
                </div>
                <div class="result-item">
                    <h4>Source Credibility:</h4>
                    <p>${credibility || 'Unknown'}</p>
                </div>
            </div>
        `;
    }

    function displayError(message) {
        contentDiv.innerHTML = `<div class="error-message">Failed to analyze the article. Please try again later. Error: ${message}</div>`;
    }

    // Summarization Feature
    const summarizeBtn = document.getElementById('summarizeBtn');
    const summarizedContentDiv = document.getElementById('summarizedContent');

    summarizeBtn.addEventListener('click', () => {
        console.log('📝 Summarize button clicked');
        summarizedContentDiv.innerHTML = '<div class="loading-state"><div class="loader"></div><p class="message">Summarizing article...</p></div>';
        chrome.runtime.sendMessage({ action: 'summarizeArticle' }, (response) => {
            console.log('📨 Summary response received:', response);
            if (response && response.type === 'SUMMARY_RESULT') {
                summarizedContentDiv.innerHTML = `<h4>Summary:</h4><p>${response.summary}</p>`;
            } else if (response && response.type === 'SUMMARY_ERROR') {
                summarizedContentDiv.innerHTML = `<div class="error-message">${response.error}</div>`;
            } else {
                summarizedContentDiv.innerHTML = `<div class="error-message">Unexpected response: ${JSON.stringify(response)}</div>`;
            }
        });
    });

    // Translation Feature
    const translateBtn = document.getElementById('translateBtn');
    const targetLanguageSelect = document.getElementById('targetLanguage');
    const translatedContentDiv = document.getElementById('translatedContent');

    translateBtn.addEventListener('click', () => {
        console.log('🌐 Translate button clicked');
        translatedContentDiv.innerHTML = '<div class="loading-state"><div class="loader"></div><p class="message">Translating article...</p></div>';
        const targetLang = targetLanguageSelect.value;
        console.log('🎯 Target language:', targetLang);

        chrome.runtime.sendMessage({ action: 'translateArticle', targetLang: targetLang }, (response) => {
            console.log('📨 Translation response received:', response);
            if (response && response.type === 'TRANSLATION_RESULT') {
                translatedContentDiv.innerHTML = `<h4>Translation (${response.lang}):</h4><p>${response.translation}</p>`;
            } else if (response && response.type === 'TRANSLATION_ERROR') {
                translatedContentDiv.innerHTML = `<div class="error-message">${response.error}</div>`;
            } else {
                translatedContentDiv.innerHTML = `<div class="error-message">Unexpected response: ${JSON.stringify(response)}</div>`;
            }
        });
    });


    // Save for Offline Feature
    const saveOfflineBtn = document.getElementById('saveOfflineBtn');
    // I'll use the contentDiv to display messages for saving, or create a new div if needed.
    // For now, let's just log to console and assume a success message will be handled by background.js response.

    saveOfflineBtn.addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const currentTab = tabs[0];
            if (currentTab) {
                chrome.runtime.sendMessage({
                    action: 'saveArticleOffline',
                    tabId: currentTab.id,
                    url: currentTab.url
                }, (response) => {
                    if (response && response.success) {
                        contentDiv.innerHTML = `<div class="success-message">${response.success}</div>`;
                    } else if (response && response.error) {
                        contentDiv.innerHTML = `<div class="error-message">${response.error}</div>`;
                    } else {
                        contentDiv.innerHTML = `<div class="error-message">Unknown error occurred while saving.</div>`;
                    }
                });
            }
        });
    });

    // Social Sharing
    const shareTwitterBtn = document.getElementById('shareTwitterBtn');
    const shareFacebookBtn = document.getElementById('shareFacebookBtn');

    shareTwitterBtn.addEventListener('click', () => {
        console.log('Twitter share button clicked');
        console.log('currentTabUrl:', currentTabUrl);

        if (currentTabUrl) {
            let text = `Check out this article: ${currentTabUrl}`;

            // If we have analysis data, include it
            if (currentAnalysisData && currentArticleTitle) {
                text = `Check this article: ${currentArticleTitle} - Fact-check: True ${currentAnalysisData.results.true}%, Bias: ${currentBias}, Credibility: ${currentCredibility} ${currentTabUrl}`;
            }

            const url = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;
            console.log('Twitter share URL:', url);

            try {
                const newWindow = window.open(url, '_blank', 'width=600,height=400');
                if (!newWindow) {
                    console.error('Popup blocked! Twitter share window could not be opened.');
                    alert('Popup blocked! Please allow popups for this site.');
                } else {
                    console.log('Twitter share window opened successfully');
                    newWindow.focus();
                }
            } catch (error) {
                console.error('Error opening Twitter share window:', error);
                alert('Error opening Twitter share. Please try again.');
            }
        } else {
            console.warn('Cannot share to Twitter: no URL available');
            alert('No URL available to share.');
        }
    });

    shareFacebookBtn.addEventListener('click', () => {
        console.log('Facebook share button clicked');
        console.log('currentTabUrl:', currentTabUrl);

        if (currentTabUrl) {
            const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentTabUrl)}`;
            console.log('Facebook share URL:', url);

            try {
                const newWindow = window.open(url, '_blank', 'width=600,height=400');
                if (!newWindow) {
                    console.error('Popup blocked! Facebook share window could not be opened.');
                    alert('Popup blocked! Please allow popups for this site to share on Facebook.\n\nAlternatively, copy this link manually:\n' + url);
                } else {
                    console.log('Facebook share window opened successfully');
                    // Focus the new window
                    newWindow.focus();
                }
            } catch (error) {
                console.error('Error opening Facebook share window:', error);
                alert('Error opening Facebook share. Please try again or copy the link manually.');
            }
        } else {
            console.warn('Cannot share to Facebook: missing URL');
            alert('Cannot share: no URL available.');
        }
    });

    // Service Status Check
    const checkServiceBtn = document.getElementById('checkServiceBtn');

    checkServiceBtn.addEventListener('click', () => {
        console.log('🔍 Checking service status...');
        checkServiceBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking...';
        checkServiceBtn.disabled = true;

        chrome.runtime.sendMessage({ action: 'checkServiceStatus' }, (response) => {
            console.log('📨 Service status response:', response);
            checkServiceBtn.innerHTML = '<i class="fas fa-server"></i> Check Service';
            checkServiceBtn.disabled = false;

            if (response && response.type === 'SERVICE_STATUS_RESULT') {
                const statusIcon = response.isUp ? '🟢' : '🔴';
                const statusText = response.isUp ? 'Service is UP' : 'Service is DOWN';
                const statusDetails = response.statusCode ? ` (Status: ${response.statusCode})` : '';

                // Show status in content area
                contentDiv.innerHTML = `
                    <div class="service-status-result" style="text-align: center; padding: 20px;">
                        <h3>${statusIcon} ${statusText}${statusDetails}</h3>
                        <p>Backend service: https://news-fact-checker-995472578081.asia-south1.run.app/analyze</p>
                        ${response.isUp ?
                            '<p style="color: #4caf50;">✅ Service is responding correctly</p>' :
                            '<p style="color: #f44336;">❌ Service is not responding</p>'
                        }
                    </div>
                `;
            } else if (response && response.type === 'SERVICE_STATUS_ERROR') {
                contentDiv.innerHTML = `
                    <div class="service-status-result" style="text-align: center; padding: 20px;">
                        <h3>🔴 Service Status Check Failed</h3>
                        <p>Error: ${response.error}</p>
                    </div>
                `;
            } else {
                contentDiv.innerHTML = `
                    <div class="service-status-result" style="text-align: center; padding: 20px;">
                        <h3>⚠️ Unable to check service status</h3>
                        <p>Unexpected response: ${JSON.stringify(response)}</p>
                    </div>
                `;
            }
        });
    });

    // Export Options
    const exportJSONBtn = document.getElementById('exportJSONBtn');
    const exportTextBtn = document.getElementById('exportTextBtn');

    exportJSONBtn.addEventListener('click', () => {
        if (currentAnalysisData) {
            const data = {
                title: currentArticleTitle,
                content: currentArticleContent,
                analysis: currentAnalysisData,
                bias: currentBias,
                credibility: currentCredibility,
                url: currentTabUrl
            };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'factcheck-report.json';
            a.click();
            URL.revokeObjectURL(url);
        }
    });

    exportTextBtn.addEventListener('click', () => {
        if (currentAnalysisData) {
            const text = `Article: ${currentArticleTitle}\n\nAnalysis:\nTrue: ${currentAnalysisData.results.true}%\nFalse: ${currentAnalysisData.results.false}%\nUnknown: ${currentAnalysisData.results.unknown}%\nBias: ${currentBias}\nCredibility: ${currentCredibility}\n\nContent:\n${currentArticleContent}`;
            const blob = new Blob([text], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'factcheck-report.txt';
            a.click();
            URL.revokeObjectURL(url);
        }
    });
});