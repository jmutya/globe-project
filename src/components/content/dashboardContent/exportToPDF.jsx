// GeneratePDFButton.jsx
import React from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const GeneratePDFButton = ({ dashboardRef }) => {
  const handleGeneratePDF = async () => {
    if (!dashboardRef.current) return;

    const canvas = await html2canvas(dashboardRef.current, {
      scale: 2,
      useCORS: true,
    });

    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const imgProps = pdf.getImageProperties(imgData);
    const imgWidth = pageWidth;
    const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

    if (imgHeight > pageHeight) {
      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
    } else {
      const centerY = (pageHeight - imgHeight) / 2;
      pdf.addImage(imgData, "PNG", 0, centerY, imgWidth, imgHeight);
    }

    pdf.save("dashboard.pdf");
  };

  return (
    <button
      onClick={handleGeneratePDF}
      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
    >
      Download Full Dashboard PDF
    </button>
  );
};

export default GeneratePDFButton;
