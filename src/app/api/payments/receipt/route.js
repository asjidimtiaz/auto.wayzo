import { NextResponse } from 'next/server';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import fs from 'fs';
import path from 'path';
import * as db from '@/lib/db';
import { requireTenant } from '@/lib/tenant';
import { uploadToStorage } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const tenant = await requireTenant(request);
    if (!tenant) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get('id');
    
    const payment = await db.queryOne('SELECT p.*, s.full_name, s.cin, s.qr_code FROM payments p JOIN students s ON p.student_id = s.id WHERE p.id = $1 AND p.auto_ecole_id = $2', [paymentId, tenant.autoEcoleId]);
    if (!payment) throw new Error('Paiement non trouvé');

    const settings = (await db.getSettings(tenant.autoEcoleId)) || {};

    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);

    const fontPath   = path.join(process.cwd(), 'public', 'fonts', 'arial.ttf');
    const fontBdPath = path.join(process.cwd(), 'public', 'fonts', 'arialbd.ttf');
    const fontBytes   = fs.readFileSync(fontPath);
    const fontBdBytes = fs.readFileSync(fontBdPath);
    const font   = await pdfDoc.embedFont(fontBytes);
    const fontBd = await pdfDoc.embedFont(fontBdBytes);

    const page = pdfDoc.addPage([400, 300]); // Smaller receipt size
    const black = rgb(0, 0, 0);
    const medGray = rgb(0.4, 0.4, 0.4);

    let y = 270;

    // Header
    const schoolText = settings.school_name || 'Auto-Ecole';
    page.drawText(schoolText, { x: 30, y, size: 14, font: fontBd, color: black });
    y -= 15;
    if (settings.address) {
      page.drawText(settings.address, { x: 30, y, size: 8, font, color: medGray });
      y -= 10;
    }
    if (settings.phone) {
      page.drawText(`Tél: ${settings.phone}`, { x: 30, y, size: 8, font, color: medGray });
      y -= 10;
    }

    y -= 20;
    page.drawLine({ start: { x: 30, y }, end: { x: 370, y }, thickness: 1, color: black });
    y -= 25;

    // Receipt Info
    page.drawText('REÇU DE PAIEMENT', { x: 130, y, size: 12, font: fontBd, color: black });
    y -= 30;

    const drawLine = (label, value) => {
      page.drawText(label, { x: 40, y, size: 10, font: fontBd, color: black });
      page.drawText(String(value || ''), { x: 150, y, size: 10, font, color: black });
      y -= 20;
    };

    drawLine('N° Reçu :', `REC-${payment.id}`);
    drawLine('Date :', new Date(payment.payment_date).toLocaleDateString('fr-FR'));
    drawLine('Étudiant :', payment.full_name);
    drawLine('CIN :', payment.cin || '—');
    drawLine('Mode :', payment.payment_method);
    
    y -= 10;
    page.drawText('MONTANT :', { x: 40, y, size: 12, font: fontBd, color: black });
    page.drawText(`${parseFloat(payment.amount).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} MAD`, { x: 150, y, size: 14, font: fontBd, color: rgb(0, 0.5, 0) });
    
    y -= 40;
    page.drawText('Signature & Cachet', { x: 250, y, size: 9, font: fontBd, color: black });

    const finalBytes = await pdfDoc.save();
    const buffer     = Buffer.from(finalBytes);
    const fileName   = `recu-${payment.id}-${Date.now()}.pdf`;
    const filePath   = await uploadToStorage(buffer, 'receipts', fileName, 'application/pdf');
    const fileContent = `data:application/pdf;base64,${buffer.toString('base64')}`;

    const doc = await db.createDocument(tenant.autoEcoleId, {
      student_id:  payment.student_id,
      type:        'Reçu',
      name:        `Reçu - ${payment.id}`,
      file_path:   filePath,
      file_type:   'pdf',
      file_size:   finalBytes.length,
      description: `Reçu de paiement généré le ${new Date().toLocaleDateString('fr-FR')}`,
      file_content: fileContent,
    });

    return NextResponse.json({ success: true, path: filePath, documentId: doc.id, document: doc });
  } catch (error) {
    console.error('Error generating receipt:', error);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}
