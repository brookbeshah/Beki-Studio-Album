import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';
import firebaseConfig from './firebase-applet-config.json' with { type: 'json' };

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Ensure upload directories exist
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Serve uploaded media statically
app.use('/uploads', express.static(UPLOADS_DIR));

// Configure multer for disk storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const safeName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}${ext}`;
    cb(null, safeName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit for high-res photos & reels
  },
});

const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Authoritative Super Admin configuration strictly on server-side
const CONFIGURED_SUPER_ADMIN_EMAIL = (
  process.env.SUPER_ADMIN_EMAIL || 'primeonebrokerageinc@gmail.com'
).trim().toLowerCase();

console.log(`[Security] Authoritative Super Admin configured for: ${CONFIGURED_SUPER_ADMIN_EMAIL}`);

// ----------------------------------------------------
// SERVER-SIDE SUPER ADMIN SECURITY UTILITY
// ----------------------------------------------------

export function isSuperAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return normalized === CONFIGURED_SUPER_ADMIN_EMAIL;
}

export interface AuthenticatedUser {
  uid: string;
  email: string;
  isSuperAdmin: boolean;
}

declare global {
  namespace Express {
    interface Request {
      authenticatedUser?: AuthenticatedUser;
    }
  }
}

// ----------------------------------------------------
// TOKEN VERIFICATION MIDDLEWARE
// ----------------------------------------------------

async function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }

  const token = authHeader.split(' ')[1];
  try {
    // Verify token with Google's public tokeninfo endpoint or IdentityToolkit
    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
    if (!response.ok) {
      // Fallback check against identitytoolkit
      const idtRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseConfig.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken: token }),
        }
      );
      if (!idtRes.ok) {
        return res.status(401).json({ error: 'Invalid authentication token' });
      }
      const data = await idtRes.json();
      const userObj = data.users?.[0];
      if (!userObj || !userObj.email) {
        return res.status(401).json({ error: 'Token user data could not be retrieved' });
      }

      const email = userObj.email.trim().toLowerCase();
      req.authenticatedUser = {
        uid: userObj.localId,
        email,
        isSuperAdmin: isSuperAdmin(email),
      };
      return next();
    }

    const payload = await response.json();
    const email = (payload.email || '').trim().toLowerCase();
    if (!email) {
      return res.status(401).json({ error: 'Token does not contain an email address' });
    }

    req.authenticatedUser = {
      uid: payload.sub || payload.user_id,
      email,
      isSuperAdmin: isSuperAdmin(email),
    };
    next();
  } catch (err: any) {
    console.error('[Auth Error]', err.message);
    return res.status(401).json({ error: 'Failed to verify token' });
  }
}

function requireSuperAdminMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.authenticatedUser) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (!req.authenticatedUser.isSuperAdmin) {
    console.warn(`[Security Alert] Non-super-admin user ${req.authenticatedUser.email} attempted privileged operation`);
    return res.status(403).json({ error: 'Forbidden: Super Admin authority required' });
  }
  next();
}

// ----------------------------------------------------
// FIRESTORE REST API HELPER (SERVER PRIVILEGED CALLS)
// ----------------------------------------------------

