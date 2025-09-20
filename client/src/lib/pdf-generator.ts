import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { FormData } from '@/types';

export function generatePDF(
  formData: FormData,
  currentDateTime: string,
  resultsText: string,
  reportLogo?: string,
  filePrefix: string = ""
) {
  const doc = new jsPDF();

  const pageWidth = doc.internal.pageSize.width;
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  let yPosition = margin;

  // Helpers
  const addText = (text: string, x: number, y: number, options?: any) => {
    doc.text(text, x, y, options);
  };
  const nextLine = (spacing: number = 6) => {
    yPosition += spacing;
  };

  // ===== Header with Logo =====
  if (reportLogo) {
    try {
      doc.addImage(reportLogo, 'JPEG', margin, yPosition, 40, 20);
    } catch (e) {
      console.warn('Logo could not be added:', e);
    }
  }

  doc.setFontSize(18).setFont('helvetica', 'bold');
  addText('ALLERGY TEST REPORT', pageWidth / 2, yPosition + 10, {
    align: 'center',
  });
  nextLine(25);

  // Date
  doc.setFontSize(10).setFont('helvetica', 'normal');
  const formattedDate = new Date(currentDateTime).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  addText(`Generated on: ${formattedDate}`, pageWidth / 2, yPosition, {
    align: 'center',
  });
  nextLine(20);

  // ===== Patient Information =====
  doc.setFontSize(14).setFont('helvetica', 'bold');
  addText('Patient Information', margin, yPosition);
  nextLine(10);

  doc.setFontSize(11).setFont('helvetica', 'normal');
  const leftColX = margin;
  const rightColX = pageWidth / 2;
  let leftYPos = yPosition;
  let rightYPos = yPosition;

  addText(`Patient Name: ${formData.patientName}`, leftColX, leftYPos);
  leftYPos += 8;
  addText(`Age: ${formData.age} years`, leftColX, leftYPos);
  leftYPos += 8;
  addText(`Sex: ${formData.sex}`, leftColX, leftYPos);

  addText(`Doctor: ${formData.doctorName}`, rightColX, rightYPos);
  rightYPos += 8;
  addText(`Test Name: ${formData.testName}`, rightColX, rightYPos);
  rightYPos += 8;
  addText(`Mobile: ${formData.mobile || 'N/A'}`, rightColX, rightYPos);

  yPosition = Math.max(leftYPos, rightYPos) + 20;

  // ===== Test Results =====
  doc.setFontSize(14).setFont('helvetica', 'bold');
  addText('Test Results', margin, yPosition);
  nextLine(10);

  if (formData.testItems.length > 0) {
    autoTable(doc, {
      startY: yPosition,
      head: [['#', 'Antigen', 'Wheal Diameter (mm)', 'Result']],
      body: formData.testItems.map((item, index) => [
        index + 1,
        item.antigen,
        item.whealDiameter.toString(),
        item.isPositive ? 'Positive' : 'Negative',
      ]),
      styles: { fontSize: 10, cellPadding: 3 },
      headStyles: {
        fillColor: [230, 230, 230],
        textColor: [0, 0, 0],
        halign: 'center',
      },
      bodyStyles: { halign: 'center' },
      columnStyles: { 1: { halign: 'left' } },
      pageBreak: 'auto', // ✅ multi-page enabled
    });
    yPosition = (doc as any).lastAutoTable.finalY + 15;
  } else {
    doc.setFontSize(10).setFont('helvetica', 'italic');
    addText('No test items recorded', pageWidth / 2, yPosition, {
      align: 'center',
    });
    nextLine(10);
  }

  // ===== Medications (if present) =====
  if (formData.medications && formData.medications.length > 0) {
    doc.setFontSize(14).setFont('helvetica', 'bold');
    addText('Medications', margin, yPosition);
    nextLine(10);

    autoTable(doc, {
      startY: yPosition,
      head: [['Medicine Name', 'Dosage', 'Frequency', 'Duration', 'Remarks']],
      body: formData.medications.map((m) => [
        m.name,
        m.dosage,
        m.frequency,
        m.duration,
        m.remarks || '',
      ]),
      styles: { fontSize: 10, cellPadding: 3 },
      headStyles: {
        fillColor: [200, 230, 255],
        textColor: [0, 0, 0],
        halign: 'center',
      },
      bodyStyles: { halign: 'center' },
      columnStyles: { 0: { halign: 'left' } },
      pageBreak: 'auto', // ✅ allow breaking into multiple pages
    });
    yPosition = (doc as any).lastAutoTable.finalY + 15;
  }

  // ===== Results / Interpretation =====
  doc.setFontSize(14).setFont('helvetica', 'bold');
  addText('Results / Interpretation', margin, yPosition);
  nextLine(10);

  doc.setFontSize(10).setFont('helvetica', 'normal');
  const splitResults = doc.splitTextToSize(resultsText, contentWidth);
  splitResults.forEach((line: string) => {
    if (yPosition > doc.internal.pageSize.height - 30) {
      doc.addPage();
      yPosition = margin;
    }
    addText(line, margin, yPosition);
    nextLine(6);
  });

  // ===== Footer with Page Numbers =====
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(9).setFont('helvetica', 'normal');
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth - 40,
      doc.internal.pageSize.height - 10
    );
    doc.text(
      'This report is generated electronically and is valid without signature.',
      pageWidth / 2,
      doc.internal.pageSize.height - 20,
      { align: 'center' }
    );
  }

  // Save
  const fileName = `${filePrefix}allergy_report_${formData.patientName.replace(
    /\s+/g,
    '_'
  )}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}
