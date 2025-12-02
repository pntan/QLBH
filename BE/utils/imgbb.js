// File: imgbb.js
// Mục đích: Cung cấp các hàm tiện ích để tương tác với API của ImgBB.

import axios from 'axios';
import dotenv from 'dotenv';
import {
  URLSearchParams
} from 'url';

dotenv.config();

const ImgBB_API_KEY = process.env.IMGBB_API_KEY;
const API_URL = 'https://api.imgbb.com/1/upload';

/**
 * Tải ảnh lên ImgBB bằng dữ liệu base64.
 * @param {string} imageData - Dữ liệu ảnh dưới dạng chuỗi base64.
 * @param {string} [fileName=''] - Tên tùy chọn cho file.
 * @returns {Promise<string>} URL của ảnh đã được tải lên.
 * @throws {Error} Nếu quá trình tải lên thất bại.
 */
export async function uploadImage(imageData, fileName = '') {
  if (!ImgBB_API_KEY) {
    throw new Error("IMGBB_API_KEY chưa được cấu hình trong file .env.");
  }

  try {
    const formData = new URLSearchParams();
    formData.append('key', ImgBB_API_KEY);
    formData.append('image', imageData.split(';base64,').pop());

    if (fileName) {
      formData.append('name', fileName);
    }

    const response = await axios.post(
      API_URL,
      formData.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    if (response.data.success) {
      return response.data.data.url;
    } else {
      throw new Error(response.data.error.message || "Tải ảnh lên ImgBB thất bại.");
    }
  } catch (error) {
    console.error("❌ Lỗi khi tải ảnh lên ImgBB:", error.response?.data || error.message);
    throw new Error("Không thể tải ảnh lên ImgBB. Vui lòng thử lại sau.");
  }
}