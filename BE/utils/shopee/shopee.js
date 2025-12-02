import crypto from 'crypto'
import dotenv from 'dotenv';
dotenv.config();

import * as auth from "../../router/shopee/auth.js"
import * as shop from "../../router/shopee/shop.js"

export async function authenticateApp(NGROK_URL){
	return await auth.authentication(NGROK_URL);
}

export function getSign(partnerKey, baseString){
	return crypto.createHmac('sha256', partnerKey).update(baseString).digest('hex');
}

export async function getShopInfo(access_token, shop_id){
	shop.getShopInfo(access_token, shop_id);
}

export async function saveShopData(data){
	shop.saveShopInfoToDB(data);
}

export async function getAccessToken(code, shop_id){
	// Lấy code và shop_id từ query
	try {
		// Bước 1: Gọi hàm tiện ích getAccessToken để lấy token
		const tokenResponse = await auth.getAccessToken(code, shop_id);
		const { access_token, refresh_token, expire_in } = tokenResponse;

		// Bước 2: Gọi hàm tiện ích getShopInfo để lấy thông tin chi tiết
		const shopInfoResponse = await shop.getShopInfo(access_token, shop_id);

		const shopProfileResponse = await shop.getShopProfile(access_token, shop_id);

		const shopWareHouseresponse = await shop.getWarehouse(access_token, shop_id);

		// Bước 3: Tạo đối tượng dữ liệu đầy đủ
		const shopeeData = {
			shop_id: shop_id,
			access_token: access_token,
			refresh_token: refresh_token,
			expires_at: Date.now() + expire_in * 1000,
			shop_details: {info: shopInfoResponse, profile: shopProfileResponse, warehouse: shopWareHouseresponse}
		};
		
		// Bước 4: Gọi hàm tiện ích để lưu vào database
		await shop.saveShopInfoToDB(shopeeData);
		
		console.log(`Liên kết thành công với shop: ${shopInfoResponse.shop_name} (ID: ${shop_id})`);
		
		// Bước 5: Gửi phản hồi cuối cùng cho người dùng
		return true;
	} catch (error) {
		console.error('Lỗi khi xử lý callback từ Shopee:', error);
		return false;
	}
}

export async function getShopData(){
	var data =  await shop.getShopDataFromDB();

	var list_shop_data = data.reduce((acc, currentShop) => {
        // Gán shop_id làm key và shop_details làm value cho đối tượng
        acc[currentShop.shop_id] = currentShop.shop_details;
        return acc;
    }, {}); // {} là giá trị khởi tạo ban đầu cho acc

	console.log(list_shop_data);
	return list_shop_data;
}