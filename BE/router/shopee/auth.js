// router/shopee/auth.js
import axios from "axios"
import dotenv from 'dotenv';

import * as SHOPEE from "../..//utils/shopee/shopee.js";

dotenv.config();

const partnerId = process.env.PARTNER_ID;
const partnerKey = process.env.PARTNER_KEY;
const apiURL = process.env.SHOPE_API_URL;

export async function authentication(NGROK_URL){
	var apiPath = '/api/v2/shop/auth_partner';
	var timestamp = Math.round(new Date() / 1000);
	var baseString = `${partnerId}${apiPath}${timestamp}`;
	var sign = SHOPEE.getSign(partnerKey, baseString);
	
	const redirectUrl = `https://pntan.github.io/page/shopeeAccessCallback.html`; /* `${NGROK_URL}/shopee/accessTokenCallback`; */
	const authUrl = `${apiURL}${apiPath}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}&redirect=${redirectUrl}`;
	return authUrl;
};

export async function getAccessToken(code, shop_id){
	const apiPath = '/api/v2/auth/token/get';
	const timestamp = Math.floor(Date.now() / 1000);
	
	// Cấu trúc sign cho endpoint này: partner_id + path + timestamp + code
	const baseString = `${partnerId}${apiPath}${timestamp}`;
	const sign = SHOPEE.getSign(partnerKey, baseString); 
	
	// requestBody phải chứa code, shop_id, và partner_id
	const requestBody = {
		code: code,
		shop_id: parseInt(shop_id),
		partner_id: parseInt(partnerId)
	};
	const tokenUrl = `${apiURL}${apiPath}`;
	
	console.log("URL:", tokenUrl);
	console.log("Request Body:", requestBody);
	
	try {
		const response = await axios.post(tokenUrl, requestBody, {
			headers: { 'Content-Type': 'application/json' },
			// params (query string) chỉ cần partner_id, timestamp, và sign
			params: { 
				partner_id: parseInt(partnerId), 
				timestamp: timestamp, 
				sign: sign
			}
		});
		
		return response.data;
	} catch (error) {
		console.error('Lỗi khi đổi code lấy token từ Shopee:', error.response ? error.response.data : error.message);
		throw new Error('Không thể đổi code lấy token từ Shopee.');
	}
}