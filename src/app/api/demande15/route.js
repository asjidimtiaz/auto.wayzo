import { NextResponse } from 'next/server';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import fs from 'fs';
import path from 'path';
import * as db from '@/lib/db';
import { requireTenant } from '@/lib/tenant';
import { uploadToStorage } from '@/lib/storage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const tenant = await requireTenant(request);
    if (!tenant) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { studentId, overrideData } = await request.json();
    const student = await db.getStudentById(Number(studentId), tenant.autoEcoleId);
    if (!student) throw new Error('Étudiant non trouvé');

    const settings = (await db.getSettings(tenant.autoEcoleId)) || {};
    const override = overrideData || {};

    const school_name = override.school_name !== undefined ? override.school_name : settings.school_name || '';
    const address     = override.address     !== undefined ? override.address     : settings.address     || '';
    const phone       = override.phone       !== undefined ? override.phone       : settings.phone       || '';
    const city        = override.city        !== undefined ? override.city        : settings.city        || '';
    const full_name   = override.full_name   !== undefined ? override.full_name   : student.full_name    || '';
    const cin         = override.cin         !== undefined ? override.cin         : student.cin          || '';

    const exam_date      = override.exam_date      || '';
    const requested_date = override.requested_date || '';

    const baseUrl = null;

    // Load template via HTTP
    const templateRes = { ok: true };
    if (!templateRes.ok) throw new Error('Modèle introuvable');
    const templateBytes = fs.readFileSync(path.join(process.cwd(), 'public', 'demande avancementv15 jours.pdf'));

    // Load fonts via HTTP
    const fontRes = { ok: true };
    const fontBdRes = { ok: true };
    if (!fontRes.ok || !fontBdRes.ok) throw new Error('Polices introuvables');
    const fontBytes = fs.readFileSync(path.join(process.cwd(), 'public', 'fonts', 'arial.ttf'));
    const fontBdBytes = fs.readFileSync(path.join(process.cwd(), 'public', 'fonts', 'arialbd.ttf'));

    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);

    const templatePdf = await PDFDocument.load(templateBytes);
    const [templatePage] = await pdfDoc.embedPdf(templatePdf, [0]);
    const page = pdfDoc.addPage([595.32, 841.92]);
    page.drawPage(templatePage, { x: 0, y: 0, width: 595.32, height: 841.92 });

    const font   = await pdfDoc.embedFont(fontBytes);
    const fontBd = await pdfDoc.embedFont(fontBdBytes);

    const now = new Date();
    const dateStr = `${city || '...........'} Le ${override.contract_date || now.toLocaleDateString('fr-FR')}`;

    // Draw Dynamic Fields (Approximate positions, may need adjustment)
    page.drawText(school_name, { x: 60, y: 780, size: 14, font: fontBd });
    page.drawText(address + ' ' + phone, { x: 60, y: 765, size: 8, font });
    
    page.drawText(dateStr, { x: 400, y: 720, size: 10, font });
    
    page.drawText(full_name, { x: 120, y: 650, size: 11, font });
    page.drawText(cin, { x: 120, y: 630, size: 11, font });
    
    page.drawText(exam_date, { x: 200, y: 550, size: 11, font: fontBd });
    page.drawText(requested_date, { x: 200, y: 530, size: 11, font: fontBd });

    // Save and re-embed (flatten)
    const finalBytes = await pdfDoc.save();
    const buffer     = Buffer.from(finalBytes);
    const fileName   = `demande15-${student.qr_code}-${Date.now()}.pdf`;
    const filePath   = await uploadToStorage(buffer, 'demandes', fileName, 'application/pdf');
    const fileContent = `data:application/pdf;base64,${buffer.toString('base64')}`;

    const doc = await db.createDocument(tenant.autoEcoleId, {
      student_id:  Number(studentId),
      type:        'Demande 15j',
      name:        `Demande 15j - ${student.full_name}`,
      file_path:   filePath,
      file_type:   'pdf',
      file_size:   finalBytes.length,
      description: `Demande d'avancement 15 jours générée le ${now.toLocaleDateString('fr-FR')}`,
      file_content: fileContent,
    });

    return NextResponse.json({ success: true, path: filePath, documentId: doc.id, document: doc });
  } catch (error) {
    console.error('Error generating demande 15j:', error);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}
