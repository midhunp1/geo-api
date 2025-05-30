const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

// === Scoring Functions ===
function calculateSeoScore(h1Count) {
  if (h1Count === 1) return 90;
  if (h1Count === 0) return 30;
  return Math.max(0, 100 - (h1Count - 1) * 20);
}

function calculateGeoScore(h1Count) {
  return h1Count > 0 ? 80 : 40;
}

function generateSeoSuggestions(h1Count) {
  if (h1Count === 0) return ['Add at least one <h1> tag for better SEO.'];
  if (h1Count > 1) return ['Reduce multiple <h1> tags to only one per page.'];
  return ['Good number of <h1> tags found.'];
}

function generateGeoSuggestions(h1Count) {
  if (h1Count === 0) return ['Include headings to improve content structure for AI models.'];
  return ['Content structure looks good for AI analysis.'];
}

// === Analyze Endpoint ===
app.get('/analyze', async (req, res) => {
  try {
    const targetUrl = req.query.url;
    if (!targetUrl) {
      return res.status(400).json({ error: 'Missing url query parameter' });
    }

    const response = await axios.get(targetUrl);
    const html = response.data;
    const $ = cheerio.load(html);

    // SEO & GEO logic
    const h1Count = $('h1').length;
    const seoScore = calculateSeoScore(h1Count);
    const geoScore = calculateGeoScore(h1Count);
    const seoSuggestions = generateSeoSuggestions(h1Count);
    const geoSuggestions = generateGeoSuggestions(h1Count);

    // Extra Metadata & Stats
    const title = $('title').text().trim();
    const metaDescription = $('meta[name="description"]').attr('content') || 'N/A';

    const text = $('body').text().replace(/\s+/g, ' ');
    const wordCount = text.split(' ').filter(Boolean).length;

    const links = $('a');
    const totalLinks = links.length;
    let internalLinks = 0, externalLinks = 0;
    links.each((_, el) => {
      const href = $(el).attr('href');
      if (href && href.startsWith('http')) externalLinks++;
      else internalLinks++;
    });

    const images = $('img');
    const imagesWithAlt = images.filter((_, img) => $(img).attr('alt') && $(img).attr('alt').trim() !== '').length;

    const inlineStyles = $('[style]').length;
    const externalCss = $('link[rel="stylesheet"]').length;

    const scriptTags = $('script');
    const scriptCounts = {
      total: scriptTags.length,
      async: scriptTags.filter((_, el) => $(el).attr('async') !== undefined).length,
      defer: scriptTags.filter((_, el) => $(el).attr('defer') !== undefined).length
    };

    res.json({
      url: targetUrl,
      seo: {
        score: seoScore,
        suggestions: seoSuggestions,
      },
      geo: {
        score: geoScore,
        suggestions: geoSuggestions,
      },
      metadata: {
        title,
        metaDescription,
      },
      contentStats: {
        h1Count,
        wordCount,
        links: {
          total: totalLinks,
          internal: internalLinks,
          external: externalLinks,
        },
        images: {
          total: images.length,
          withAlt: imagesWithAlt,
        },
        styles: {
          inlineStyles,
          externalCss,
        },
        scripts: scriptCounts,
      }
    });
  } catch (error) {
    console.error('Error in /analyze:', error.message);
    res.status(500).json({ error: 'Something went wrong during analysis.' });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
