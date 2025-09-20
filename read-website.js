const { JSDOM } = require('jsdom');
const Readability = require('./lib/Readability.js');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const url = process.argv[2];
if (!url) {
    console.error('Please provide a URL as a command-line argument.');
    process.exit(1);
}

fetch(url)
    .then(res => res.text())
    .then(html => {
        const doc = new JSDOM(html, {
            url: url
        });
        const reader = new Readability(doc.window.document);
        const article = reader.parse();

        if (article && article.textContent) {
            const apiUrl = 'https://analyze-news-article-581998089560.asia-south1.run.app';
            return fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text: article.textContent })
            });
        } else {
            // If article content cannot be extracted, return a specific message
            return Promise.resolve({
                json: () => Promise.resolve({
                    error: 'Could not extract article content. This might not be a news article or the content is not parsable.'
                })
            });
        }
    })
    .then(res => res.json())
    .then(data => {
        console.log(JSON.stringify(data));
    })
    .catch(err => {
        console.error('Error:', err.message);
        process.exit(1);
    });