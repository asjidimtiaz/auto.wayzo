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

    const school_name      = override.school_name      !== undefined ? override.school_name      : settings.school_name   || '';
    const address          = override.address          !== undefined ? override.address          : settings.address        || '';
    const phone            = override.phone            !== undefined ? override.phone            : settings.phone          || '';
    const city             = override.city             !== undefined ? override.city             : settings.city           || '';
    const full_name        = override.full_name        !== undefined ? override.full_name        : student.full_name       || '';
    const cin              = override.cin              !== undefined ? override.cin              : student.cin             || '';
    const birth_date       = override.birth_date       !== undefined ? override.birth_date       : student.birth_date      || '';
    const birth_place      = override.birth_place      !== undefined ? override.birth_place      : student.birth_place     || '';
    const student_address  = override.student_address  !== undefined ? override.student_address  : student.address         || '';
    const license_type     = override.license_type     !== undefined ? override.license_type     : student.license_type    || 'B';
    const web_reference    = override.web_reference    !== undefined ? override.web_reference    : student.web_reference   || '';
    const exam_code_date      = override.exam_code_date      || '';
    const exam_conduit_date   = override.exam_conduit_date   || '';
    const requested_code_date    = override.requested_code_date    || '';
    const requested_conduit_date = override.requested_conduit_date || '';
    const motif            = override.motif            || '';

    // Build PDF from scratch
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

    // Colors
    const black     = rgb(0, 0, 0);
    const darkGray  = rgb(0.2, 0.2, 0.2);
    const medGray   = rgb(0.4, 0.4, 0.4);
    const lineColor = rgb(0.3, 0.3, 0.3);
    const bgColor   = rgb(0.95, 0.95, 0.97);

    let y = 791.92;

    // Header: school name centered
    const schoolText = school_name || 'Auto-École';
    const schoolW = fontBd.widthOfTextAtSize(schoolText, 16);
    page.drawText(schoolText, { x: (595.32 - schoolW) / 2, y, size: 16, font: fontBd, color: black });
    y -= 18;

    // Sub-header: address & phone
    const subText = [address, phone].filter(Boolean).join(' - ');
    if (subText) {
      const subW = font.widthOfTextAtSize(subText, 9);
      page.drawText(subText, { x: (595.32 - subW) / 2, y, size: 9, font, color: medGray });
      y -= 14;
    }
    y -= 4;

    // Separator line
    page.drawLine({ start: { x: 50, y }, end: { x: 545, y }, thickness: 1.5, color: lineColor });
    y -= 25;

    // Date right-aligned
    const dateStr = `${city || '...........'} Le ${contract_date}`;
    const dateW = font.widthOfTextAtSize(dateStr, 11);
    page.drawText(dateStr, { x: 545 - dateW, y, size: 11, font, color: black });
    y -= 35;

    // Title centered
    const title  = "CONTRAT D'AVANCEMENT";
    const titleW = fontBd.widthOfTextAtSize(title, 15);
    const titleX = (595.32 - titleW) / 2;
    page.drawText(title, { x: titleX, y, size: 15, font: fontBd, color: black });
    page.drawLine({ start: { x: titleX - 5, y: y - 3 }, end: { x: titleX + titleW + 5, y: y - 3 }, thickness: 1, color: black });
    y -= 18;

    // License subtitle
    const licenseSubtitle = `Permis de conduire - Catégorie : ${license_type}`;
    const licenseW = font.widthOfTextAtSize(licenseSubtitle, 10);
    page.drawText(licenseSubtitle, { x: (595.32 - licenseW) / 2, y, size: 10, font, color: darkGray });
    y -= 30;

    // Section header helper
    const drawSectionHeader = (label) => {
      page.drawRectangle({ x: 50, y: y - 3, width: 495, height: 18, color: bgColor });
      page.drawText(label, { x: 60, y: y + 1, size: 10, font: fontBd, color: black });
      y -= 25;
    };

    // Labeled field helper
    const drawLabelValue = (label, value, xLabel, yPos) => {
      page.drawText(label, { x: xLabel, y: yPos, size: 9, font: fontBd, color: darkGray });
      const labelW = fontBd.widthOfTextAtSize(label, 9);
      page.drawText(String(value || ''), { x: xLabel + labelW + 5, y: yPos, size: 10, font, color: black });
    };

    // --- Candidate info section ---
    drawSectionHeader('INFORMATIONS DU CANDIDAT');
    drawLabelValue('Nom et Prénom :', full_name, 60, y);
    y -= 18;
    drawLabelValue('CIN N° :', cin, 60, y);
    drawLabelValue('Né(e) le :', birth_date, 300, y);
    y -= 18;
    drawLabelValue('Lieu de naissance :', birth_place, 60, y);
    y -= 18;
    drawLabelValue('Adresse :', student_address, 60, y);
    y -= 18;
    if (web_reference) {
      drawLabelValue('Réf. Web :', web_reference, 60, y);
      y -= 18;
    }
    y -= 5;
    page.drawLine({ start: { x: 60, y }, end: { x: 535, y }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) });
    y -= 20;

    // --- Request section ---
    drawSectionHeader("OBJET DE LA DEMANDE D'AVANCEMENT");

    const introLines = [
      `Je soussigné(e) ${full_name}, titulaire de la CIN N° ${cin},`,
      `demande par la présente l'avancement de la date de passage de l'examen`,
      `du permis de conduire catégorie ${license_type}.`,
    ];
    for (const line of introLines) {
      page.drawText(line, { x: 60, y, size: 10, font, color: black });
      y -= 16;
    }
    y -= 10;

    // Code exam box
    page.drawRectangle({ x: 60, y: y - 5, width: 475, height: 42, borderColor: rgb(0.75, 0.75, 0.75), borderWidth: 0.5, color: rgb(1, 1, 1) });
    page.drawText('Examen de Code :', { x: 70, y: y + 18, size: 10, font: fontBd, color: darkGray });
    drawLabelValue('Date prévue :', exam_code_date || '....../....../......', 80, y + 2);
    drawLabelValue('Date demandée :', requested_code_date || '....../....../......', 300, y + 2);
    y -= 55;

    // Conduit exam box
    page.drawRectangle({ x: 60, y: y - 5, width: 475, height: 42, borderColor: rgb(0.75, 0.75, 0.75), borderWidth: 0.5, color: rgb(1, 1, 1) });
    page.drawText('Examen de Conduite :', { x: 70, y: y + 18, size: 10, font: fontBd, color: darkGray });
    drawLabelValue('Date prévue :', exam_conduit_date || '....../....../......', 80, y + 2);
    drawLabelValue('Date demandée :', requested_conduit_date || '....../....../......', 300, y + 2);
    y -= 55;

    // Motif
    page.drawText('Motif de la demande :', { x: 60, y, size: 10, font: fontBd, color: darkGray });
    y -= 16;
    const motifText = motif || '..........................................................................................................................';
    const words = motifText.split(' ');
    let line = '';
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, 10) > 455 && line) {
        page.drawText(line, { x: 70, y, size: 10, font, color: black });
        y -= 15;
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) {
      page.drawText(line, { x: 70, y, size: 10, font, color: black });
      y -= 15;
    }

    // Dotted lines for extra notes
    for (let i = 0; i < 2; i++) {
      y -= 5;
      for (let x = 70; x < 525; x += 6) {
        page.drawLine({ start: { x, y }, end: { x: Math.min(x + 3, 525), y }, thickness: 0.3, color: rgb(0.6, 0.6, 0.6) });
      }
      y -= 12;
    }

    // Commitment text
    y -= 15;
    page.drawLine({ start: { x: 60, y: y + 5 }, end: { x: 535, y: y + 5 }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) });
    y -= 5;
    const commitLines = [
      "Je m'engage à respecter les conditions fixées par l'auto-école et à me présenter",
      'à la nouvelle date d\'examen qui me sera communiquée.',
    ];
    for (const l of commitLines) {
      page.drawText(l, { x: 60, y, size: 9, font, color: darkGray });
      y -= 14;
    }
    y -= 30;

    // Signature labels
    page.drawText('Signature du Candidat', { x: 70, y, size: 10, font: fontBd, color: black });
    const rightLabel = "Cachet et Signature de l'Auto-École";
    const rightLabelW = fontBd.widthOfTextAtSize(rightLabel, 10);
    page.drawText(rightLabel, { x: 525 - rightLabelW, y, size: 10, font: fontBd, color: black });
    y -= 50;

    // Signature lines
    page.drawLine({ start: { x: 60, y }, end: { x: 220, y }, thickness: 0.5, color: lineColor });
    page.drawLine({ start: { x: 365, y }, end: { x: 535, y }, thickness: 0.5, color: lineColor });

    // Footer separator
    page.drawLine({ start: { x: 50, y: 50 }, end: { x: 545, y: 50 }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) });

    // Footer text
    const footerText = `${school_name} - ${address} - Tél: ${phone}`;
    const footerW = font.widthOfTextAtSize(footerText, 7);
    page.drawText(footerText, { x: (595.32 - footerW) / 2, y: 40, size: 7, font, color: medGray });

    // Save and flatten
    const firstPass = await pdfDoc.save();
    const finalDoc = await PDFDocument.create();
    const intermediate = await PDFDocument.load(firstPass);
    const [flatPage] = await finalDoc.embedPdf(intermediate, [0]);
    finalDoc.addPage([595.32, 841.92]).drawPage(flatPage, { x: 0, y: 0, width: 595.32, height: 841.92 });

    const finalBytes   = await finalDoc.save();
    const buffer       = Buffer.from(finalBytes);
    const qrRef        = student.qr_code || `STU-${studentId}`;
    const fileName     = `contrat-avancement-${qrRef}-${Date.now()}.pdf`;
    const filePath     = await uploadToStorage(buffer, 'contracts', fileName, 'application/pdf');
    const fileContent  = `data:application/pdf;base64,${buffer.toString('base64')}`;

    const doc = await db.createDocument(tenant.autoEcoleId, {
      student_id:  studentId,
      type:        "Contrat d'Avancement",
      name:        `Contrat d'Avancement - ${student.full_name}`,
      file_path:   filePath,
      file_type:   'pdf',
      file_size:   finalBytes.length,
      description: `Contrat d'avancement généré automatiquement le ${contract_date}`,
      file_content: fileContent,
    });

    return NextResponse.json({ success: true, path: filePath, documentId: doc.id });
  } catch (error) {
    console.error("Error generating contrat d'avancement:", error);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}
