import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const CSV_FILE_PATH = path.join(process.cwd(), "public", "eBay-all-active-listings-report-2025-05-12-12239755554.csv");
const BACKUP_FILE_PATH = path.join(process.cwd(), "public", "eBay-all-active-listings-report-backup.csv");

export async function POST(req: NextRequest) {
  try {
    const { csvContent } = await req.json();
    
    if (!csvContent) {
      return NextResponse.json({ success: false, error: 'No CSV content provided' }, { status: 400 });
    }
    
    // Create backup first
    if (fs.existsSync(CSV_FILE_PATH)) {
      fs.copyFileSync(CSV_FILE_PATH, BACKUP_FILE_PATH);
    }
    
    // Write new CSV content
    fs.writeFileSync(CSV_FILE_PATH, csvContent, 'utf-8');
    
    return NextResponse.json({ success: true, message: 'CSV saved successfully' });
    
  } catch (error: unknown) {
    console.error('CSV save error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      success: false,
      error: 'Failed to save CSV',
      message
    }, { status: 500 });
  }
}
