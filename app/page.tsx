"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { readString } from "react-papaparse";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface EbayItem {
  "Item number": string;
  "Item url": string;
  "Picture1": string;
  "Picture2": string;
  "Picture3": string;
  [key: string]: string;
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<EbayItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processedCsv, setProcessedCsv] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      readString(text, {
        header: true,
        complete: (r) => setCsvData(r.data as EbayItem[]),
      });
    };
    reader.readAsText(selectedFile);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"] },
    multiple: false,
  });

  const extractItemId = (item: EbayItem) => {
    if (item["Item number"]?.trim()) return item["Item number"];
    const m = item["Item url"]?.match(/(\d{12})/);
    return m ? m[1] : "";
  };

  // Check if item already has images
  const hasImages = (item: EbayItem) => {
    return !!(item["Picture1"] || item["Picture2"] || item["Picture3"]);
  };

  // Generate CSV string with semicolon separator
  const generateCSV = (data: EbayItem[]) => {
    if (!data.length) return "";
    const headers = Object.keys(data[0]);
    const escapeField = (field: string) => {
      if (field.includes(';') || field.includes('"') || field.includes('\n')) {
        return `"${field.replace(/"/g, '""')}"`;
      }
      return field;
    };
    
    return [
      headers.map(escapeField).join(';'),
      ...data.map(row => 
        headers.map(h => escapeField(row[h] || '')).join(';')
      )
    ].join('\n');
  };

  const processItems = async () => {
    if (!csvData.length) return;
    setError(null);
    setIsProcessing(true);
    setProgress(0);
    const data = [...csvData];
    
    // Filter items that don't have images yet
    const itemsToProcess = data.filter((item, index) => {
      const id = extractItemId(item);
      return id && !hasImages(item);
    });
    
    console.log(`Total items: ${data.length}, Items to process: ${itemsToProcess.length}`);
    
    if (itemsToProcess.length === 0) {
      setError("Tous les items ont déjà des images ou n'ont pas d'ID valide.");
      setIsProcessing(false);
      return;
    }

    let processed = 0;
    
    for (let i = 0; i < itemsToProcess.length; i++) {
      const item = itemsToProcess[i];
      const id = extractItemId(item);
      
      console.log(`Processing item ${i + 1}/${itemsToProcess.length}: ${id}`);
      
      try {
        const res = await fetch(`/api/ebay/item/${id}`);
        const json = await res.json();
        
        if (json.success && json.images.length > 0) {
          // Find the item in the original data array and update it
          const originalIndex = data.findIndex(originalItem => 
            extractItemId(originalItem) === id
          );
          
          if (originalIndex !== -1) {
            data[originalIndex]["Picture1"] = json.images[0] || "";
            data[originalIndex]["Picture2"] = json.images[1] || "";
            data[originalIndex]["Picture3"] = json.images[2] || "";
            
            // Update the displayed data immediately
            setCsvData([...data]);
            
            // Generate and update CSV for download
            const csv = generateCSV(data);
            setProcessedCsv(csv);
            
            // Save CSV to file immediately
            try {
              await fetch('/api/ebay/save-csv', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ csvContent: csv }),
              });
              setLastSaved(`Item ${id} - ${new Date().toLocaleTimeString()}`);
              console.log(`💾 CSV file updated for item ${id}`);
            } catch (saveError: any) {
              console.error(`❌ Failed to save CSV for item ${id}:`, saveError.message);
            }
            
            processed++;
            console.log(`✅ Updated item ${id} with ${json.images.length} images`);
          }
        } else {
          console.log(`⚠️ No images found for item ${id}: ${json.message || json.error}`);
        }
      } catch (err: any) {
        console.error(`❌ Error processing item ${id}:`, err.message);
        setError(`Erreur pour l'item ${id}: ${err.message}`);
      }
      
      // Update progress
      setProgress(Math.floor(((i + 1) / itemsToProcess.length) * 100));
      
      // Small delay to avoid rate limiting
      await new Promise((r) => setTimeout(r, 200));
    }
    
    console.log(`🎉 Processing completed! ${processed}/${itemsToProcess.length} items updated.`);
    setIsProcessing(false);
  };

  const downloadCsv = () => {
    if (!processedCsv) return;
    const url = URL.createObjectURL(new Blob([processedCsv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `ebay-with-photos-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.append(a);
    a.click();
    a.remove();
  };

  return (
    <main className="container mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">eBay CSV Processor</h1>
        <p className="text-gray-600 mt-2">
          Importez votre CSV eBay pour récupérer automatiquement les images des items. 
          Les items avec des images existantes seront ignorés.
        </p>
      </div>
      {error && (
        <div className="w-full max-w-3xl mb-4 text-red-600">
          Erreur: {error}
        </div>
      )}
      {isProcessing && (
        <div className="w-full max-w-3xl mb-4">
          <p className="text-center mb-2">
            Traitement en cours... {progress}% 
            <span className="text-sm text-gray-500">(Les items déjà traités sont ignorés)</span>
          </p>
          {lastSaved && (
            <p className="text-center text-xs text-green-600 mb-2">
              💾 Dernier enregistrement: {lastSaved}
            </p>
          )}
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {!file ? (
        <div
          {...getRootProps()}
          className={`w-full max-w-3xl p-8 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${
            isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300"
          }`}
        >
          <input {...getInputProps()} />
          <p className="text-lg mb-2">
            {isDragActive ? "Drop CSV here" : "Drag & drop a CSV here"}
          </p>
          <Button>Sélectionner un CSV</Button>
        </div>
      ) : (
        <div className="w-full max-w-6xl">
          <div className="flex justify-between items-center mb-4">
            <div>
              <span className="font-medium">Fichier: {file.name}</span>
              <div className="text-sm text-gray-600 mt-1">
                Total: {csvData.length} items | 
                Avec images: {csvData.filter(hasImages).length} | 
                À traiter: {csvData.filter(item => extractItemId(item) && !hasImages(item)).length}
              </div>
            </div>
            <div className="space-x-2">
              {!processedCsv && (
                <Button onClick={processItems} disabled={isProcessing}>
                  {isProcessing ? 'Traitement...' : 'Lancer la récupération'}
                </Button>
              )}
              {processedCsv && <Button onClick={downloadCsv}>Télécharger CSV</Button>}
            </div>
          </div>

          <div className="border rounded overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {csvData[0] && Object.keys(csvData[0]).map((h) => (
                    <TableHead key={h}>{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {csvData.slice(0, 10).map((row, i) => (
                  <TableRow key={i}>
                    {Object.values(row).map((c, j) => (
                      <TableCell key={j}>
                        {c.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                          <img src={c} className="w-16 h-16 object-contain" />
                        ) : c}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {csvData.length > 10 && (
              <p className="text-center py-2 text-sm">
                Affichage de 10/{csvData.length}
              </p>
            )}
          </div>
        </div>
      )}
    </main>
  );
}