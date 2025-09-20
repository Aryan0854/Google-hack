// content.js

console.log('📖 Content script started on:', window.location.href);

try {
    // Use a clone of the document so we don't interfere with the live page
    console.log('🔄 Cloning document...');
    const documentClone = document.cloneNode(true);
    console.log('✅ Document cloned successfully');

    console.log('🤖 Initializing Readability...');
    const reader = new Readability(documentClone);
    console.log('✅ Readability initialized');

    console.log('📖 Parsing article...');
    const article = reader.parse();
    console.log('🔍 Readability parse result:', {
        hasArticle: !!article,
        title: article?.title,
        textLength: article?.textContent?.length,
        excerpt: article?.textContent?.substring(0, 200) + '...'
    });

    // Check if an article was successfully found
    if (article && article.textContent && article.textContent.length > 100) {
        console.log("✅ Readability.js extracted article content successfully");

        // Send the clean article object back to the background script
        chrome.runtime.sendMessage({
            type: "ARTICLE_CONTENT",
            article: {
                title: article.title,
                textContent: article.textContent,
                content: article.content // Send HTML content as well
            }
        });
    } else {
        console.log("❌ No article found by Readability.js or article too short");
        // If no article was found, send a message indicating that
        chrome.runtime.sendMessage({
            type: "NO_ARTICLE_FOUND"
        });
    }
} catch (error) {
    console.error("❌ Error in content.js:", error);
    chrome.runtime.sendMessage({
        type: "RUNTIME_ERROR",
        error: error.message
    });
}