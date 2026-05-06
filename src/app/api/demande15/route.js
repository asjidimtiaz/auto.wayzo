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

    const school_name = override.school_name !== undefined ? override.school_name : settings.school_name || '';
    const address     = override.address     !== undefined ? override.address     : settings.address     || '';
    const phone       = override.phone       !== undefined ? override.phone       : settings.phone       || '';
    const city        = override.city        !== undefined ? override.city        : settings.city        || '';

    // Split full_name into nom (last) and prenom (first)
    const nom    = override.nom    !== undefined ? override.nom    : (student.full_name ? student.full_name.split(' ').slice(-1).join(' ')    : '');
    const prenom = override.prenom !== undefined ? override.prenom : (student.full_name ? student.full_name.split(' ').slice(0, -1).join(' ') : '');
    const cin    = override.cin    !== undefined ? override.cin    : student.cin || '';

    const exam_date      = override.exam_date      || '';
    const requested_date = override.requested_date || '';

    // Create PDF from scratch
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);

    const fontPath   = path.join(process.cwd(), 'public', 'fonts', 'arial.ttf');
    const fontBdPath = path.join(process.cwd(), 'public', 'fonts', 'arialbd.ttf');
    const fontBytes   = fs.readFileSync(fontPath);
    const fontBdBytes = fs.readFileSync(fontBdPath);
    const font   = await pdfDoc.embedFont(fontBytes);
    const fontBd = await pdfDoc.embedFont(fontBdBytes);

    const page = pdfDoc.addPage([595.32, 841.92]);
    const now  = new Date();
    const contract_date = override.contract_date || now.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const qrRef = student.qr_code || `STU-${studentId}`;

    // Colors
    const black   = rgb(0, 0, 0);
    const darkFg  = rgb(0.15, 0.15, 0.15);
    const medGray = rgb(0.4, 0.4, 0.4);
    const lineGray = rgb(0.7, 0.7, 0.7);

    let y = 786.92;

    // School name header
    const schoolText = school_name || 'Auto-Ecole';
    const schoolW = fontBd.widthOfTextAtSize(schoolText, 14);
    page.drawText(schoolText, { x: (595.32 - schoolW) / 2, y, size: 14, font: fontBd, color: black });
    y -= 16;

    // Address / phone sub-header
    if (address || phone) {
      const subText = [address, phone].filter(Boolean).join('  -  ');
      const subW = font.widthOfTextAtSize(subText, 8);
      page.drawText(subText, { x: (595.32 - subW) / 2, y, size: 8, font, color: medGray });
      y -= 12;
    }

    // Header separator
    page.drawLine({ start: { x: 60, y }, end: { x: 535, y }, thickness: 1.2, color: black });
    y -= 30;

    // Date (right-aligned)
    const dateStr = `${city || '..............'} Le ${contract_date}`;
    const dateW = font.widthOfTextAtSize(dateStr, 11);
    page.drawText(dateStr, { x: 535 - dateW, y, size: 11, font, color: black });
    y -= 40;

    // Helper: label + value
    const drawLabelValue = (label, value, xLabel, yPos) => {
      page.drawText(label, { x: xLabel, y: yPos, size: 11, font: fontBd, color: darkFg });
      const lw = fontBd.widthOfTextAtSize(label, 11);
      page.drawText(String(value || ''), { x: xLabel + lw + 8, y: yPos, size: 11, font, color: black });
    };

    // Candidate fields
    drawLabelValue('Nom :', nom, 60, y);       y -= 22;
    drawLabelValue('Prenom :', prenom, 60, y); y -= 22;
    drawLabelValue('CINE N° :', cin, 60, y);   y -= 40;

    // Recipient address (centered right)
    for (const line of [
      'A L\'intention de Monsieur',
      'le Directeur Regional',
      'de L\'Equipement et des Transports',
    ]) {
      const lw = font.widthOfTextAtSize(line, 12);
      page.drawText(line, { x: (595.32 - lw) / 2 + 60, y, size: 12, font, color: black });
      y -= 20;
    }
    y -= 25;

    // Object line
    const objetLabel = 'Objet :';
    page.drawText(objetLabel, { x: 90, y, size: 12, font: fontBd, color: black });
    const objetLabelW = fontBd.widthOfTextAtSize(objetLabel, 12);
    page.drawLine({ start: { x: 90, y: y - 2 }, end: { x: 90 + objetLabelW, y: y - 2 }, thickness: 0.8, color: black });
    page.drawText(" Demande d'avancement pour 15 jours", { x: 90 + objetLabelW, y, size: 12, font, color: black });
    y -= 40;

    // Body text 1
    page.drawText(
      "Je vous prie de bien vouloir proceder a l'avancement des dates d'examen du",
      { x: 90, y, size: 11, font, color: black }
    );
    y -= 18;

    const bodyLine2 = "permis de conduire. Pour le 2 eme dossier L'examen et prevue le  ";
    page.drawText(bodyLine2, { x: 60, y, size: 11, font, color: black });
    const bl2W = font.widthOfTextAtSize(bodyLine2, 11);
    page.drawText(exam_date || '...... / ...... / ..........', { x: 60 + bl2W, y, size: 11, font: fontBd, color: black });
    y -= 25;

    // Body text 2
    page.drawText(
      "Je vous prie d'avancer la date d'examen du permis de conduire a la date du",
      { x: 90, y, size: 11, font, color: black }
    );
    y -= 20;
    page.drawText(requested_date || '...... / ...... / ..........', { x: 60, y, size: 11, font: fontBd, color: black });
    y -= 50;

    // Closing formula (centered)
    const closing = "Je vous prie d'agreer, Monsieur, l'expression de mes respectueuses salutations.";
    const closingW = font.widthOfTextAtSize(closing, 11);
    page.drawText(closing, { x: (595.32 - closingW) / 2, y, size: 11, font, color: black });
    y -= 70;

    // Signature
    page.drawText('Signature :', { x: 337.66, y, size: 12, font: fontBd, color: black });
    y -= 50;
    page.drawLine({ start: { x: 317.66, y }, end: { x: 477.66, y }, thickness: 0.5, color: lineGray });

    // Footer separator
    page.drawLine({ start: { x: 60, y: 45 }, end: { x: 535, y: 45 }, thickness: 0.4, color: lineGray });

    // Footer text
    const footerParts = [school_name, address, phone ? 'Tel: ' + phone : ''].filter(Boolean);
    if (footerParts.length > 0) {
      const footerText = footerParts.join('  -  ');
      const footerW = font.widthOfTextAtSize(footerText, 7);
      page.drawText(footerText, { x: (595.32 - footerW) / 2, y: 35, size: 7, font, color: medGray });
    }

    // Save and flatten
    const firstPass = await pdfDoc.save();
    const finalDoc  = await PDFDocument.create();
    const intermediate = await PDFDocument.load(firstPass);
    const [flatPage] = await finalDoc.embedPdf(intermediate, [0]);
    finalDoc.addPage([595.32, 841.92]).drawPage(flatPage, { x: 0, y: 0, width: 595.32, height: 841.92 });

    const finalBytes  = await finalDoc.save();
    const buffer      = Buffer.from(finalBytes);
    const fileName    = `demande15-${qrRef}-${Date.now()}.pdf`;
    const filePath    = await uploadToStorage(buffer, 'demandes', fileName, 'application/pdf');
    const fileContent = `data:application/pdf;base64,${buffer.toString('base64')}`;

    const doc = await db.createDocument(tenant.autoEcoleId, {
      student_id:  studentId,
      type:        'Demande 15j',
      name:        `Demande 15j - ${student.full_name}`,
      file_path:   filePath,
      file_type:   'pdf',
      file_size:   finalBytes.length,
      description: `Demande d'avancement 15 jours generee automatiquement le ${contract_date}`,
      file_content: fileContent,
    });

    return NextResponse.json({ success: true, path: filePath, documentId: doc.id });
  } catch (error) {
    console.error('Error generating demande 15j:', error);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}
