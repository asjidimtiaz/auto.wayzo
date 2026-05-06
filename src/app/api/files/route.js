import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import * as db from '@/lib/db';
import { requireAuth } from '@/lib/tenant';
import { uploadToStorage, deleteFromStorage, UPLOAD_DIR } from '@/lib/storage';

export const dynamic = 'force-dynamic';

const ALLOWED_SUBFOLDERS = new Set(['documents', 'profiles', 'contracts', 'photos', 'logos']);
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'application/pdf'];
const EXT_TO_MIME = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.gif': 'image/gif', '.webp': 'image/webp', '.pdf': 'application/pdf',
  '.svg': 'image/svg+xml',
};

function sanitizeFilename(originalName) {
  const ext = path.extname(originalName).toLowerCase().replace(/[^.a-z0-9]/g, '');
  return `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
}

function toBase64DataUrl(name, buf) {
  const mime = EXT_TO_MIME[path.extname(name).toLowerCase()] || 'application/octet-stream';
  return `data:${mime};base64,${buf.toString('base64')}`;
}

export async function POST(req) {
  try {
    const user = requireAuth(req);
    if (!user) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get('file');
    const subfolder = (formData.get('subfolder') || 'documents').replace(/[^a-zA-Z0-9_-]/g, '');
    const folder = ALLOWED_SUBFOLDERS.has(subfolder) ? subfolder : 'documents';

    if (!file) return NextResponse.json({ success: false, error: 'Aucun fichier reçu' }, { status: 400 });
    if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ success: false, error: 'Type de fichier non autorisé' }, { status: 400 });
    if (file.size > 5 * 1024 * 1024) return NextResponse.json({ success: false, error: 'Fichier trop volumineux (max 5 Mo)' }, { status: 400 });

    const filename = sanitizeFilename(file.name);
    const buf = Buffer.from(await file.arrayBuffer());
    const filePath = await uploadToStorage(buf, folder, filename, file.type);
    const base64 = toBase64DataUrl(file.name, buf);

    try {
      await db.createDocument(user.autoEcoleId || null, {
        student_id: null,
        type: file.type.startsWith('image/') ? 'Image' : 'PDF',
        name: file.name,
        file_path: filePath,
        file_type: path.extname(file.name).toLowerCase().replace('.', ''),
        file_size: file.size,
        file_content: base64,
      });
    } catch (dbErr) {
      console.error('[files POST] DB persist error:', dbErr);
    }

    return NextResponse.json({ success: true, filePath, fileName: filename, base64 });
  } catch (err) {
    console.error('[files POST]', err);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function GET(req) {
  try {
    const user = requireAuth(req);
    if (!user) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const filePath = searchParams.get('path');
    if (!filePath) return NextResponse.json({ success: false, error: 'Chemin manquant' }, { status: 400 });

    const normalPath = filePath.replace(/\\/g, '/');

    // Try disk first
    if (normalPath.startsWith('/uploads/')) {
      const diskPath = path.join(UPLOAD_DIR, normalPath.slice(9));
      try {
        if (fs.existsSync(diskPath)) {
          const buf = fs.readFileSync(diskPath);
          const mime = EXT_TO_MIME[path.extname(diskPath).toLowerCase()] || 'application/octet-stream';
          return NextResponse.json({ data: `data:${mime};base64,${buf.toString('base64')}` });
        }
      } catch (e) { console.error('[files GET] disk read error:', e); }
    }

    // Try DB
    try {
      for (const p of [normalPath, normalPath.replace(/\//g, '\\')]) {
        let doc = user.autoEcoleId ? await db.getDocumentByPath(p, user.autoEcoleId) : null;
        if (!doc) doc = await db.getDocumentByPath(p, null);
        if (doc?.file_content) return NextResponse.json({ data: doc.file_content });
      }
    } catch (dbErr) { console.error('[files GET] DB error:', dbErr); }

    return NextResponse.json({ success: false, error: 'Fichier introuvable' }, { status: 404 });
  } catch (err) {
    console.error('[files GET]', err);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    if (!requireAuth(req)) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const filePath = searchParams.get('path');
    if (!filePath) return NextResponse.json({ success: false, error: 'Chemin manquant' }, { status: 400 });
    try { await deleteFromStorage(filePath); } catch (e) { console.error('[files DELETE] storage error:', e); }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[files DELETE]', err);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}
