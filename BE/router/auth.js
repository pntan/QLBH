import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { log } from '../utils/logger.js';
import dotenv from 'dotenv';
import { MongoDB } from "../utils/DB.js";
import crypto from 'crypto';
import cookieParser from 'cookie-parser';

// ---- Load env trước khi đọc process.env ----
dotenv.config();

// ---- Định danh file/dir & path file JSON dự phòng ----
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const usersFilePath = path.join(__dirname, '..', 'DATABASE', 'account.json');

// ---- Env & DB ----
const MONGO_DBNAME = process.env.MONGODB_DBNAME;
const collectionName = "account";
// Giả định instance db này được tái sử dụng
const db = new MongoDB(MONGO_DBNAME); 

const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;

if (!JWT_SECRET || !REFRESH_TOKEN_SECRET) {
  log('JWT_SECRET hoặc REFRESH_TOKEN_SECRET không được định nghĩa.', 'ERROR');
}

// ----------------------------------------------------
// 🔥 SỬA LỖI TOPOLOGY IS CLOSED: LOẠI BỎ db.disconnect()
// ----------------------------------------------------
async function withDB(callback) {
  try {
    // Chỉ kết nối lại nếu chưa kết nối (giả định MongoDB class handle pool)
    // Nếu vẫn bị lỗi, bạn nên thiết lập kết nối toàn cục ở app.js
    await db.connect(); 
    return await callback();
  } catch (error) {
    // Sử dụng console.error để tránh lỗi next is not a function từ logger.js
    console.error(`Lỗi khi thao tác với MongoDB: ${error.message}`); 
    throw error;
  } 
  // 🚨 ĐÃ LOẠI BỎ: finally { await db.disconnect(); } 
  // Bạn cần đảm bảo đã gọi db.connect() 1 lần duy nhất trong app.js 
  // và gọi db.disconnect() khi ứng dụng tắt (ví dụ: trong process.on('SIGINT'))
}
// ----------------------------------------------------

// ---- Tạo ID người dùng ổn định (Giữ nguyên) ----
function generateUserID(prefix, email) {
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  const timestamp = Date.now();
  const hashInput = `${email}${timestamp}${Math.random()}`;
  const hashPart = crypto.createHash('sha256').update(hashInput).digest('hex').substring(0, 5).toUpperCase();
  return `${prefix}-${randomPart}-${hashPart}`;
}

// ---- Sinh access & refresh token (Giữ nguyên) ----
function generateTokens(user) {
  const payload = { id: user.userID, username: user.username };
  
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign(payload, REFRESH_TOKEN_SECRET, { expiresIn: '7d' });
  
  return { accessToken, refreshToken };
}

// ---- Helper: Phản hồi thành công (Giữ nguyên) ----
function getSafeUser(user) {
    const { password, refreshTokens, ...safeUser } = user;
    return safeUser;
}

function sendAuthSuccessResponse(res, user, newAccessToken = null) {
    const responseData = {
        user: getSafeUser(user)
    };
    if (newAccessToken) {
        responseData.accessToken = newAccessToken; 
    }

    return res.status(200).json({
        code: 200,
        message: "Người dùng đã xác thực",
        data: responseData
    });
}

// ========================= HANDLERS =========================

