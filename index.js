const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

// ✅ Replace with your real Google API key (in quotes)
const GOOGLE_API_KEY = 'AIzaSyCnoZDb48zkO9FAyMmWQ-qX06IYYTGRTeM';

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

// ======= /analyze SEO & GEO ======= //
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

// ======= /analyze/performance (Google PSI) ======= //
app.get('/analyze/performance', async (req, res) => {
  try {
    const targetUrl = req.query.url;
    if (!targetUrl) {
      return res.status(400).json({ error: 'Missing url query parameter' });
    }

    const psiApiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(
      targetUrl
    )}&category=performance&key=${GOOGLE_API_KEY}`;

    const response = await axios.get(psiApiUrl);
    const audits = response.data.lighthouseResult?.audits;

    const fcp = audits['first-contentful-paint']?.displayValue || 'N/A';
    const lcp = audits['largest-contentful-paint']?.displayValue || 'N/A';
    const cls = audits['cumulative-layout-shift']?.displayValue || 'N/A';

    res.json({
      url: targetUrl,
      performance: {
        FCP: fcp,
        LCP: lcp,
        CLS: cls,
      },
    });
  } catch (error) {
    console.error('Error fetching performance data:', error.message);
    if (error.response?.data) {
      console.error('API Response:', JSON.stringify(error.response.data, null, 2));
      res.status(500).json({ error: error.response.data });
    } else {
      res.status(500).json({ error: 'Failed to fetch performance metrics' });
    }
  }
});

// ======= Start Server ======= //
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
