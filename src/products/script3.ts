import { shopify } from "../services/shopifyApi";
import fs, { createReadStream } from 'fs';
import csvParser from 'csv-parser';


// Function to read CSV file
function readCSV(filePath: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const rows: any[] = [];

    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on('data', (row: any) => {

        rows.push(row);
      })
      .on('end', () => {
        console.log('Total rows read:', rows.length);
        resolve(rows);
      })
      .on('error', (error: any) => {
        console.error('Error reading CSV:', error); // Debug: Log errors
        reject(error);
      });
  });
}


async function fetchAllProducts() {
  let products: any[] = [];
  let params = { limit: 250 }; // Shopify max limit is 250 per request

  do {
    const response = await shopify.product.list(params);
    products = products.concat(response);
    params = response.nextPageParameters;
  } while (params);

  return products;
}

// Function to update a single product
async function updateProduct(productId: number, updateData: { body_html: any; }, metafields: { key: string; value: any; type: string; }[]) {
  try {
    // Update core product data
    await shopify.product.update(productId, updateData);

    // Update metafields
    for (const metafield of metafields) {


      await shopify.metafield.create({
        namespace: 'custom',
        owner_resource: 'product',
        owner_id: productId,
        ...metafield
      });
    }
    console.log(`Product ${productId} updated successfully!`);
  } catch (error: any) {
    console.error(`Failed to update product ${productId}:`, error.message, error.response.body.errors);
  }
}

// Main function to update product data
async function updateProductData() {
  try {
    // Step 1: Read CSV data and format it
    const csvData: any = await readCSV('src/public/updated_shopify_products.csv'); // Replace with your CSV file path
    const uniqueData = csvData.filter((item: any, index: number, self: any) =>
      index === self.findIndex((t: any) => t.id === item.id)
    );

    console.log(uniqueData.length)

    const shopifyProducts = await fetchAllProducts();


    const updates = [];
    for (const row of uniqueData) {
      const shopifyProduct = shopifyProducts.find((p) => p.id.toString() === row.id);

      if (shopifyProduct) {
        // Prepare update data
        const updateData = {
          title: row.meta.title,
          body_html: row.product_description
        };

        const metafields = [
          {
            key: 'productDescription',
            value: row.meta_description,
            type: 'single_line_text_field',
          },
          {
            key: 'productKeyfeatures',
            value: row.key_features,
            type: 'multi_line_text_field',
          },
          {
            key: 'productSpecification',
            value: row.specifications,
            type: 'single_line_text_field',
          },


        ];

        updates.push({ productId: shopifyProduct.id, updateData, metafields });
      }
    }

    if (updates.length > 0) {
      const { productId, updateData, metafields } = updates[0];
      const updatedProduct = await updateProduct(productId, updateData, metafields);
      console.log('Updated product:', updatedProduct);
    } else {
      console.log('No updates to process.');
    }
    // // Step 4: Process updates in batches
    // const batchSize = 50; // Adjust as needed to avoid hitting rate limits
    // for (let i = 0; i < updates.length; i += batchSize) {
    //   const batch = updates.slice(i, i + batchSize);
    //   await Promise.all(
    //     batch.map(({ productId, updateData, metafields }) =>
    //       updateProduct(productId, updateData, metafields)
    //     )
    //   );
    // }

    // console.log('All products updated successfully!');
  } catch (error: any) {
    console.error('Error updating product data:', error.message);
  }
}

// Run the update process
updateProductData();
