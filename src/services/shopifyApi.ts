import Shopify from "shopify-api-node";
import dotenv from 'dotenv';

dotenv.config()

export const shopify = new Shopify({
    shopName: process.env.SHOPIFY_STORE_NAME as string,
    accessToken: process.env.SHOPIFY_ADMIN_ACCESS_TOKEN as string,
    apiVersion: '2024-10',
});

