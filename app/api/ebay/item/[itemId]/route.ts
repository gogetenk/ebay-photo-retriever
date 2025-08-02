import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

// eBay API credentials
const EBAY_CLIENT_ID = process.env.EBAY_CLIENT_ID || "YOUR_EBAY_CLIENT_ID";
const EBAY_CLIENT_SECRET = process.env.EBAY_CLIENT_SECRET || "YOUR_EBAY_CLIENT_SECRET";

// Support sandbox endpoints via EBAY_SANDBOX env var
const EBAY_SANDBOX = process.env.EBAY_SANDBOX === 'true';
const OAUTH_ENDPOINT = EBAY_SANDBOX
  ? "https://api.sandbox.ebay.com/identity/v1/oauth2/token"
  : "https://api.ebay.com/identity/v1/oauth2/token";
const BROWSE_API_ENDPOINT = EBAY_SANDBOX
  ? "https://api.sandbox.ebay.com/buy/browse/v1/item"
  : "https://api.ebay.com/buy/browse/v1/item";

// Function to clean and normalize item ID (handle scientific notation)
function cleanItemId(itemId: string): string {
  // Handle scientific notation like "3,54624E+11"
  if (itemId.includes('E+') || itemId.includes('e+')) {
    // Convert scientific notation to regular number with proper precision
    const cleanedId = itemId.replace(',', '.');
    const num = parseFloat(cleanedId);
    
    // Use toFixed to avoid floating point precision issues
    const result = num.toFixed(0);
    console.log(`Scientific notation conversion: ${itemId} -> ${cleanedId} -> ${num} -> ${result}`);
    return result;
  }
  
  // Remove any commas and return clean ID
  return itemId.replace(/,/g, '').trim();
}

// Function to get Application Token using client_credentials flow
async function getApplicationToken(): Promise<string> {
  if (!EBAY_CLIENT_ID || EBAY_CLIENT_ID === "YOUR_EBAY_CLIENT_ID") {
    throw new Error("EBAY_CLIENT_ID environment variable is not set");
  }
  if (!EBAY_CLIENT_SECRET || EBAY_CLIENT_SECRET === "YOUR_EBAY_CLIENT_SECRET") {
    throw new Error("EBAY_CLIENT_SECRET environment variable is not set");
  }

  const credentials = Buffer.from(`${EBAY_CLIENT_ID}:${EBAY_CLIENT_SECRET}`).toString('base64');
  
  try {
    const response = await axios.post(OAUTH_ENDPOINT, 
      'grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope',
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${credentials}`
        }
      }
    );
    
    return response.data.access_token;
  } catch (error: any) {
    console.error('OAuth token error:', error.response?.data || error.message);
    throw new Error(`Failed to get application token: ${error.response?.data?.error_description || error.message}`);
  }
}

// Function to get item images from Browse API using Application Token
async function getItemImagesFromBrowseApi(itemId: string, accessToken: string) {
  try {
    // First try direct getItem
    let response;
    try {
      response = await axios.get(`${BROWSE_API_ENDPOINT}/${itemId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-EBAY-C-MARKETPLACE-ID': 'EBAY_FR', // eBay France
          'Accept': 'application/json'
        }
      });
    } catch (directError: any) {
      // If direct call fails, try getItemByLegacyId for legacy item IDs
      if (directError.response?.status === 404 || directError.response?.status === 400) {
        console.log(`Direct getItem failed for ${itemId}, trying getItemByLegacyId...`);
        
        const legacyEndpoint = EBAY_SANDBOX
          ? "https://api.sandbox.ebay.com/buy/browse/v1/item/get_item_by_legacy_id"
          : "https://api.ebay.com/buy/browse/v1/item/get_item_by_legacy_id";
          
        response = await axios.get(`${legacyEndpoint}?legacy_item_id=${itemId}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'X-EBAY-C-MARKETPLACE-ID': 'EBAY_FR', // eBay France
            'Accept': 'application/json'
          }
        });
        
        console.log(`Successfully retrieved item using legacy ID: ${itemId}`);
      } else {
        throw directError;
      }
    }

    const itemData = response.data;
    console.log('eBay Browse API Response:', JSON.stringify(itemData, null, 2)); // Debug log
    
    const images: string[] = [];
    
    // Primary image
    if (itemData.image?.imageUrl) {
      images.push(itemData.image.imageUrl);
    }
    
    // Additional images
    if (itemData.additionalImages && Array.isArray(itemData.additionalImages)) {
      itemData.additionalImages.forEach((img: any) => {
        if (img.imageUrl) {
          images.push(img.imageUrl);
        }
      });
    }
    
    console.log(`Found ${images.length} images for item ${itemId}:`, images);
    return images;
  } catch (error: any) {
    console.error(`Browse API error for item ${itemId}:`, error.response?.data || error.message);
    
    // Handle specific eBay API errors
    if (error.response?.status === 404) {
      throw new Error(`Item ${itemId} not found`);
    }
    if (error.response?.status === 400) {
      throw new Error(`Invalid item ID: ${itemId}`);
    }
    
    throw error;
  }
}



export async function GET(
  req: NextRequest,
  context: { params: Promise<{ itemId: string }> }
) {
  const { itemId: rawItemId } = await context.params;
  
  if (!rawItemId) {
    return NextResponse.json(
      { success: false, error: "Item ID is required" },
      { status: 400 }
    );
  }
  
  // Clean and normalize the item ID
  const itemId = cleanItemId(rawItemId);
  console.log(`Processing item ID: ${rawItemId} -> ${itemId}`);
  
  if (!itemId || itemId.length < 10) {
    return NextResponse.json(
      { success: false, error: "Invalid item ID format" },
      { status: 400 }
    );
  }

  try {
    // Get Application Token (OAuth client_credentials)
    let accessToken: string;
    try {
      accessToken = await getApplicationToken();
    } catch (err: any) {
      return NextResponse.json({ success: false, error: 'Application Token not configured', message: err.message }, { status: 500 });
    }
    
    // Browse API
    let images: string[];
    try {
      images = (await getItemImagesFromBrowseApi(itemId, accessToken)) || [];
    } catch (err: any) {
      const code = err.response?.status || 500;
      const message = err.response?.data || err.message;
      return NextResponse.json({ success: false, error: 'Browse API failure', code, message }, { status: code });
    }

    return NextResponse.json({
      success: true,
      images: images || [],
    });
  } catch (err: any) {
    console.error(`Unhandled error for item ${itemId}:`, err);
    const code = err.response?.status || 500;
    const message = err.response?.data?.errors?.map((e: any) => e.message).join('; ') || err.message;
    return NextResponse.json({ success: false, error: 'Processing error', code, message }, { status: code });
  }
}
