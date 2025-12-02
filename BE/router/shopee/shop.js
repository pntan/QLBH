import axios from 'axios';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import * as SHOPEE from "../../utils/shopee/shopee.js";
import { MongoDB } from '../../utils/DB.js';

dotenv.config();

const SHOPEE_PARTNER_ID = process.env.PARTNER_ID;
const SHOPEE_PARTNER_KEY = process.env.PARTNER_KEY;
const apiURL = process.env.SHOPE_API_URL

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const shopeeDataPath = path.join(__dirname, '..', '..', 'DATABASE', 'shopee-shop-data.json');

const MONGODB_DBNAME = process.env.MONGODB_DBNAME || 'your_app_db';
const shopeeCollectionName = 'shopee-shops';

const db = new MongoDB(MONGODB_DBNAME);

async function withDB(callback) {
    try {
        await db.connect();
        return await callback();
    } catch (error) {
        console.error('Lỗi khi thao tác với MongoDB:', error);
        throw error;
    } finally {
        await db.disconnect();
    }
}

/**
 * Hàm lấy thông tin chi tiết của shop từ Shopee
 * @param {string} accessToken Token truy cập của shop
 * @param {number} shopId ID của shop
 * @returns {Promise<object>} Dữ liệu thông tin shop từ Shopee
 */
export async function getShopInfo(accessToken, shopId) {
	const apiPath = '/api/v2/shop/get_shop_info';
	const host = `${apiURL}`;
	const timestamp = Math.floor(Date.now() / 1000);

	// Chuỗi cơ sở để tạo chữ ký cho API GET
	// Cấu trúc: partner_id + path + timestamp + access_token + shop_id
	const baseString = `${SHOPEE_PARTNER_ID}${apiPath}${timestamp}${accessToken}${shopId}`;
	const sign = SHOPEE.getSign(SHOPEE_PARTNER_KEY, baseString);

	const params = {
		partner_id: parseInt(SHOPEE_PARTNER_ID),
		timestamp: timestamp,
		shop_id: parseInt(shopId),
		access_token: accessToken,
		sign: sign
	};

	try {
		const response = await axios.get(`${host}${apiPath}`, { params });
		// Dữ liệu trả về sẽ bao gồm shop_name, region, status, create_time, v.v.
		return response.data;
	} catch (error) {
		console.error('Lỗi khi lấy thông tin shop từ Shopee:', error.response ? error.response.data : error.message);
		throw new Error('Không thể lấy thông tin shop từ Shopee.');
	}
}

export async function getShopProfile(accessToken, shopId){
	const apiPath = '/api/v2/shop/get_profile';
	const host = `${apiURL}`;
	const timestamp = Math.floor(Date.now() / 1000);

	const baseString = `${SHOPEE_PARTNER_ID}${apiPath}${timestamp}${accessToken}${shopId}`;
	const sign = SHOPEE.getSign(SHOPEE_PARTNER_KEY, baseString);

	const params = {
		partner_id: parseInt(SHOPEE_PARTNER_ID),
		timestamp: timestamp,
		shop_id: parseInt(shopId),
		access_token: accessToken,
		sign: sign
	};

	try {
		const response = await axios.get(`${host}${apiPath}`, { params });
		return response.data.response;
	} catch (error) {
		console.error('Lỗi khi lấy thông tin shop từ Shopee:', error.response ? error.response.data : error.message);
		throw new Error('Không thể lấy thông tin shop từ Shopee.');
	}
}

export async function getWarehouse(accessToken, shopId){
	const apiPath = '/api/v2/shop/get_warehouse_detail';
	const host = `${apiURL}`;
	const timestamp = Math.floor(Date.now() / 1000);

	const baseString = `${SHOPEE_PARTNER_ID}${apiPath}${timestamp}${accessToken}${shopId}`;
	const sign = SHOPEE.getSign(SHOPEE_PARTNER_KEY, baseString);

	var warehose = [];

	for(var i = 1; i <= 2; i++){
		const params = {
			partner_id: parseInt(SHOPEE_PARTNER_ID),
			timestamp: timestamp,
			shop_id: parseInt(shopId),
			access_token: accessToken,
			sign: sign,
			warehouse_type: i
		};

		try {
			const response = await axios.get(`${host}${apiPath}`, { params });
			warehose.push(response.data);
		} catch (error) {
			console.error('Lỗi khi lấy thông tin shop từ Shopee:', error.response ? error.response.data : error.message);
			throw new Error('Không thể lấy thông tin shop từ Shopee.');
		}
	}	
	
	return warehose;
}

/**
 * Đọc dữ liệu từ file shopee-data.json
 * @returns {Promise<Array>} Mảng dữ liệu shop, hoặc mảng rỗng nếu file chưa tồn tại
 */
export async function getShopDataFromDB() {
    return await withDB(async () => {
        const shops = await db.select(shopeeCollectionName, {});
        return shops;
    });
}

/**
 * Lưu thông tin shop vào file, nếu ID đã có thì cập nhật, chưa thì thêm mới
 * @param {object} newShopData Dữ liệu shop mới (bao gồm shop_id)
 */
export async function saveShopInfoToDB(newShopData) {
    await withDB(async () => {
        const shopId = String(newShopData.shop_id);
        const existingShop = await db.select(shopeeCollectionName, { shop_id: shopId });

        if (existingShop.length > 0) {
            await db.update(shopeeCollectionName, { shop_id: shopId }, newShopData);
            console.log(`Đã cập nhật thông tin shop_id: ${shopId}`);
        } else {
            await db.insert(shopeeCollectionName, { ...newShopData, shop_id: shopId });
            console.log(`Đã thêm mới thông tin shop_id: ${shopId}`);
        }
    });
}