"use client";

import { useState, useCallback, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { readString } from "react-papaparse";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Upload, Play, Pause, Download, FileText, Image, CheckCircle, Clock, AlertCircle } from "lucide-react";
import NextImage from "next/image";

interface EbayItem {
  "Item number": string;
  "Item url": string;
  "Picture1": string;
  "Picture2": string;
  "Picture3": string;
  "Title": string;
  [key: string]: string;
}

type ProcessingStatus = 'idle' | 'running' | 'paused' | 'completed';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<EbayItem[]>([]);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [processedCsv, setProcessedCsv] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [processedCount, setProcessedCount] = useState(0);
  const pauseRef = useRef(false);
  
  const itemsPerPage = 20;
  const totalPages = Math.ceil(csvData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = csvData.slice(startIndex, endIndex);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    setFile(selectedFile);
    setCurrentPage(1);
    setError(null);
    setProcessingStatus('idle');
    setProgress(0);
    setProcessedCount(0);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      readString(text, {
        header: true,
        delimiter: ';',
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
    setProcessingStatus('running');
    pauseRef.current = false;
    setProgress(0);
    const data = [...csvData];
    
    // Filter items that don't have images yet
    const itemsToProcess = data.filter((item) => {
      const id = extractItemId(item);
      return id && !hasImages(item);
    });
    
    console.log(`Total items: ${data.length}, Items to process: ${itemsToProcess.length}`);
    
    if (itemsToProcess.length === 0) {
      setError("All items already have images or don't have valid IDs.");
      setProcessingStatus('idle');
      return;
    }

    let processed = 0;
    
    for (let i = 0; i < itemsToProcess.length; i++) {
      // Check for pause request
      if (pauseRef.current) {
        setProcessingStatus('paused');
        console.log('🔄 Processing paused by user');
        return;
      }
      
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
            
            // Update the displayed data immediately (but less frequently to avoid Fast Refresh)
            if (processed % 5 === 0 || i === itemsToProcess.length - 1) {
              setCsvData([...data]);
            }
            
            // Save CSV after each successful update
            const csvContent = generateCSV(data);
            try {
              const saveRes = await fetch('/api/ebay/save-csv', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ csvContent })
              });
              
              if (saveRes.ok) {
                setProcessedCsv(csvContent);
                const now = new Date().toLocaleTimeString();
                setLastSaved(`Item ${id} saved at ${now}`);
                console.log(`✅ CSV saved after processing item ${id}`);
              }
            } catch (saveError) {
              console.error('Failed to save CSV:', saveError);
            }
            
            processed++;
            setProcessedCount(processed);
            console.log(`✅ Updated item ${id} with ${json.images.length} images`);
          }
        } else {
          console.log(`⚠️ No images found for item ${id}`);
        }
      } catch (error: unknown) {
        console.error(`❌ Error processing item ${id}:`, error);
      }
      
      // Check for pause after processing each item
      if (pauseRef.current) {
        setProcessingStatus('paused');
        console.log('🔄 Processing paused by user after item', id);
        return;
      }
      
      // Update progress (less frequently to avoid too many re-renders)
      const progressPercent = Math.round(((i + 1) / itemsToProcess.length) * 100);
      if (progressPercent !== progress) {
        setProgress(progressPercent);
      }
      
      // Add delay to respect eBay rate limits
      if (i < itemsToProcess.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    console.log(`🎉 Processing completed! ${processed}/${itemsToProcess.length} items updated.`);
    setProcessingStatus('completed');
  };

  const downloadCsv = () => {
    // Generate current CSV data if processedCsv is not available
    const csvContent = processedCsv || generateCSV(csvData);
    if (!csvContent) return;
    
    const url = URL.createObjectURL(new Blob([csvContent], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `ebay-with-photos-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.append(a);
    a.click();
    a.remove();
  };

  // Helper functions for pause/resume
  const handlePause = () => {
    console.log('🔄 Pause requested');
    pauseRef.current = true;
  };

  const handleResume = () => {
    console.log('▶️ Resume requested');
    pauseRef.current = false;
    processItems();
  };

  const getStatusIcon = (status: ProcessingStatus) => {
    switch (status) {
      case 'running': return <Clock className="h-4 w-4" />;
      case 'paused': return <Pause className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: ProcessingStatus) => {
    switch (status) {
      case 'running': return 'bg-blue-500';
      case 'paused': return 'bg-yellow-500';
      case 'completed': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <main className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">eBay CSV Image Processor</h1>
        <p className="text-muted-foreground">
          Upload your eBay CSV export to automatically retrieve item images. Items with existing images will be skipped.
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert className="mb-6" variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Processing Status */}
      {processingStatus !== 'idle' && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon(processingStatus)}
                <CardTitle className="text-lg">
                  {processingStatus === 'running' && 'Processing Items...'}
                  {processingStatus === 'paused' && 'Processing Paused'}
                  {processingStatus === 'completed' && 'Processing Completed'}
                </CardTitle>
                <Badge className={getStatusColor(processingStatus)}>
                  {processingStatus.toUpperCase()}
                </Badge>
              </div>
              <div className="flex gap-2">
                {processingStatus === 'running' && (
                  <Button variant="outline" size="sm" onClick={handlePause}>
                    <Pause className="h-4 w-4 mr-1" />
                    Pause
                  </Button>
                )}
                {processingStatus === 'paused' && (
                  <Button variant="outline" size="sm" onClick={handleResume}>
                    <Play className="h-4 w-4 mr-1" />
                    Resume
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Progress: {progress}%</span>
                <span>Processed: {processedCount} items</span>
              </div>
              <Progress value={progress} className="h-2" />
              {lastSaved && (
                <p className="text-xs text-muted-foreground">
                  💾 Last saved: {lastSaved}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* File Upload */}
      {!file ? (
        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-6">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25"
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg mb-2">
                {isDragActive ? "Drop your CSV file here" : "Drag & drop your eBay CSV file here"}
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Or click to browse and select a file
              </p>
              <Button>
                <FileText className="h-4 w-4 mr-2" />
                Select CSV File
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* File Info Card */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    {file.name}
                  </CardTitle>
                  <CardDescription className="mt-2">
                    <div className="flex gap-6 text-sm">
                      <span>Total: <Badge variant="outline">{csvData.length}</Badge> items</span>
                      <span>With images: <Badge variant="outline">{csvData.filter(hasImages).length}</Badge></span>
                      <span>To process: <Badge variant="outline">{csvData.filter(item => extractItemId(item) && !hasImages(item)).length}</Badge></span>
                    </div>
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {processingStatus === 'idle' && (
                    <Button onClick={processItems}>
                      <Play className="h-4 w-4 mr-2" />
                      Start Processing
                    </Button>
                  )}
                  {csvData.length > 0 && (
                    <Button onClick={downloadCsv} variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Download CSV
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Items Table */}
          <Card>
            <CardHeader>
              <CardTitle>Items Preview</CardTitle>
              <CardDescription>
                Showing {Math.min(itemsPerPage, csvData.length)} of {csvData.length} items
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">Image</TableHead>
                    <TableHead>Item ID</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentItems.map((item, i) => {
                    const itemId = extractItemId(item);
                    const hasImg = hasImages(item);
                    return (
                      <TableRow key={i}>
                        <TableCell>
                          {item["Picture1"] ? (
                            <NextImage 
                              src={item["Picture1"]} 
                              alt={`eBay item ${extractItemId(item)}`}
                              width={64}
                              height={64}
                              className="w-16 h-16 object-cover rounded border" 
                              unoptimized
                            />
                          ) : (
                            <div className="w-16 h-16 bg-muted rounded border flex items-center justify-center">
                              <Image className="h-6 w-6 text-muted-foreground" aria-label="No image available" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm">{itemId}</TableCell>
                        <TableCell className="max-w-xs truncate">{item["Title"] || 'No title'}</TableCell>
                        <TableCell>
                          {hasImg ? (
                            <Badge variant="default" className="bg-green-500">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Done
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              <Clock className="h-3 w-3 mr-1" />
                              Pending
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          href="#" 
                          onClick={(e) => {
                            e.preventDefault();
                            if (currentPage > 1) setCurrentPage(currentPage - 1);
                          }}
                          className={currentPage <= 1 ? 'pointer-events-none opacity-50' : ''}
                        />
                      </PaginationItem>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const page = i + 1;
                        return (
                          <PaginationItem key={page}>
                            <PaginationLink
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                setCurrentPage(page);
                              }}
                              isActive={currentPage === page}
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}
                      {totalPages > 5 && (
                        <PaginationItem>
                          <span className="px-4 py-2 text-sm">...</span>
                        </PaginationItem>
                      )}
                      <PaginationItem>
                        <PaginationNext 
                          href="#" 
                          onClick={(e) => {
                            e.preventDefault();
                            if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                          }}
                          className={currentPage >= totalPages ? 'pointer-events-none opacity-50' : ''}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  );
}