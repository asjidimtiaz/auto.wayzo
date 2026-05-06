import { NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import fs from 'fs';
import path from 'path';
import db from '@/lib/db';
import { requireTenant } from '@/lib/tenant';
import { uploadToStorage } from '@/lib/storage';

export const dynamic = 'force-dynamic';

// Draw right-aligned text
function drawTextRight(page, text, x, y, size, font) {
  if (!text) return;
  const width = font.widthOfTextAtSize(String(text), size);
  page.drawText(String(text), { x: x - width, y, size, font });
}

// Draw center-aligned text
function drawTextCenter(page, text, centerX, y, size, font) {
  if (!text) return;
  const width = font.widthOfTextAtSize(String(text), size);
  page.drawText(String(text), { x: centerX - width / 2, y, size, font });
}

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

    // Merge override with defaults from settings/student
    const school_name     = override.school_name     !== undefined ? override.school_name     : settings.school_name     || '';
    const address         = override.address         !== undefined ? override.address         : settings.address         || '';
    const phone           = override.phone           !== undefined ? override.phone           : settings.phone           || '';
    const email           = override.email           !== undefined ? override.email           : settings.email           || '';
    const fax             = override.fax             !== undefined ? override.fax             : settings.fax             || '';
    const web_reference   = override.web_reference   !== undefined ? override.web_reference   : student.web_reference    || '';
    const tax_register    = override.tax_register    !== undefined ? override.tax_register    : settings.tax_register    || '';
    const commercial_reg  = override.commercial_register !== undefined ? override.commercial_register : settings.commercial_register || '';
    const full_name       = override.full_name       !== undefined ? override.full_name       : student.full_name        || '';
    const cin             = override.cin             !== undefined ? override.cin             : student.cin              || '';
    const birth_place     = override.birth_place     !== undefined ? override.birth_place     : student.birth_place      || '';
    const birth_date      = override.birth_date      !== undefined ? override.birth_date      : student.birth_date       || '';
    const student_address = override.student_address !== undefined ? override.student_address : student.address          || '';
    const license_type    = override.license_type    !== undefined ? override.license_type    : student.license_type     || 'B';
    const contract_number = override.contract_number || '1';
    const city            = override.city            !== undefined ? override.city            : settings.city || (address ? address.split(',').pop().trim() : '');

    // Load contract template PDF
    const templatePath = path.join(process.cwd(), 'public', 'CONTRAT -VIDE 1F.pdf');
    if (!fs.existsSync(templatePath)) {
      throw new Error('Modèle de contrat introuvable: ' + templatePath);
    }
    const templateBytes = fs.readFileSync(templatePath);

    // Load fonts
    const fontPath   = path.join(process.cwd(), 'public', 'fonts', 'arial.ttf');
    const fontBdPath = path.join(process.cwd(), 'public', 'fonts', 'arialbd.ttf');
    const fontBytes   = fs.readFileSync(fontPath);
    const fontBdBytes = fs.readFileSync(fontBdPath);

    // Create output PDF with template embedded
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);

    const templatePdf = await PDFDocument.load(templateBytes);
    const [templatePage] = await pdfDoc.embedPdf(templatePdf, [0]);
    const page = pdfDoc.addPage([595.32, 841.92]);
    page.drawPage(templatePage, { x: 0, y: 0, width: 595.32, height: 841.92 });

    const font   = await pdfDoc.embedFont(fontBytes);
    const fontBd = await pdfDoc.embedFont(fontBdBytes);

    // Dates
    const now = new Date();
    const contract_date     = override.contract_date     || now.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const registration_date = override.registration_date || (student.registration_date
      ? new Date(student.registration_date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : contract_date);

    // Draw fields on contract template
    drawTextCenter(page, license_type, 256, 801, fontBd, 11);
    page.drawText(contract_number, { x: 520, y: 787, size: 9, font });
    page.drawText(registration_date, { x: 390, y: 787, size: 9, font });

    drawTextRight(page, school_name, 465, 750, font, 9);
    page.drawText(web_reference, { x: 230, y: 623, size: 9, font });
    drawTextRight(page, address, 505, 728, font, 9);
    drawTextRight(page, tax_register, 420, 717, font, 9);
    drawTextRight(page, commercial_reg, 400, 705, font, 9);
    drawTextRight(page, city || '', 180, 705, font, 9);
    drawTextRight(page, phone, 505, 693, font, 9);
    drawTextRight(page, fax, 185, 693, font, 9);
    drawTextRight(page, email, 465, 681, font, 9);
    drawTextRight(page, full_name, 500, 658, font, 10);
    drawTextRight(page, cin, 488, 647, font, 9);
    drawTextRight(page, birth_place, 308, 647, font, 9);
    page.drawText(String(birth_date), { x: 90, y: 647, size: 9, font });
    drawTextRight(page, student_address, 488, 635, font, 9);
    drawTextCenter(page, license_type, 510, 543, fontBd, 10);
    drawTextCenter(page, city || '', 398, 157, font, 9);
    drawTextCenter(page, registration_date, 202, 157, font, 9);

    // Save and re-embed (flatten)
    const firstPass = await pdfDoc.save();
    const finalDoc  = await PDFDocument.create();
    const intermediate = await PDFDocument.load(firstPass);
    const [flatPage] = await finalDoc.embedPdf(intermediate, [0]);
    finalDoc.addPage([595.32, 841.92]).drawPage(flatPage, { x: 0, y: 0, width: 595.32, height: 841.92 });

    const finalBytes = await finalDoc.save();
    const buffer     = Buffer.from(finalBytes);
    const fileName   = `contrat-${student.qr_code}-${Date.now()}.pdf`;
    const filePath   = await uploadToStorage(buffer, 'contracts', fileName, 'application/pdf');
    const fileContent = `data:application/pdf;base64,${buffer.toString('base64')}`;

    const doc = await db.createDocument(tenant.autoEcoleId, {
      student_id:  studentId,
      type:        'Contrat',
      name:        `Contrat - ${student.full_name}`,
      file_path:   filePath,
      file_type:   'pdf',
      file_size:   finalBytes.length,
      description: `Contrat de formation généré automatiquement le ${contract_date}`,
      file_content: fileContent,
    });

    return NextResponse.json({ success: true, path: filePath, documentId: doc.id });
  } catch (error) {
    console.error('Error generating contract:', error);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}
