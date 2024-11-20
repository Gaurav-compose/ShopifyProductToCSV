import { appendFileSync, createReadStream, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { cwd } from 'process';
import { parse } from 'json2csv';
import csvParser from 'csv-parser';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// Read CSV and extract id, url
async function readCSV(filePath: string): Promise<{ id: string; url: string }[]> {
  const results: { id: string; url: string }[] = [];
  return new Promise((resolve, reject) => {
    createReadStream(filePath)
      .pipe(csvParser())
      .on('data', row => row.id && row.url && results.push({ id: row.id, url: row.url }))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

// Post URL to API and return response
async function generateDescription(url: string, id: string) {
  try {
    console.log("Generate description calleld for ", url);
    const { data } = (await axios.post(process.env.FETCH_DETAILS_URL as string, { url })).data;
    return { url, data, id };
  } catch (error) {
    console.error(`Error posting URL: ${url}`, error);
    return null;
  }
}

async function scrapUrl(url: string, id: string) {
  let brokenUrl: string = '';
  try {
    const data = JSON.stringify({ url });
    const response = (await axios.request({
      method: 'post',
      url: process.env.SCRAP_URL,
      headers: {
        'Content-Type': 'application/json'
      },
      data: data
    })).data;
    console.log("Url scrapped :", url);
    return { response, brokenUrl, url, id };
  } catch (error) {
    console.error(`Error scrapping urls: ${url}`);
    brokenUrl = url
    return { response: null, brokenUrl, url, id };
  }
}

// Process URLs in batches of 10 and save responses
async function processInBatches(data: { id: string; url: string }[]): Promise<any[]> {
  try {
    const responses: any[] = [];
    const promiseArr1: any[] = [];
    const promiseArr2: any[] = [];
    const brokenUrls: string[] = [];
    const urls: { url: string; id: string }[] = [];
    data.forEach((item: { url: string; id: string }) => promiseArr1.push(scrapUrl(item.url, item.id)));

    const responseArr1 = await Promise.all(promiseArr1);
    responseArr1.forEach((res: any) => {
      if (res.brokenUrl && res.brokenUrl.length) {
        brokenUrls.push(res.brokenUrl);
      } else {
        urls.push({ url: res.url, id: res.id });
      }
    });

    urls.forEach(({ url, id }: { url: string; id: string }) => promiseArr2.push(generateDescription(url, id)));

    const responseArr2 = await Promise.all(promiseArr2);
    responseArr2.forEach((res: any) => {
      responses.push({
        id: res.id,
        meta_title: res.data.meta_title,
        url: res.url,
        meta_description: res.data.meta_description,
        product_description: res.data.product_description,
        key_features: res.data.key_features,
        specifications: res.data.specifications
      });
    });
    return responses;
  } catch (error) {
    console.log("====err", { error });
    return [];
  }
}

// Main execution
async function main() {
  try {
    const filePath = join('src/public', 'shopify_products.csv');
    const outputPath = join(cwd(), 'src/public/updated_shopify_products.csv');

    // Read and prepare the data
    let data = await readCSV(filePath);
    data = data.slice(0, 21); // Adjust range as needed
    const batches: any[] = [];
    const allResponses: any[] = [];

    // Split data into batches of 10
    for (let i = 0; i < data.length; i += 10) {
      batches.push(data.slice(i, i + 10));
    }

    // Process each batch
    for (let urlList of batches) {
      const responses: any[] = await processInBatches(urlList);

      console.log('Batch responses length: === ', responses.length);
      allResponses.push(...responses);

      // Optional: Add a delay between batches
      await new Promise((resolve) => setTimeout(resolve, 5000));
      console.log('5 seconds wait over');
    }

    // Convert all collected responses to CSV
    const csv = parse(allResponses, {
      fields: ["id", "meta_title", "url", "meta_description", "product_description", "key_features", "specifications"],
    });

    // Write the CSV file with all responses
    writeFileSync(outputPath, csv);
    console.log('All responses saved to updated_shopify_products.csv');
  } catch (error) {
    console.error('Error in processing:', error);
  }
}

main()
