import express from 'express';
import * as logs from '../utils/logger.js';
import * as ACCOUNT from "../utils/account.js";
// import * as SHOPEE from '../utils/shopee/shopee.js'; // Bỏ comment khi cần dùng
import { MongoDB } from '../utils/DB.js';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_DBNAME = process.env.MONGODB_DBNAME;
const router = express.Router();

// Middleware xác thực (Auth Required) cho các route sản phẩm
const requireAuth = async (req, res, next) => {
  const userID = await ACCOUNT.getUserFromToken(req);

  if (!userID) {
    return res.status(401).send({
      code: -1,
      message: "Yêu cầu đăng nhập để truy cập tài nguyên này."
    });
  }

  req.userID = userID;
  next();
};

// Áp dụng middleware xác thực cho tất cả các route trong file này
router.use(requireAuth);

// [GET] /product/list - Lấy danh sách sản phẩm
router.get('/list', async (req, res) => {
    logs.log(`[Product] Lấy danh sách sản phẩm cho UserID: ${req.userID}`);
    const db = new MongoDB(MONGO_DBNAME);
    try {
        // Kết nối đến cơ sở dữ liệu
        await db.connect();

        // Lấy danh sách sản phẩm từ collection 'product-origin'
        const productList = await db.select('product-origin');

        logs.log(`[Product] Tìm thấy ${productList.length} sản phẩm.`);
        res.status(200).json({ code: 0, message: "Lấy danh sách sản phẩm thành công", data: productList });
    } catch (error) {
        logs.log(`[Product] Lỗi khi lấy danh sách sản phẩm: ${error.message}`, 'ERROR');
        res.status(500).json({ code: -1, message: "Lỗi máy chủ nội bộ khi lấy danh sách sản phẩm." });
    } finally {
        // Luôn đảm bảo ngắt kết nối DB sau khi hoàn tất
        if (db) {
            await db.disconnect();
        }
    }
});

export default router;