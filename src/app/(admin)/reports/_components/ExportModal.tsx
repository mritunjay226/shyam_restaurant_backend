"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { format, subDays } from "date-fns";
import { Download, FileText, Loader2, Calendar, Database } from "lucide-react";
import { useConvex } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { toast } from "sonner";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExportModal({ isOpen, onClose }: ExportModalProps) {
  const convex = useConvex();
  const [module, setModule] = useState("all");
  const [dataType, setDataType] = useState("bills");
  const [fromDate, setFromDate] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [toDate, setToDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [isExportingCSV, setIsExportingCSV] = useState(false);

  const fetchExportData = async () => {
    try {
      const data = await convex.query(api.reports.getExportData, {
        module,
        dataType,
        fromDate,
        toDate,
      });
      return data;
    } catch (error) {
      console.error(error);
      toast.error("Failed to fetch export data");
      return null;
    }
  };

  const generateExcelXML = (data: any[]) => {
    if (!data || data.length === 0) {
      toast.error("No data found for the selected criteria.");
      return;
    }

    let headers = Object.keys(data[0]);

    // Force explicit column sequencing since the backend canonicalizes and sorts keys alphabetically
    if (dataType === "bookings") {
      const order = ["name", "phone number", "dates", "status", "notes", "total", "advance", "remaining"];
      headers.sort((a, b) => order.indexOf(a) - order.indexOf(b));
    } else if (dataType === "bills") {
      const order = ["Date", "Bill Type", "Guest Name", "Discount (Rs)", "CGST (Rs)", "SGST (Rs)", "Total Amount (Rs)", "Subtotal (Rs)", "Status", "Payment Method"];
      headers.sort((a, b) => order.indexOf(a) - order.indexOf(b));
    } else if (dataType === "orders") {
      const order = ["Date", "Outlet", "Table/Room", "Item Name", "Quantity", "Price (Rs)", "Item Total (Rs)", "Order Status"];
      headers.sort((a, b) => order.indexOf(a) - order.indexOf(b));
    }

    // Build columns width definition
    let columnsXml = "";
    headers.forEach(header => {
      let width = 100;
      const h = header.toLowerCase();
      if (h.includes("name")) width = 150;
      else if (h.includes("phone")) width = 120;
      else if (h.includes("date")) width = 220;
      else if (h.includes("note")) width = 200;

      columnsXml += `<Column ss:Width="${width}"/>\n`;
    });

    let rowsXml = "<Row>\n";
    headers.forEach(header => {
      // Capitalize each word for the header row
      const capitalizedHeader = header
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      rowsXml += `<Cell ss:StyleID="s1"><Data ss:Type="String">${capitalizedHeader}</Data></Cell>\n`;
    });
    rowsXml += "</Row>\n";

    data.forEach(row => {
      rowsXml += "<Row>\n";
      headers.forEach(header => {
        const val = row[header];
        // Escape special XML characters
        const strVal = String(val !== null && val !== undefined ? val : "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
        rowsXml += `<Cell><Data ss:Type="String">${strVal}</Data></Cell>\n`;
      });
      rowsXml += "</Row>\n";
    });

    const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="s1">
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Bold="1"/>
   <Interior ss:Color="#F2F2F2" ss:Pattern="Solid"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Export">
  <Table>
${columnsXml}${rowsXml}  </Table>
 </Worksheet>
</Workbook>`;

    const blob = new Blob([xml], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    // We use .xls so it opens in Excel by default. 
    // It will trigger a small 'format mismatch' warning, which is normal for XML Spreadsheets.
    link.setAttribute("download", `Export_${module}_${dataType}_${fromDate}_to_${toDate}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Excel sheet downloaded successfully!");
  };

  const handleExportExcel = async () => {
    setIsExportingCSV(true);
    const data = await fetchExportData();
    if (data) {
      generateExcelXML(data);
      onClose();
    }
    setIsExportingCSV(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle className="text-xl">Export Report Data</DialogTitle>
          <DialogDescription>
            Configure the parameters below to generate a highly detailed, production-ready export.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Data Source Section */}
          <div className="space-y-4 rounded-xl border border-slate-200/60 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="font-semibold text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Database className="w-4 h-4" /> Data Source
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="module" className="text-sm font-medium">Module</Label>
                <Select value={module} onValueChange={(val) => val && setModule(val)}>
                  <SelectTrigger id="module" className="bg-white dark:bg-slate-950">
                    <SelectValue placeholder="Select module" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Modules</SelectItem>
                    <SelectItem value="rooms">Rooms</SelectItem>
                    <SelectItem value="restaurant">Restaurant</SelectItem>
                    <SelectItem value="banquet">Banquet</SelectItem>
                    <SelectItem value="cafe">Cafe</SelectItem>
                    <SelectItem value="grocery">Grocery</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dataType" className="text-sm font-medium">Data Type</Label>
                <Select value={dataType} onValueChange={(val) => val && setDataType(val)}>
                  <SelectTrigger id="dataType" className="bg-white dark:bg-slate-950">
                    <SelectValue placeholder="Select data type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bills">Financial Bills</SelectItem>
                    <SelectItem value="bookings">Booking Details</SelectItem>
                    <SelectItem value="orders">Order Items</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Date Range Section */}
          <div className="space-y-4 rounded-xl border border-slate-200/60 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="font-semibold text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Date Range
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fromDate" className="text-sm font-medium">From Date</Label>
                <Input
                  id="fromDate"
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="bg-white dark:bg-slate-950"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="toDate" className="text-sm font-medium">To Date</Label>
                <Input
                  id="toDate"
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="bg-white dark:bg-slate-950"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-3 sm:gap-0 mt-2">
          <Button
            onClick={handleExportExcel}
            disabled={isExportingCSV}
            className="gap-2 w-full sm:w-auto h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
          >
            {isExportingCSV ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download size={18} />}
            Download Excel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
