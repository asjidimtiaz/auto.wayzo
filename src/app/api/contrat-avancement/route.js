import { NextResponse } from 'next/server';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import fs from 'fs';
import path from 'path';
import db from '@/lib/db';
import { requireTenant } from '@/lib/tenant';
import { uploadToStorage } from '@/lib/storage';

export const dynamic = 'force-dynamic';

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

    const school_name     = override.school_name      !== undefined ? override.school_name      : settings.school_name   || '';
    const address          = override.address          !== undefined ? override.address          : settings.address        || '';
    const phone            = override.phone            !== undefined ? override.phone            : settings.phone          || '';
    const city             = override.city             !== undefined ? override.city             : settings.city           || '';
    const full_name        = override.full_name        !== undefined ? override.full_name        : student.full_name       || '';
    const cin              = override.cin              !== undefined ? override.cin              : student.cin             || '';

    const motif            = override.motif            || '';

    // Load template
    const templatePath = path.join(process.cwd(), 'public', 'demande avancementv15 jours.pdf');
    if (!fs.existsSync(templatePath)) {
      throw new Error('Modèle introuvable: ' + templatePath);
    }
    const templateBytes = fs.readFileSync(templatePath);

    // Load fonts
    const fontPath   = path.join(process.cwd(), 'public', 'fonts', 'arial.ttf');
    const fontBdPath = path.join(process.cwd(), 'public', 'fonts', 'arialbd.ttf');
    const fontBytes   = fs.readFileSync(fontPath);
    const fontBdBytes = fs.readFileSync(fontBdPath);

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

    // Draw Dynamic Fields
    page.drawText(school_name, { x: 60, y: 780, size: 14, font: fontBd });
    page.drawText(address + ' ' + phone, { x: 60, y: 765, size: 8, font });
    page.drawText(dateStr, { x: 400, y: 720, size: 10, font });
    page.drawText(full_name, { x: 120, y: 650, size: 11, font });
    page.drawText(cin, { x: 120, y: 630, size: 11, font });
    
    if (motif) {
      page.drawText('Motif: ' + motif, { x: 60, y: 400, size: 9, font });
    }

    // Save and flatten
    const finalBytes   = await pdfDoc.save();
    const buffer       = Buffer.from(finalBytes);
    const fileName     = `contrat-avancement-${student.qr_code}-${Date.now()}.pdf`;
    const filePath     = await uploadToStorage(buffer, 'contracts', fileName, 'application/pdf');
    const fileContent  = `data:application/pdf;base64,${buffer.toString('base64')}`;

    const doc = await db.createDocument(tenant.autoEcoleId, {
      student_id:  studentId,
      type:        "Contrat d'Avancement",
      name:        `Contrat d'Avancement - ${student.full_name}`,
      file_path:   filePath,
      file_type:   'pdf',
      file_size:   finalBytes.length,
      description: `Contrat d'avancement généré le ${now.toLocaleDateString('fr-FR')}`,
      file_content: fileContent,
    });

    return NextResponse.json({ success: true, path: filePath, documentId: doc.id });
  } catch (error) {
    console.error("Error generating contrat d'avancement:", error);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}
