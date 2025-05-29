const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
const puppeteer = require('puppeteer');

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

// ======= SEO & GEO Logic ======= //
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

// ======= /analyze (SEO & GEO) ======= //
app.get('/analyze', async (req, res) => {
  try {
    const targetUrl = req.query.url;
    if (!targetUrl) {
      return res.status(400).json({ error: 'Missing url query parameter' });
    }

    const response = await axios.get(targetUrl);
    const html = response.data;
    const $ = cheerio.load(html);
    const h1Count = $('h1').length;

    const seoScore = calculateSeoScore(h1Count);
    const geoScore = calculateGeoScore(h1Count);

    const seoSuggestions = generateSeoSuggestions(h1Count);
    const geoSuggestions = generateGeoSuggestions(h1Count);

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
      details: {
        h1Count,
      },
    });
  } catch (error) {
    console.error('Error in /analyze:', error.message);
    res.status(500).json({ error: 'Something went wrong during analysis.' });
  }
});

// ======= /analyze/performance (Puppeteer) ======= //
app.get('/analyze/performance', async (req, res) => {
  const targetUrl = req.query.url;

  if (!targetUrl) {
    return res.status(400).json({ error: 'Missing url query parameter' });
  }

  try {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    let totalSize = 0;
    let requestCount = 0;

    // Track requests to measure size and count
    page.on('response', async (response) => {
      try {
        const buffer = await response.buffer();
        totalSize += buffer.length;
        requestCount++;
      } catch (e) {
        // Skip failed/blocked requests
      }
    });

    await page.goto(targetUrl, { waitUntil: 'load', timeout: 30000 });

    const metrics = await page.evaluate(() => {
      const timing = performance.timing;
      const paint = performance.getEntriesByType('paint');

      return {
        fcp: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
        domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
        totalLoadTime: timing.loadEventEnd - timing.navigationStart,
      };
    });

    await browser.close();

    res.json({
      url: targetUrl,
      performance: {
        FCP: `${metrics.fcp.toFixed(2)} ms`,
        DOMContentLoaded: `${metrics.domContentLoaded} ms`,
        LoadTime: `${metrics.totalLoadTime} ms`,
        Requests: requestCount,
        PageSizeKB: `${(totalSize / 1024).toFixed(2)} KB`,
      },
    });
  } catch (error) {
    console.error('Error in /analyze/performance:', error.message);
    res.status(500).json({ error: 'Failed to analyze performance.' });
  }
});

// ======= Start Server ======= //
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
