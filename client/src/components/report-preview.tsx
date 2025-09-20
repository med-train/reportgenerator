import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, FileDown, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { generatePDF } from "@/lib/pdf-generator";
import type { FormData } from "@/types";
import reportLogo from "@/components/assets/Chirayu-Child-Clinic-Pediatrician-Bangalore-9e8946.jpg";
import { useState } from "react";

interface ReportPreviewProps {
  formData: FormData;
  currentDateTime: string;
}

export function ReportPreview({ formData, currentDateTime }: ReportPreviewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State for Results / Interpretation
  const [resultsText, setResultsText] = useState<string>(`RESULTS: type here

DOCTOR’S SIGNATURE:

INTERPRETATION:

Reference Value (Wheal Diameter):  ≥3mm = Positive. <3mm = Negative.

SALINE = Always should be negative for a valid test.
HISTAMINE = Always should be positive for a valid test.
P = Pseudopods Flare ups   E = Erythema Reaction`);

  const saveReportMutation = useMutation({
    mutationFn: async () => {
      // First, create or get patient
      let patientId: string;
      try {
        if (formData.mobile) {
          const patientResponse = await apiRequest("GET", `/api/patients/mobile/${formData.mobile}`);
          const existingPatient = await patientResponse.json();
          patientId = existingPatient.id;
        } else {
          throw new Error("No mobile number");
        }
      } catch {
        const patientResponse = await apiRequest("POST", "/api/patients", {
          name: formData.patientName,
          age: formData.age,
          sex: formData.sex,
          mobile: formData.mobile || undefined,
        });
        const newPatient = await patientResponse.json();
        patientId = newPatient.id;
      }

      // Create or get doctor
      let doctorId: string;
      try {
        const doctorResponse = await apiRequest("GET", `/api/doctors/name/${encodeURIComponent(formData.doctorName)}`);
        const existingDoctor = await doctorResponse.json();
        doctorId = existingDoctor.id;
      } catch {
        const doctorResponse = await apiRequest("POST", "/api/doctors", {
          name: formData.doctorName,
        });
        const newDoctor = await doctorResponse.json();
        doctorId = newDoctor.id;
      }

      // Create report
      const reportResponse = await apiRequest("POST", "/api/reports", {
        patientId,
        doctorId,
        testName: formData.testName,
        testItems: formData.testItems,
        resultsText, // Save results text along with report
      });
      return reportResponse.json();
    },
    onSuccess: () => {
      toast({
        title: "Report Saved",
        description: "The allergy report has been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save report. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSaveReport = () => {
    if (!formData.patientName || !formData.age || !formData.sex || !formData.doctorName || !formData.testName) {
      toast({
        title: "Error",
        description: "Please fill in all required fields before saving the report.",
        variant: "destructive",
      });
      return;
    }

    if (formData.testItems.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one test item before saving the report.",
        variant: "destructive",
      });
      return;
    }

    saveReportMutation.mutate();
  };

  const handleGeneratePDF = () => {
    if (!formData.patientName || !formData.age || !formData.sex || !formData.doctorName || !formData.testName) {
      toast({
        title: "Error",
        description: "Please fill in all required fields before generating PDF.",
        variant: "destructive",
      });
      return;
    }

    try {
      generatePDF(formData, currentDateTime, resultsText, reportLogo); // Include resultsText and reportLogo in PDF
      toast({
        title: "PDF Generated",
        description: "The PDF report has been downloaded successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  const formatDateTime = (dateTimeString: string) => {
    const date = new Date(dateTimeString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <Card data-testid="card-report-preview">
      <CardHeader className="border-b border-gray-200">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center text-gray-900">
            <Eye className="text-primary mr-2" />
            Report Preview
          </CardTitle>
          <div className="flex space-x-2">
            <Button 
              onClick={handleGeneratePDF}
              className="bg-red-600 text-white hover:bg-red-700"
              size="sm"
              data-testid="button-generate-pdf"
            >
              <FileDown className="h-4 w-4 mr-1" />
              Download PDF
            </Button>
            <Button 
              onClick={handleSaveReport}
              disabled={saveReportMutation.isPending}
              className="bg-green-600 text-white hover:bg-green-700"
              size="sm"
              data-testid="button-save-report"
            >
              <Save className="h-4 w-4 mr-1" />
              Save Report
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        <div className="border border-gray-300 rounded-lg p-6 bg-white">
          {/* Report Header */}
          <div className="flex items-center justify-center mb-6 pb-4 border-b-2 border-gray-200 relative">
            <img 
              src={reportLogo} 
              alt="Clinic Logo" 
              className="absolute left-0 w-32 h-auto" 
            />
            <div className="text-center w-full">
              <h3 className="text-xl font-bold text-gray-900 mb-2">ALLERGY TEST REPORT</h3>
              <div className="text-sm text-gray-600">
                <p className="ml-12">Generated on: {formatDateTime(currentDateTime)}</p>
              </div>
            </div>
          </div>

          {/* Patient Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <div className="flex justify-between py-1">
                <span className="font-medium text-gray-700">Patient Name:</span>
                <span className="text-gray-900">{formData.patientName || "—"}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="font-medium text-gray-700">Age:</span>
                <span className="text-gray-900">{formData.age ? `${formData.age} years` : "—"}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="font-medium text-gray-700">Sex:</span>
                <span className="text-gray-900 capitalize">{formData.sex || "—"}</span>
              </div>
            </div>
            <div>
              <div className="flex justify-between py-1">
                <span className="font-medium text-gray-700">Doctor:</span>
                <span className="text-gray-900">{formData.doctorName || "—"}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="font-medium text-gray-700">Test Name:</span>
                <span className="text-gray-900">{formData.testName || "—"}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="font-medium text-gray-700">Mobile:</span>
                <span className="text-gray-900">{formData.mobile || "—"}</span>
              </div>
            </div>
          </div>

          {/* Test Results Table */}
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-3">Test Results</h4>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-400">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-400 px-3 py-2 text-left text-sm font-semibold">Test Row</th>
                    <th className="border border-gray-400 px-3 py-2 text-left text-sm font-semibold">Antigen</th>
                    <th className="border border-gray-400 px-3 py-2 text-center text-sm font-semibold">Wheal Diameter (mm)</th>
                    <th className="border border-gray-400 px-3 py-2 text-center text-sm font-semibold">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.testItems.length > 0 ? (
                    formData.testItems.map((item, index) => (
                      <tr key={index}>
                        <td className="border border-gray-400 px-3 py-2 text-sm">{item.testRow || "—"}</td>
                        <td className="border border-gray-400 px-3 py-2 text-sm">{item.antigen || "—"}</td>
                        <td className="border border-gray-400 px-3 py-2 text-center text-sm">{item.whealDiameter}</td>
                        <td className="border border-gray-400 px-3 py-2 text-center text-sm">
                          <Badge 
                            variant={item.isPositive ? "destructive" : "secondary"}
                            className={item.isPositive ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}
                          >
                            {item.isPositive ? "Positive" : "Negative"}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="border border-gray-400 px-3 py-2 text-center text-sm text-gray-500">
                        No test items added yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Results / Interpretation */}
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-2">Results / Interpretation</h4>
            <textarea
              className="w-full border border-gray-300 rounded-md p-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary"
              rows={10}
              value={resultsText}
              onChange={(e) => setResultsText(e.target.value)}
            />
          </div>

          {/* Report Footer */}
          <div className="text-center pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              This report is generated electronically and is valid without signature.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