// Hàm REGISTER: (Giữ nguyên)
export async function register(req, res) {
  const { username, password, email } = req.body;

  if (!username || !password || !email) {
    return res.status(400).json({ code: 400, message: 'Tên người dùng, mật khẩu và email không được để trống.', data: null });
  }

  try {
    let response = { code: 200, message: 'Đăng ký thành công!', data: null };

    await withDB(async () => {
      const existingUsers = await db.select(collectionName, { $or: [{ username }, { email }] });

      if (existingUsers.length > 0) {
        response = { code: 409, message: 'Tên người dùng hoặc email đã tồn tại.', data: null };
        return;
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const userID = generateUserID("USER", email);
      const newUser = { userID, username, password: hashedPassword, email, refreshTokens: [] };
      await db.insert(collectionName, newUser);
    });

    return res.status(response.code).json(response);
  } catch (error) {
    console.error('Lỗi đăng ký:', error);
    return res.status(500).json({ code: 500, message: 'Lỗi server khi đăng ký.', data: null });
  }
}

// Hàm LOGIN: (Giữ nguyên)
export async function login(req, res) {
  const { username, password, deviceInfo } = req.body;
  const identifier = username; 

  if (!identifier || !password) {
    return res.status(400).json({ code: 400, message: 'Tên người dùng/email và mật khẩu không được để trống.', data: null });
  }

  const client_user_pass = password;

  try {
    let issuedTokens = null;
    let userData = null;
    let authErrorResponse = null; 

    await withDB(async () => {
      const users = await db.select(collectionName, { $or: [{ username: identifier }, { email: identifier }] });
      const user = users[0];

      if (!user) {
        authErrorResponse = { code: 401, message: 'Tên người dùng/email hoặc mật khẩu không đúng.', data: null };
        return;
      }

      if (!user.password) {
        authErrorResponse = { code: 500, message: 'Lỗi server: Cấu trúc tài khoản không hợp lệ.', data: null };
        return;
      }

      const isMatch = await bcrypt.compare(client_user_pass, user.password);

      if (!isMatch) {
        authErrorResponse = { code: 401, message: 'Tên người dùng/email hoặc mật khẩu không đúng.', data: null };
        return;
      }

      const { accessToken, refreshToken } = generateTokens(user);

      const device = { token: refreshToken, ip: req.ip, lastLogin: new Date().toISOString(), ...deviceInfo };
      await db.update(collectionName, { userID: user.userID }, { $push: { refreshTokens: device } });

      issuedTokens = { accessToken, refreshToken };
      const { password, refreshTokens, ...safeUser } = user;
      userData = safeUser;
    });
    
    if (authErrorResponse) {
        return res.status(authErrorResponse.code).json(authErrorResponse);
    }

    if (issuedTokens) {
      const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' };
      
      res.cookie('accessToken', issuedTokens.accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 }); // 15 phút
      res.cookie('refreshToken', issuedTokens.refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 }); // 7 ngày

      return res.json({ code: 200, message: 'Đăng nhập thành công!', data: { user: userData, accessToken: issuedTokens.accessToken } });
    }

    return res.status(500).json({ code: 500, message: 'Lỗi server: Không thể tạo token (Lỗi logic nội bộ).', data: null });

  } catch (error) {
    console.error('Lỗi đăng nhập:', error);
    return res.status(500).json({ code: 500, message: 'Lỗi server khi đăng nhập.', data: null });
  }
}

// Hàm AUTH_REQUIRED: (Giữ nguyên)
export function authRequired(exclude = []) {
  return (req, res, next) => {
    if (exclude.some(path => req.path.startsWith(path))) {
      return next();
    }
    return authenticate(req, res, next);
  };
}

