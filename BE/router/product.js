import express from 'express';
import * as logs from '../utils/logger.js';
import * as ACCOUNT from "../utils/account.js";
// import * as SHOPEE from '../utils/shopee/shopee.js'; // Bỏ comment khi cần dùng
import { MongoDB } from '../utils/DB.js';
import dotenv from 'dotenv';
import { ObjectId } from 'mongodb';

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

router.delete('/delete', async (req, res) => {
  const { ids } = req.body;
  logs.log(`[Product] Yêu cầu xóa sản phẩm với IDs: ${ids} từ UserID: ${req.userID}`);

  if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ code: -1, message: "Danh sách IDs không hợp lệ." });
  }

  const db = new MongoDB(MONGO_DBNAME);
  try {
      await db.connect();

      // Chuyển đổi mảng các chuỗi ID thành mảng các ObjectId
      const objectIds = ids.map(id => new ObjectId(id));

      const deleteResult = await db.remove('product-origin', { _id: { $in: objectIds } });

      logs.log(`[Product] Đã xóa ${deleteResult.deletedCount} sản phẩm.`);
      res.status(200).json({ code: 0, message: `Đã xóa ${deleteResult.deletedCount} sản phẩm thành công.` });
  } catch (error) {
      logs.log(`[Product] Lỗi khi xóa sản phẩm: ${error.message}`, 'ERROR');
      res.status(500).json({ code: -1, message: "Lỗi máy chủ nội bộ khi xóa sản phẩm." });
  } finally {
      if (db) {
        await db.disconnect();
      }
  }
});

// [POST] /product/add - Thêm sản phẩm mới
router.post('/add', async (req, res) => {
    const productData = req.body;
    logs.log(`[Product] Yêu cầu thêm sản phẩm mới từ UserID: ${req.userID}`);

    // Validation cơ bản
    if (!productData.name || !productData.sku) {
        return res.status(400).json({ code: -1, message: "Tên sản phẩm và SKU là bắt buộc." });
    }

    const db = new MongoDB(MONGO_DBNAME);
    try {
        await db.connect();

        // Chuẩn bị dữ liệu sản phẩm mới
        const newProduct = {
            name: productData.name,
            sku: productData.sku,
            stock: Number(productData.stock) || 0,
            cost: Number(productData.cost) || 0,
            image: productData.image || '',
            createdAt: new Date(),
            createdBy: new ObjectId(req.userID) // Lưu ID người tạo
        };

        const insertedId = await db.insert('product-origin', newProduct);
        const createdProduct = await db.findOne('product-origin', { _id: insertedId });

        logs.log(`[Product] Đã thêm sản phẩm mới với ID: ${insertedId}`);
        res.status(201).json({ code: 0, message: "Thêm sản phẩm thành công", data: createdProduct });
    } catch (error) {
        logs.log(`[Product] Lỗi khi thêm sản phẩm: ${error.message}`, 'ERROR');
        res.status(500).json({ code: -1, message: "Lỗi máy chủ nội bộ khi thêm sản phẩm." });
    } finally {
        if (db) await db.disconnect();
    }
});

export default router;