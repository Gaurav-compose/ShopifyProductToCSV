
import { writeFileSync } from 'fs';
import { join } from 'path';
import { cwd } from 'process';
import { parse } from 'json2csv';
import { shopify } from '../services/shopifyApi';

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
      console.log("Data fetched from shopify. Products fetched: " + response.length);
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

    console.log("CSV will be saved in: ", join(cwd() + '/src/public'))

    // Convert JSON to CSV
    const csv = parse(csvData, { fields: ["id", "title", "url"] });

    // Save CSV to a file
    writeFileSync(join(cwd() + '/src/public/shopify_products.csv'), csv);

    console.log('CSV file created successfully');
    return csvData;

  } catch (error: any) {
    console.log(`Error in fetching products:`, error);
  }
}

fetchAllShopifyProducts();