const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${databaseId}/documents`;

async function firestoreGet(path: string) {
  const res = await fetch(`${FIRESTORE_BASE_URL}/${path}`);
  if (!res.ok) return null;
  return res.json();
}

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

// 1. Authoritative Auth Verification & Super Admin Sync
app.get('/api/auth/me', authenticateToken, (req, res) => {
  const user = req.authenticatedUser!;
  res.json({
    uid: user.uid,
    email: user.email,
    isSuperAdmin: user.isSuperAdmin,
    role: user.isSuperAdmin ? 'SUPER_ADMIN' : 'ADMIN',
  });
});

// 2. Super Admin Check Verification Endpoint
app.post('/api/auth/verify-super-admin', authenticateToken, (req, res) => {
  const user = req.authenticatedUser!;
  res.json({
    isSuperAdmin: user.isSuperAdmin,
  });
});

// 3. Super Admin: Validate New Admin Role Request (Immutability Enforcement)
app.post('/api/admin/validate-role-assignment', authenticateToken, requireSuperAdminMiddleware, (req, res) => {
  const { role, targetEmail } = req.body;
  if (role === 'SUPER_ADMIN') {
    return res.status(400).json({
      error: 'Immutability violation: Only one Super Admin exists based on server configuration. Cannot create or promote other users to SUPER_ADMIN.',
    });
  }
  if (targetEmail && targetEmail.trim().toLowerCase() === CONFIGURED_SUPER_ADMIN_EMAIL) {
    return res.status(400).json({
      error: 'Immutability violation: Cannot modify or overwrite the Super Admin account.',
    });
  }
  res.json({ ok: true });
});

// 4. Super Admin: Validate Status Change (Owner cannot be deactivated)
app.post('/api/admin/validate-status-change', authenticateToken, requireSuperAdminMiddleware, (req, res) => {
  const { targetEmail, newStatus } = req.body;
  if (targetEmail && targetEmail.trim().toLowerCase() === CONFIGURED_SUPER_ADMIN_EMAIL && newStatus === 'INACTIVE') {
    return res.status(400).json({
      error: 'Immutability violation: The Super Admin account can never be deactivated.',
    });
  }
  res.json({ ok: true });
});

// ----------------------------------------------------
// MEDIA STORAGE & UPLOAD SYSTEM
// ----------------------------------------------------

// Single file upload endpoint (images & videos)
app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({
      ok: true,
      url: fileUrl,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
    });
  } catch (err: any) {
    console.error('[Upload Error]', err);
    res.status(500).json({ error: err.message || 'File upload failed' });
  }
});

// Multiple files upload endpoint
app.post('/api/upload/multiple', upload.array('files', 50), (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const results = files.map((f) => ({
      url: `/uploads/${f.filename}`,
      filename: f.filename,
      originalName: f.originalname,
      size: f.size,
      mimeType: f.mimetype,
    }));

    res.json({ ok: true, files: results });
  } catch (err: any) {
    console.error('[Batch Upload Error]', err);
    res.status(500).json({ error: err.message || 'Batch upload failed' });
  }
});

// Base64 upload endpoint (for pasted images, thumbnails, custom graphics)
app.post('/api/upload/base64', (req, res) => {
  try {
    const { data, filename, mimeType } = req.body;
    if (!data) {
      return res.status(400).json({ error: 'No base64 data provided' });
    }

    // Strip prefix if present (e.g. data:image/png;base64,...)
    const base64Data = data.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const ext = mimeType ? `.${mimeType.split('/')[1] || 'jpg'}` : (path.extname(filename || '') || '.jpg');
    const safeName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}${ext}`;
    const filePath = path.join(UPLOADS_DIR, safeName);

    fs.writeFileSync(filePath, buffer);

    res.json({
      ok: true,
      url: `/uploads/${safeName}`,
      filename: safeName,
      size: buffer.length,
      mimeType: mimeType || 'image/jpeg',
    });
  } catch (err: any) {
    console.error('[Base64 Upload Error]', err);
    res.status(500).json({ error: err.message || 'Base64 upload failed' });
  }
});

// Delete uploaded file
app.delete('/api/upload/:filename', (req, res) => {
  try {
    const filename = path.basename(req.params.filename);
    const filePath = path.join(UPLOADS_DIR, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    res.json({ ok: true, deleted: filename });
  } catch (err: any) {
    console.warn('[Delete Upload Warning]', err.message);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// 5. Public Discoverable Albums Endpoint (Guarantees ONLY PUBLISHED + PUBLIC)
app.get('/api/public/albums', async (req, res) => {
  try {
    const { search, eventType } = req.query;
    // Query published public albums using Firestore REST API
    const runQueryUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents:runQuery`;
    const queryPayload = {
      structuredQuery: {
        from: [{ collectionId: 'albums' }],
        where: {
          compositeFilter: {
            op: 'AND',
            filters: [
              {
                fieldFilter: {
                  field: { fieldPath: 'status' },
                  op: 'EQUAL',
                  value: { stringValue: 'PUBLISHED' },
                },
              },
              {
                fieldFilter: {
                  field: { fieldPath: 'visibility' },
                  op: 'EQUAL',
                  value: { stringValue: 'PUBLIC' },
                },
              },
            ],
          },
        },
      },
    };

    const fsRes = await fetch(runQueryUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(queryPayload),
    });

    let items: any[] = [];
    if (fsRes.ok) {
      const data = await fsRes.json();
      items = data
        .filter((d: any) => d.document)
        .map((d: any) => {
          const fields = d.document.fields || {};
          return {
            id: fields.id?.stringValue || d.document.name.split('/').pop(),
            title: fields.title?.stringValue || '',
            slug: fields.slug?.stringValue || '',
            eventType: fields.eventType?.stringValue || 'Wedding',
            eventDate: fields.eventDate?.stringValue || '',
            location: fields.location?.stringValue || '',
            coverImageUrl: fields.coverImageUrl?.stringValue || '',
            status: 'PUBLISHED',
            visibility: 'PUBLIC',
            featured: fields.featured?.booleanValue ?? false,
            createdAt: fields.createdAt?.stringValue || '',
          };
        });
    }

    // Apply filtering
    if (eventType && eventType !== 'all') {
      const et = String(eventType).toLowerCase();
      items = items.filter((a) => a.eventType.toLowerCase().includes(et));
    }

    if (search) {
      const q = String(search).toLowerCase();
      items = items.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.location.toLowerCase().includes(q) ||
          a.eventType.toLowerCase().includes(q) ||
          a.slug.toLowerCase().includes(q)
      );
    }

    res.json(items);
  } catch (err: any) {
    console.error('[Public Albums Error]', err.message);
    res.status(500).json({ error: 'Failed to retrieve public collections' });
  }
});

// ----------------------------------------------------
// VITE DEV SERVER / STATIC PRODUCTION MOUNT
// ----------------------------------------------------

async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Beki's Studio Server] Running on http://localhost:${PORT}`);
  });
}

startServer();
