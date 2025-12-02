// account.js

import { MongoDB } from "./DB.js";
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken'; // Rất quan trọng, phải thêm dòng này

import * as AUTH from "../router/auth.js"

dotenv.config();

const MONGO_DBNAME = process.env.MONGODB_DBNAME;
const JWT_SECRET = process.env.JWT_SECRET; // Rất quan trọng, phải có dòng này
const collectionName = "account";

const db = new MongoDB(MONGO_DBNAME);

// Hàm kết nối DB
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

// Hàm này sẽ trả về userID, nếu không hợp lệ sẽ là null
export async function getUserFromToken(req) {
  const accessToken = req.cookies.accessToken;
  if (!accessToken) return null;

  try {
    const decoded = jwt.verify(accessToken, JWT_SECRET);
    return decoded.id;
  } catch (error) {
    console.error("Lỗi giải mã token:", error.message);
    return null;
  }
}

// Hàm lấy tất cả người dùng (đã sửa)
export async function getUsers(select = {}) {
	try {
		await db.connect();
		var account = await db.select(collectionName, select);
		return account;
	} catch (error) {
		console.error('Lỗi khi lấy dữ liệu tài khoản:', error);
		throw error;
	} finally {
		await db.disconnect();
	}
}

// Hàm xử lý route API để lấy thông tin tài khoản
export async function getAccountInfo(req, res) {
	// Sửa: Dùng await để lấy userID từ hàm helper
	var userID = await getUserFromToken(req, res);

	if (!userID) {
		return res.status(401).json({ code: -1, message: "Không thể xác thực người dùng" });
	}

	// Lấy dữ liệu user từ DB
	const user = await withDB(async () => {
		const result = await db.select(collectionName, { userID: userID });
		return result[0] || null;
	});

	if (user) {
		// Xóa các trường nhạy cảm trước khi gửi về client
		const { password, refreshTokens, ...safeUserData } = user;
		return res.status(200).json({ code: 0, message: "Thành công", data: safeUserData });
	} else {
		return res.status(404).json({ code: -1, message: "Không tìm thấy thông tin người dùng" });
	}
}

export async function getDisplayName(req) {
  const userID = await getUserFromToken(req);
  if (!userID) return null;

  const user = await withDB(async () => {
    const result = await db.select(collectionName, { userID });
    return result[0] || null;
  });

  if (!user) return null;
  return user.displayname || user.username || user.email || null;
}