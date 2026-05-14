import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import * as db from '@/lib/db';
import { requireTenant } from '@/lib/tenant';
import { UPLOAD_DIR } from '@/lib/storage';

export const dynamic = 'force-dynamic';

const EXT_TO_MIME = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.svg': 'image/svg+xml',
};

export async function GET(req) {
  try {
    const user = await requireTenant(req);
    if (!user) {
      return new NextResponse('Non autorisé', { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    let filePath = searchParams.get('path');
    
    if (req.method === 'POST') {
      try {
        const body = await req.json();
        if (body?.path) filePath = body.path;
      } catch (e) {}
    }

    if (!filePath) {
      return new NextResponse('Chemin manquant', { status: 400 });
    }

    const normalPath = filePath.replace(/\\/g, '/');
    const ext = path.extname(normalPath).toLowerCase();
    const mime = EXT_TO_MIME[ext] || 'application/octet-stream';
    const fileName = path.basename(normalPath);

    const isJsonRequested = req.method === 'POST';

    // 1. Try reading from disk (uploads directory)
    if (normalPath.startsWith('/uploads/')) {
      const diskPath = path.join(UPLOAD_DIR, normalPath.slice(9));
      try {
        if (fs.existsSync(diskPath)) {
          const buf = fs.readFileSync(diskPath);
          
          if (isJsonRequested) {
            return NextResponse.json({
              data: buf.toString('base64'),
              mime,
              fileName
            });
          }

          return new Response(new Uint8Array(buf), {
            status: 200,
            headers: {
              'Content-Type': mime,
              'Content-Disposition': `inline; filename="${fileName}"`,
              'Content-Length': String(buf.length),
              'Cache-Control': 'private, max-age=3600',
            },
          });
        }
      } catch (e) {
        console.error('[files/view GET] disk read error:', e);
      }
    }

    // 2. Try reading from DB (base64 stored content)
    try {
      for (const p of [normalPath, normalPath.replace(/\//g, '\\')]) {
        let doc = user.autoEcoleId
          ? await db.getDocumentByPath(p, user.autoEcoleId)
          : null;
        if (!doc) doc = await db.getDocumentByPath(p, null);

        if (doc?.file_content) {
          // Strip data URL prefix if present: "data:application/pdf;base64,..."
          const base64 = doc.file_content.includes(',')
            ? doc.file_content.split(',')[1]
            : doc.file_content;
          const buf = Buffer.from(base64, 'base64');
          const docMime = doc.file_type
            ? EXT_TO_MIME[`.${doc.file_type}`] || mime
            : mime;
          
          if (isJsonRequested) {
            return NextResponse.json({
              data: base64,
              mime: docMime,
              fileName: doc.name || fileName
            });
          }

          return new Response(new Uint8Array(buf), {
            status: 200,
            headers: {
              'Content-Type': docMime,
              'Content-Disposition': `inline; filename="${doc.name || fileName}"`,
              'Content-Length': String(buf.length),
              'Cache-Control': 'private, max-age=3600',
            },
          });
        }
      }
    } catch (dbErr) {
      console.error('[files/view GET] DB error:', dbErr);
    }

    return new NextResponse('Fichier introuvable', { status: 404 });
  } catch (err) {
    console.error('[files/view GET]', err);
    return new NextResponse('Erreur serveur', { status: 500 });
  }
}
export async function POST(req) {
  return GET(req);
}
