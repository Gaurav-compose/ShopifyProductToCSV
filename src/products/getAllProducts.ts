 
 import { writeFileSync } from 'fs';
 import { parse } from 'json2csv';
 import dotenv from 'dotenv'
import Shopify from "shopify-api-node";
 dotenv.config()


 const shopify = new Shopify({
    shopName: process.env.SHOPIFY_STORE_NAME as string,
    accessToken: process.env.SHOPIFY_ADMIN_ACCESS_TOKEN as string,
    apiVersion: '2024-10',
});


export async function fetchAllShopifyProducts() {
  try {
    let allProducts: any[] = [];
    let lastProductId = null;
    const limit = 250; // Shopify's API limit per request

    while (true) {
        const params: any = { limit };
        if (lastProductId) {
            params.since_id = lastProductId; // Use since_id for pagination
        }

        const response = await shopify.product.list(params);
        if (response.length === 0) break;

        allProducts = [...allProducts, ...response];
        lastProductId = response[response.length - 1].id; // Set since_id for the next batch
    }

    // Map data to only include id, title, and URL
    const csvData = allProducts.map(product => ({
      id: product.id,
      title: product.title,
      url: `https://maisonsunny.com.au/products/${product.handle}`
    }));

    // Convert JSON to CSV
    const csv = parse(csvData, { fields: ["id", "title", "url"] });
    
    // Save CSV to a file
    writeFileSync('shopify_products.csv', csv);

    console.log('CSV file created successfully');
    return csvData;

  } catch (error: any) {
    console.log(`Error in fetching products:`, error);
  }
}


fetchAllShopifyProducts()

  
  
