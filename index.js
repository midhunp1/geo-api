const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();
app.use(cors());

app.get('/analyze', async (req, res) => {
  const url = req.query.url;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    // Extract info
    const title = $('title').text() || '';
    const metaDesc = $('meta[name="description"]').attr('content') || '';
    const h1Tags = $('h1');
    const h1Count = h1Tags.length;
    const hasFaqSchema = $('script[type="application/ld+json"]').text().includes('FAQPage');

    const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
    const wordCount = bodyText.split(' ').length;

    // SEO Score (out of 100)
    let seoScore = 50;
    if (title) seoScore += 10;
    if (metaDesc.length >= 80) seoScore += 10;
    if (h1Count > 0) seoScore += 10;
    if (wordCount > 300) seoScore += 10;
    if (hasFaqSchema) seoScore += 10;

    // GEO Score (out of 100)
    let geoScore = 50;
    if (metaDesc.match(/AI|machine learning|FAQ|guide|how to/i)) geoScore += 10;
    if (hasFaqSchema) geoScore += 10;
    if (title.match(/\b(what|how|why|guide|tips)\b/i)) geoScore += 10;
    if (bodyText.match(/\b(who is|how does|what is)\b/i)) geoScore += 10;
    if (wordCount > 500) geoScore += 10;

    // SEO Suggestions
    const seoSuggestions = [];
    if (!title) seoSuggestions.push('Add a page title.');
    if (metaDesc.length < 80) seoSuggestions.push('Use a meta description with 80–160 characters.');
    if (h1Count === 0) seoSuggestions.push('Add at least one <h1> tag.');
    if (wordCount < 300) seoSuggestions.push('Add more body content.');

    // GEO Suggestions
    const geoSuggestions = [];
    if (!hasFaqSchema) geoSuggestions.push('Add FAQ schema using JSON-LD for AI visibility.');
    if (!metaDesc.match(/AI|FAQ|how to|guide/i)) geoSuggestions.push('Use AI-friendly keywords in meta description.');
    if (!title.match(/\bhow|why|what\b/i)) geoSuggestions.push('Use question-style titles to attract AI and search bots.');
    if (wordCount < 500) geoSuggestions.push('Expand your content to improve AI understanding.');

    res.json({
      url,
      title,
      metaDesc,
      h1Count,
      wordCount,
      seoScore,
      geoScore,
      seoSuggestions,
      geoSuggestions
    });

  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch or analyze the website.', details: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ GEO/SEO API running at http://localhost:${PORT}`));
