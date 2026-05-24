require('dotenv').config();
const express = require('express');
const path = require('path');
const { createStore, normalizeSubdomain } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const LOCAL_HOST_NAMES = new Set(['localhost', '127.0.0.1']);

app.set('trust proxy', true);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

function normalizeHost(host) {
  return String(host || '')
    .split(':')[0]
    .trim()
    .toLowerCase()
    .replace(/\.$/, '');
}

function getRequestProtocol(req) {
  const forwardedProto = req.headers['x-forwarded-proto'];
  if (typeof forwardedProto === 'string') {
    return forwardedProto.split(',')[0];
  }

  return req.secure ? 'https' : 'http';
}

function getRootHost(req) {
  const configuredHost = normalizeHost(process.env.APP_BASE_HOST || '');
  if (configuredHost) {
    return configuredHost;
  }

  const vercelHost = normalizeHost(process.env.VERCEL_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || '');
  if (vercelHost) {
    return vercelHost;
  }

  return normalizeHost(req.headers.host || 'localhost');
}

function getSchoolSubdomain(req) {
  const host = normalizeHost(req.headers.host || '');
  const rootHost = getRootHost(req);

  if (!host || host === rootHost || LOCAL_HOST_NAMES.has(host)) {
    return null;
  }

  if (host.endsWith(`.${rootHost}`)) {
    return host.slice(0, host.length - rootHost.length - 1);
  }

  if (host.includes('.') && rootHost.includes('.')) {
    const firstLabel = host.split('.')[0];
    if (firstLabel && firstLabel !== 'www') {
      return firstLabel;
    }
  }

  return null;
}

function getSchoolUrl(req, subdomain) {
  const protocol = getRequestProtocol(req);
  const rootHost = getRootHost(req);

  if (LOCAL_HOST_NAMES.has(rootHost) || rootHost === 'localhost' || rootHost === '127.0.0.1') {
    return `${protocol}://${subdomain}.${rootHost}:${PORT}`;
  }

  return `${protocol}://${subdomain}.${rootHost}`;
}

app.use((req, res, next) => {
  req.schoolSubdomain = getSchoolSubdomain(req);
  next();
});

const store = createStore();

async function getSchoolContext(req) {
  if (!req.schoolSubdomain) {
    return null;
  }
  const subdomain = normalizeSubdomain(req.schoolSubdomain);
  if (!subdomain) {
    return null;
  }
  return store.getSchoolBySubdomain(subdomain);
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', database: store.kind });
});

app.get('/', async (req, res) => {
  if (req.schoolSubdomain) {
    const school = await getSchoolContext(req);
    if (!school) {
      return res.status(404).send('School portal not found.');
    }
    return res.sendFile(path.join(__dirname, 'public', 'school.html'));
  }

  return res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/auth/google', (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return res.status(503).json({
      message: 'Google sign-in is not configured yet. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI in your environment.',
    });
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
  });

  return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

app.get('/auth/google/callback', (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ message: 'Google sign-in callback failed. Missing auth code.' });
  }

  return res.json({
    message: 'Google callback is ready. Configure the token exchange to complete the sign-in flow using the returned authorization code.',
    code,
  });
});

app.get('/api/schools', async (_req, res) => {
  try {
    const schools = await store.listSchools();
    res.json({ schools });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/school-by-subdomain', async (req, res) => {
  try {
    const school = await getSchoolContext(req);
    if (!school) {
      return res.status(404).json({ error: 'School portal not found' });
    }
    res.json({ school });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/register-school', async (req, res) => {
  try {
    const { schoolName, adminName, adminEmail, packageType, password, subdomain } = req.body;

    if (!schoolName || !adminName || !adminEmail || !packageType || !password || !subdomain) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    const normalizedSubdomain = normalizeSubdomain(subdomain);
    if (!normalizedSubdomain) {
      return res.status(400).json({ error: 'Subdomain is invalid. Use letters, numbers, and hyphens only.' });
    }

    const existing = await store.getSchoolByEmail(adminEmail);
    if (existing) {
      return res.status(409).json({ error: 'This admin email is already in use.' });
    }

    const existingSubdomain = await store.getSchoolBySubdomain(normalizedSubdomain);
    if (existingSubdomain) {
      return res.status(409).json({ error: 'This subdomain is already in use.' });
    }

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 30);

    const school = await store.createSchool({
      school_name: schoolName,
      school_email: adminEmail,
      admin_name: adminName,
      package_type: packageType,
      subdomain: normalizedSubdomain,
      password,
      trial_ends_at: trialEndsAt.toISOString(),
      status: 'trial',
    });

    res.json({
      message: 'School registration is in progress.',
      school,
      subdomainUrl: getSchoolUrl(req, normalizedSubdomain),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

if (require.main === module) {
  app.listen(PORT, async () => {
    await store.init();
    console.log(`School platform running on http://localhost:${PORT}`);
    console.log(`Database mode: ${store.kind}`);
  });
}

module.exports = app;
