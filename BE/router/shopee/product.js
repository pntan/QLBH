// router/shopee/product.js
import axios from "axios";
import dotenv from "dotenv";
import * as SHOPEE from "../../utils/shopee/shopee.js";

dotenv.config();

const partnerId = process.env.PARTNER_ID;
const partnerKey = process.env.PARTNER_KEY;
const apiURL = process.env.SHOPE_API_URL;

/**
 * Tạo một sản phẩm (item) mới trên Shopee
 * Đây là cấp độ sản phẩm chính (chưa có biến thể).
 */
export async function addItem(accessToken, shopId, itemData) {
  const apiPath = "/api/v2/product/add_item";
  const timestamp = Math.floor(Date.now() / 1000);

  // Chuỗi sign: partner_id + path + timestamp + access_token + shop_id
  const baseString = `${partnerId}${apiPath}${timestamp}${accessToken}${shopId}`;
  const sign = SHOPEE.getSign(partnerKey, baseString);

  const url = `${apiURL}${apiPath}`;
  const params = {
    partner_id: parseInt(partnerId),
    timestamp,
    access_token: accessToken,
    shop_id: parseInt(shopId),
    sign
  };

  try {
    const response = await axios.post(url, itemData, { params });
    return response.data;
  } catch (error) {
    console.error("❌ Lỗi khi thêm sản phẩm (item):",
      error.response ? error.response.data : error.message);
    throw error;
  }
}

/**
 * Thêm model (biến thể) cho một sản phẩm đã tồn tại.
 * Mỗi model có thể có SKU, giá và tồn kho riêng.
 */
export async function addModel(accessToken, shopId, modelData) {
  const apiPath = "/api/v2/product/add_model";
  const timestamp = Math.floor(Date.now() / 1000);

  const baseString = `${partnerId}${apiPath}${timestamp}${accessToken}${shopId}`;
  const sign = SHOPEE.getSign(partnerKey, baseString);

  const url = `${apiURL}${apiPath}`;
  const params = {
    partner_id: parseInt(partnerId),
    timestamp,
    access_token: accessToken,
    shop_id: parseInt(shopId),
    sign
  };

  try {
    const response = await axios.post(url, modelData, { params });
    return response.data;
  } catch (error) {
    console.error("❌ Lỗi khi thêm model (biến thể):",
      error.response ? error.response.data : error.message);
    throw error;
  }
}
