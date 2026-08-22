import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { Contrato, ParteContrato } from '../types';
import { formatCurrency, formatDate } from './formatters';

/** Base pública usada nos QR codes de validação de cada carimbo. */
function getPublicBaseUrl(): string {
  return window.location.origin;
}

interface CarimboDados {
  parte: ParteContrato;
  documentHash: string;
  validationUrl: string;
}

/** Desenha UM carimbo digital, a partir de um objeto de dados isolado (1 parte = 1 carimbo). */
async function drawDigitalSignatureStamp(doc: jsPDF, y: number, dados: CarimboDados): Promise<number> {
  const { parte, documentHash, validationUrl } = dados;
  const qrDataUrl = await QRCode.toDataURL(validationUrl, { margin: 0, width: 160 });

  const boxHeight = 32;
  doc.setDrawColor(16, 185, 129);
  doc.setLineWidth(0.4);
  doc.roundedRect(15, y, 180, boxHeight, 2, 2);

  doc.addImage(qrDataUrl, 'PNG', 18, y + 3, 24, 24);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  const papelLabel = parte.papel.charAt(0).toUpperCase() + parte.papel.slice(1);
  doc.text(`Assinado eletronicamente por: ${parte.nome} (${papelLabel})`, 46, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`CPF/CNPJ: ${maskDoc(parte.cpfCnpj)}`, 46, y + 12);
  doc.text(`Data/hora: ${parte.signedAt ? new Date(parte.signedAt).toLocaleString('pt-BR') : '-'}`, 46, y + 17);
  doc.text(`IP: ${parte.signerIp || '-'}`, 46, y + 22);
  doc.text(`ID da assinatura: ${parte.signatureId || '-'}`, 46, y + 27);
  doc.setFontSize(6.5);
  doc.text(`Hash do documento (SHA-256): ${documentHash}`, 18, y + boxHeight - 1.5);

  return y + boxHeight + 6;
}

function maskDoc(doc?: string): string {
  if (!doc) return '-';
  const digits = doc.replace(/\D/g, '');
  if (digits.length < 4) return '****';
  return `****${digits.slice(-4)}`;
}

/**
 * Gera o PDF final com os 2 (ou mais, se houver cônjuge) carimbos digitais.
 * Deve ser chamado UMA ÚNICA VEZ, no momento em que a última parte assina —
 * o arquivo gerado vira a fonte da verdade e nunca é regenerado depois.
 */
export async function generateSignedContractPdf(contrato: Contrato): Promise<Blob> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const partes = contrato.partes || [];
  const documentHash = contrato.documentHash || '';

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(contrato.titulo || 'Contrato', 15, 18);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nº ${contrato.numero}  ·  Data: ${formatDate(contrato.dataContrato)}  ·  Valor: ${formatCurrency(contrato.valor)}`, 15, 24);

  doc.setLineWidth(0.2);
  doc.line(15, 28, 195, 28);

  const texto = contrato.textoContrato || contrato.observacoes || '';
  const linhas = doc.splitTextToSize(texto, 178);
  doc.setFontSize(9);
  doc.text(linhas, 15, 36);
  let cursorY = 36 + linhas.length * 4.2;

  if (cursorY > 250) {
    doc.addPage();
    cursorY = 20;
  }

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Assinaturas eletrônicas', 15, cursorY);
  cursorY += 6;

  for (const parte of partes) {
    if (!parte.signedAt) continue;
    if (cursorY > 250) {
      doc.addPage();
      cursorY = 20;
    }
    const validationUrl = `${getPublicBaseUrl()}/assinar/${contrato.id}?parte=${parte.id}&sig=${parte.signatureId}`;
    cursorY = await drawDigitalSignatureStamp(doc, cursorY, { parte, documentHash, validationUrl });
  }

  return doc.output('blob');
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
