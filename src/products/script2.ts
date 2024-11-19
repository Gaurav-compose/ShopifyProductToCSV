import fs from 'fs';
import path from 'path';
import csvParser from 'csv-parser';
import axios from 'axios';

// Read CSV and extract id, url
async function readCSV(filePath: string): Promise<{ id: string; url: string }[]> {
  const results: { id: string; url: string }[] = [];
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on('data', row => row.id && row.url && results.push({ id: row.id, url: row.url }))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

// Post URL to API and return response
async function generateDescription(url: string) {
  try {
    const { data } = await axios.post('https://raqx7z2owrogcpjfryd7hr5yhu0adjem.lambda-url.ap-southeast-2.on.aws/', { url });
    return data;
  } catch (error) {
    console.error(`Error posting URL: ${url}`, error);
    return null;
  }
}

// Process URLs in batches of 10 and save responses
async function processInBatches(data: { id: string; url: string }[]) {
  const responses = [];
  for (let i = 0; i < data.length
    ; i += 1) {
    const batch = data.slice(i, i + 1);
    for (const { id, url } of batch) {
      const response = await generateDescription(url);
      responses.push({ id, response });
    }
    console.log(`Processed batch ${Math.floor(i / 10) + 1}`);
  }
  return responses;
}

// Main execution
async function main() {
  try {
    const filePath = path.join( 'src/public', 'shopify_products.csv');
    const data = await readCSV(filePath);
    const responses = await processInBatches(data);

    console.log('All responses:', responses);
    fs.writeFileSync(path.join( 'src/public', 'responses.json'), JSON.stringify(responses, null, 2));
    console.log('Responses saved to responses.json');
  } catch (error) {
    console.error('Error in processing:', error);
  }
}

main();