// Hàm AUTHENTICATE: (Đã sửa để luôn trả về response và không dùng next() khi thành công)
export async function authenticate(req, res, next) {
  const accessToken = req.cookies.accessToken;
  const refreshToken = req.cookies.refreshToken;

  if (!accessToken && !refreshToken) {
    return res.status(401).json({ code: 401, message: "ACCESS_DENIED: Vui lòng đăng nhập để tiếp tục.", data: null });
  }

  // 1. Kiểm tra Access Token (Ưu tiên)
  if (accessToken) {
    try {
      const decoded = jwt.verify(accessToken, JWT_SECRET);
      
      // ✅ AT hợp lệ: TRẢ VỀ RESPONSE TRỰC TIẾP
      const userID = decoded.id;
      const users = await withDB(() => db.select(collectionName, { userID }));
      const user = users[0];
      
      if (user) {
        return sendAuthSuccessResponse(res, user);
      }
      
    } catch (error) {
      if (error.name !== "TokenExpiredError") {
        console.error(`Access token lỗi (Invalid): ${error.message}`); 
        return res.status(403).json({ code: 403, message: "INVALID_ACCESS_TOKEN: Vui lòng đăng nhập lại.", data: null });
      }
    }
  }

  // 2. Kiểm tra Refresh Token (Nếu AT hết hạn hoặc user không tồn tại)
  if (refreshToken) {
    try {
      let decoded;
      try {
        decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
      } catch (error) {
        if (error.name === "TokenExpiredError") {
          // RT hết hạn, gọi hàm làm mới RT/AT, hàm này sẽ tự trả về response.
          return handleExpiredRefreshToken(req, res, next, refreshToken); 
        }
        throw error; // Lỗi khác (Invalid)
      }

      const userID = decoded.id;
      const users = await withDB(() => db.select(collectionName, { userID }));
      const user = users[0];

      if (!user) {
        res.clearCookie("accessToken");
        res.clearCookie("refreshToken");
        return res.status(401).json({ code: 401, message: "USER_NOT_FOUND: Phiên đã hết hạn, vui lòng đăng nhập lại.", data: null });
      }

      const deviceToken = user.refreshTokens?.find(d => d.token === refreshToken);
      if (!deviceToken) {
        res.clearCookie("accessToken");
        res.clearCookie("refreshToken");
        return res.status(401).json({ code: 401, message: "SESSION_REVOKED: Phiên đã bị thu hồi/hết hạn, vui lòng đăng nhập lại.", data: null });
      }

      // RT hợp lệ, cấp Access Token mới
      const { accessToken: newAccessToken } = generateTokens(user);

      res.cookie("accessToken", newAccessToken, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", maxAge: 15 * 60 * 1000 });

      // ✅ RT hợp lệ, cấp AT mới: TRẢ VỀ RESPONSE TRỰC TIẾP
      return sendAuthSuccessResponse(res, user, newAccessToken);
      
    } catch (error) {
      console.error(`Lỗi refresh token: ${error.message}`); 
      res.clearCookie("accessToken");
      res.clearCookie("refreshToken");
      return res.status(401).json({ code: 401, message: "INVALID_REFRESH_TOKEN: Phiên đã hết hạn, vui lòng đăng nhập lại.", data: null });
    }
  }

  // 3. Trường hợp không có token nào hoạt động
  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");
  return res.status(401).json({ code: 401, message: "ACCESS_DENIED: Vui lòng đăng nhập để tiếp tục.", data: null });
}

// ---- Helper: handleExpiredRefreshToken (Đã sửa để không dùng next() khi thành công) ----
async function handleExpiredRefreshToken(req, res, next, oldRefreshToken) {
  try {
    let user = null;
    await withDB(async () => {
      const users = await db.select(collectionName, { "refreshTokens.token": oldRefreshToken });
      user = users[0] || null;
    });

    if (!user) {
      res.clearCookie("accessToken");
      res.clearCookie("refreshToken");
      return res.status(401).json({ code: 401, message: "USER_NOT_FOUND: Phiên đã hết hạn và không thể làm mới.", data: null });
    }

    const { accessToken: newAccessToken, refreshToken: newRefreshToken } = generateTokens(user);

    await withDB(() =>
      db.update(
        collectionName, { userID: user.userID, "refreshTokens.token": oldRefreshToken }, 
        { $set: { "refreshTokens.$.token": newRefreshToken, "refreshTokens.$.lastLogin": new Date().toISOString() } }
      )
    );

    const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict" };
    
    res.cookie("accessToken", newAccessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
    res.cookie("refreshToken", newRefreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });

    // ✅ Cấp RT mới thành công: TRẢ VỀ RESPONSE TRỰC TIẾP
    return sendAuthSuccessResponse(res, user, newAccessToken); 

  } catch (error) {
    console.error(`Lỗi khi cấp refresh token mới: ${error.message}`); 
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
    return res.status(500).json({ code: 500, message: "SERVER_ERROR: Lỗi hệ thống khi làm mới phiên, vui lòng đăng nhập lại.", data: null });
  }
}

// Hàm GET_USER_FROM_TOKEN: (Giữ nguyên)
export async function getUserFromToken(req, res) { 
    const accessToken = req.cookies.accessToken;
    const refreshToken = req.cookies.refreshToken;
    let userID = null;

    if (!accessToken && !refreshToken) {
        return res.status(200).json({ code: 200, message: "No active user session.", data: { user: null } });
    }

    if (accessToken) {
        try {
            const decoded = jwt.verify(accessToken, JWT_SECRET);
            userID = decoded.id;
        } catch (error) { }
    }
    
    if (userID === null && refreshToken) {
         try {
            const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
            userID = decoded.id;
        } catch (error) { }
    }

    if (userID) {
        try {
            const users = await withDB(() => db.select(collectionName, { userID }));
            const user = users[0];
            if (user) {
                const { password, refreshTokens, ...safeUser } = user;
                return res.status(200).json({ code: 200, message: "Active user session.", data: { user: safeUser } });
            }
        } catch (error) {
             console.error(`Lỗi DB khi tìm user: ${error.message}`);
        }
    }

    return res.status(200).json({ code: 200, message: "Invalid or expired access token.", data: { user: null } });
}


// Hàm LOGOUT: (Giữ nguyên)
export async function logout(req, res) {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (refreshToken) {
      await withDB(async () => {
        try {
          const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
          await db.update(collectionName, { userID: decoded.id }, { $pull: { refreshTokens: { token: refreshToken } } });
        } catch (jwtError) {
          console.warn(`Lỗi khi giải mã refresh token lúc logout: ${jwtError.message}`);
        }
      });
    }

    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    return res.json({ code: 200, message: 'Đăng xuất thành công!', data: null });
  } catch (error) {
    console.error('Lỗi đăng xuất:', error);
    return res.status(500).json({ code: 500, message: 'Lỗi server khi đăng xuất.', data: null });
  }
}

// Hàm getUserIdFromSocket: (Giữ nguyên)
export function getUserIdFromSocket(socket) {
  const cookiesString = socket.handshake?.headers?.cookie;
  if (!cookiesString) return null;

  const req = { headers: { cookie: cookiesString } };
  cookieParser()(req, {}, () => {});
  const accessToken = req.cookies?.accessToken;
  if (!accessToken) return null;

  try {
    const decoded = jwt.verify(accessToken, JWT_SECRET);
    return decoded.id;
  } catch (error) {
    console.error("Lỗi xác thực Socket.IO:", error.message);
    return null;
  }
}