import { NextResponse } from 'next/server';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import fs from 'fs';
import path from 'path';
import * as db from '@/lib/db';
import { requireTenant } from '@/lib/tenant';
import { uploadToStorage } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const ctx = await requireTenant(req);
    if (!ctx) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID manquant' }, { status: 400 });

    const invoice = await db.getInvoiceById(Number(id), ctx.autoEcoleId);
    if (!invoice) return NextResponse.json({ error: 'Facture non trouvée' }, { status: 404 });

    const settings = (await db.getSettings(ctx.autoEcoleId)) || {};

    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);

    const fontPath = path.join(process.cwd(), 'public', 'fonts', 'arial.ttf');
    const fontBdPath = path.join(process.cwd(), 'public', 'fonts', 'arialbd.ttf');
    const fontBytes = fs.readFileSync(fontPath);
    const fontBdBytes = fs.readFileSync(fontBdPath);
    const font = await pdfDoc.embedFont(fontBytes);
    const fontBd = await pdfDoc.embedFont(fontBdBytes);

    const page = pdfDoc.addPage([595, 842]); // A4
    const { width, height } = page.getSize();
    const black = rgb(0, 0, 0);
    const blue = rgb(0.1, 0.4, 0.9);
    const lightBlue = rgb(0.9, 0.95, 1);
    const gray = rgb(0.4, 0.4, 0.4);
    const borderGray = rgb(0.85, 0.85, 0.85);

    let y = height - 60;

    // Header - School Info (Top Left)
    page.drawText((settings.school_name || 'auto ecole al afaq marrakech').toLowerCase(), { x: 50, y, size: 18, font: fontBd, color: black });
    y -= 15;
    
    const headerSub = `${settings.address || ''} – ${settings.city || ''} – ${settings.email || ''}`.toLowerCase();
    page.drawText(headerSub, { x: 50, y, size: 8, font, color: gray });
    y -= 10;
    
    const headerDetails = `RC : ${settings.commercial_register || ''} – I.F : ${settings.tax_register || ''} · Tél./Fax : ${settings.phone || ''}`;
    page.drawText(headerDetails, { x: 50, y, size: 8, font, color: gray });

    // Header - Invoice Info (Top Right)
    page.drawText('FACTURE', { x: width - 180, y: height - 60, size: 8, font: fontBd, color: blue });
    const invNum = invoice.invoice_number;
    const invNumWidth = fontBd.widthOfTextAtSize(invNum, 22);
    page.drawText(invNum, { x: width - 50 - invNumWidth, y: height - 85, size: 22, font: fontBd, color: black });
    
    const dateText = `Date : ${new Date(invoice.issue_date).toLocaleDateString('fr-FR')}`;
    const dateWidth = fontBd.widthOfTextAtSize(dateText, 9);
    page.drawText(dateText, { x: width - 50 - dateWidth, y: height - 100, size: 9, font: fontBd, color: black });
    
    if (invoice.status === 'Payée') {
      const statusText = 'Payée';
      const statusWidth = fontBd.widthOfTextAtSize(statusText, 9);
      page.drawText(statusText, { x: width - 50 - statusWidth, y: height - 115, size: 9, font: fontBd, color: rgb(0, 0.5, 0) });
    }

    // Horizontal Blue Line
    page.drawLine({ start: { x: 50, y: height - 135 }, end: { x: width - 50, y: height - 135 }, thickness: 2.5, color: blue });

    y = height - 165;

    // Boxes setup
    const boxWidth = 240;
    const boxHeight = 90;
    
    // Left Box: FACTURÉ À
    page.drawRectangle({ x: 50, y: y - boxHeight, width: boxWidth, height: boxHeight, borderColor: borderGray, borderWidth: 1, borderRadius: 8 });
    page.drawText('FACTURÉ À', { x: 65, y: y - 18, size: 8, font: fontBd, color: blue });
    page.drawLine({ start: { x: 65, y: y - 22 }, end: { x: 50 + boxWidth - 15, y: y - 22 }, thickness: 0.5, color: borderGray });
    
    page.drawText(invoice.full_name || '', { x: 65, y: y - 42, size: 13, font: fontBd, color: black });
    
    const drawBoxRow = (label, val, ypos, boxX) => {
      page.drawText(label, { x: boxX + 15, y: ypos, size: 9, font, color: gray });
      const valWidth = fontBd.widthOfTextAtSize(val, 9);
      page.drawText(val, { x: boxX + boxWidth - 15 - valWidth, y: ypos, size: 9, font: fontBd, color: black });
    };
    
    drawBoxRow('Téléphone', invoice.phone || '—', y - 60, 50);
    drawBoxRow('Permis', `Catégorie ${invoice.license_type || 'B'}`, y - 75, 50);

    // Right Box: DÉTAILS FACTURE
    page.drawRectangle({ x: 305, y: y - boxHeight, width: boxWidth, height: boxHeight, borderColor: borderGray, borderWidth: 1, borderRadius: 8 });
    page.drawText('DÉTAILS FACTURE', { x: 320, y: y - 18, size: 8, font: fontBd, color: blue });
    page.drawLine({ start: { x: 320, y: y - 22 }, end: { x: 305 + boxWidth - 15, y: y - 22 }, thickness: 0.5, color: borderGray });
    
    drawBoxRow('N° Facture', invoice.invoice_number, y - 42, 305);
    drawBoxRow('Date émission', new Date(invoice.issue_date).toLocaleDateString('fr-FR'), y - 57, 305);
    drawBoxRow('Statut', invoice.status, y - 72, 305);

    y -= 130;

    // Table Header
    page.drawText('DÉSIGNATION', { x: 60, y, size: 8, font: fontBd, color: gray });
    page.drawText('CATÉGORIE', { x: 300, y, size: 8, font: fontBd, color: gray });
    page.drawText('QTÉ', { x: 410, y, size: 8, font: fontBd, color: gray });
    page.drawText('MONTANT', { x: 480, y, size: 8, font: fontBd, color: gray });
    page.drawLine({ start: { x: 50, y: y - 5 }, end: { x: width - 50, y: y - 5 }, thickness: 0.5, color: borderGray });

    // Table Content
    y -= 25;
    page.drawText(`Formation à la conduite – Permis ${invoice.license_type || 'B'}`, { x: 60, y, size: 10, font: fontBd, color: black });
    page.drawText(`Catégorie ${invoice.license_type || 'B'}`, { x: 300, y, size: 9, font, color: gray });
    page.drawText('1', { x: 410, y, size: 10, font, color: black });
    
    const amtText = `${parseFloat(invoice.amount).toLocaleString('fr-FR')} MAD`;
    const amtWidth = fontBd.widthOfTextAtSize(amtText, 10);
    page.drawText(amtText, { x: width - 50 - amtWidth, y, size: 10, font: fontBd, color: black });
    
    y -= 12;
    page.drawText((settings.school_name || 'auto ecole al afaq marrakech').toLowerCase(), { x: 60, y, size: 8, font, color: gray });

    y -= 50;
    // Totals Box
    const totalsWidth = 180;
    const totalsHeight = 80;
    page.drawRectangle({ x: width - totalsWidth - 50, y: y - totalsHeight, width: totalsWidth, height: totalsHeight, borderColor: lightBlue, borderWidth: 1, color: lightBlue, borderRadius: 10 });
    
    let ty = y - 25;
    const drawTotalRow = (label, val, ypos, isBold = false, isLarge = false) => {
      page.drawText(label, { x: width - totalsWidth - 35, y: ypos, size: 9, font, color: gray });
      const vSize = isLarge ? 12 : 9;
      const vFont = isBold ? fontBd : font;
      const vWidth = vFont.widthOfTextAtSize(val, vSize);
      page.drawText(val, { x: width - 65 - vWidth, y: ypos, size: vSize, font: vFont, color: isLarge ? blue : black });
    };
    
    drawTotalRow('Sous-total', `${parseFloat(invoice.amount).toLocaleString('fr-FR')} MAD`, ty);
    ty -= 18;
    drawTotalRow('TVA (exonéré)', '—', ty);
    page.drawLine({ start: { x: width - totalsWidth - 35, y: ty - 6 }, end: { x: width - 65, y: ty - 6 }, thickness: 0.5, color: borderGray });
    ty -= 25;
    drawTotalRow('Total TTC', `${parseFloat(invoice.amount).toLocaleString('fr-FR')} MAD`, ty, true, true);

    // Footer
    const footerY = 80;
    page.drawText('Merci pour votre confiance !', { x: width/2 - 70, y: footerY + 35, size: 10, font: fontBd, color: blue });
    
    const footer1 = (settings.school_name || 'auto ecole al afaq marrakech').toLowerCase() + ` – ${settings.address || ''} – ${settings.city || ''}`;
    const footer2 = `RC : ${settings.commercial_register || ''} – I.F : ${settings.tax_register || ''} · Tél./Fax : ${settings.phone || ''}`;
    
    const f1Width = font.widthOfTextAtSize(footer1, 7);
    const f2Width = font.widthOfTextAtSize(footer2, 7);
    
    page.drawText(footer1, { x: width/2 - f1Width/2, y: footerY, size: 7, font, color: gray });
    page.drawText(footer2, { x: width/2 - f2Width/2, y: footerY - 10, size: 7, font, color: gray });

    const pdfBytes = await pdfDoc.save();
    const buffer   = Buffer.from(pdfBytes);
    const fileName = `Facture-${invoice.invoice_number}-${Date.now()}.pdf`;
    const filePath = await uploadToStorage(buffer, 'invoices', fileName, 'application/pdf');
    const fileContent = `data:application/pdf;base64,${buffer.toString('base64')}`;

    const doc = await db.createDocument(ctx.autoEcoleId, {
      student_id:  invoice.student_id,
      type:        'Facture',
      name:        `Facture - ${invoice.invoice_number}`,
      file_path:   filePath,
      file_type:   'pdf',
      file_size:   pdfBytes.length,
      description: `Facture générée le ${new Date().toLocaleDateString('fr-FR')}`,
      file_content: fileContent,
    });

    return NextResponse.json({ 
      success: true, 
      data: buffer.toString('base64'), 
      mime: 'application/pdf',
      filename: fileName,
      document: doc
    });
  } catch (error) {
    console.error('Invoice Print Error:', error);
    return NextResponse.json({ error: 'Erreur lors de la génération' }, { status: 500 });
  }
}
