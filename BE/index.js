import express from 'express';
import http from 'http';
import { Server } from 'socket.io'; 
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import serveIndex from 'serve-index';
import ngrok from 'ngrok';
import multer from 'multer';
import * as fs from 'fs';

// ⬅️ Các Utils và Router Cần Thiết
import * as logs from './utils/logger.js'; 
import * as auth from './router/auth.js';
import productRouter from './router/product.js'; // Thêm router sản phẩm
import * as ACCOUNT from "./utils/account.js";
import { MongoDB } from "./utils/DB.js";
// import * as SHOPEE from './utils/shopee/shopee.js'; // ❌ Bỏ
// import { Octokit } from "@octokit/rest"; // ❌ Bỏ

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MONGO_DBNAME = process.env.MONGODB_DBNAME;
const db = new MongoDB(MONGO_DBNAME);

const FRONTEND_URL = process.env.FRONTEND_URL; 
const FRONTEND_ORIGINS = FRONTEND_URL ? FRONTEND_URL.split(',') : ['http://localhost:5173'];
const BACKEND_PORT = process.env.PORT || 2105;
const BACKEND_URL = `http://localhost:${BACKEND_PORT}`;

const app = express();
const server = http.createServer(app);

let NGROK_URL = BACKEND_URL; // Khởi tạo với URL cục bộ

// Khởi tạo Socket.IO
const io = new Server(server, {
	cors: {
		origin: FRONTEND_ORIGINS,
		credentials: true
	},
});

logs.clearLogFile();

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

// -----------------------------------------------------
// CẤU HÌNH MULTER (UPLOAD FILE)
// -----------------------------------------------------
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const uploadPath = 'storage/uploads'; // Đơn giản hóa thư mục lưu trữ
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function(req, file, cb) {
    // Giữ tên file gốc để đơn giản hóa ví dụ
    cb(null, file.originalname);
  }
});
const upload = multer({ storage: storage });
app.use('/storage/uploads', express.static('storage/uploads'));

// -----------------------------------------------------
// MIDDLEWARE CHUNG (CORS, HELMET, RATE LIMIT)
// -----------------------------------------------------
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

// Cấu hình CORS
const corsOptions = {
    origin: (origin, callback) => {
        if (!origin || FRONTEND_ORIGINS.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error(`Not allowed by CORS: ${origin}`));
        }
    },
    credentials: true,
};
app.use(cors(corsOptions)); 

// Cấu hình Bảo mật (Helmet)
app.use(helmet({
	// CSP được đơn giản hóa
	contentSecurityPolicy: {
		directives: {
			defaultSrc: ["'self'"],
			connectSrc: ["'self'", "wss:", ...FRONTEND_ORIGINS, BACKEND_URL, NGROK_URL], // Thêm NGROK_URL
			frameAncestors: ["'none'"],
            // Thêm các nguồn khác nếu cần
		},
	},
	xFrameOptions: { action: 'deny' },
}));

app.use(rateLimit({
	windowMs: 5 * 60 * 1000,
	max: 500
}));

const publicPath = path.join(__dirname, 'public');
if (process.env.NODE_ENV !== "production") {
	app.use("/public", serveIndex(publicPath));
}

// Middleware xác thực (Auth Required)
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

// -----------------------------------------------------
// ROUTER API CÓ XÁC THỰC VÀ MULTER
// -----------------------------------------------------
const apiRouter = express.Router();
app.use('/api', apiRouter);

// ⬅️ ÁP DỤNG MIDDLEWARE XÁC THỰC CHO TẤT CẢ ROUTE BÊN DƯỚI
apiRouter.use(requireAuth);

// Endpoint tải file (Sử dụng Multer)
apiRouter.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).send({ message: "Không tìm thấy file để tải lên." });
    }
    // Gửi thông báo real-time qua Socket.IO sau khi tải file thành công
    io.emit('file_uploaded', { 
        filename: req.file.filename, 
        userID: req.userID,
        url: `${NGROK_URL}/storage/uploads/${req.file.filename}` 
    });

    res.status(200).send({ 
        message: "Tải file lên thành công.", 
        filename: req.file.filename 
    });
});

// Endpoint ví dụ Dashboard
apiRouter.get('/dashboard/data', async (req, res) => {
  logs.log(`Lấy dữ liệu dashboard cho UserID: ${req.userID}`);
  res.json({
    message: "Dữ liệu Dashboard đã được xác thực",
    userID: req.userID,
    timestamp: new Date().toISOString()
  });
});

// -----------------------------------------------------
// ROUTER AUTH CÓ XÁC THỰC VÀ MULTER
// -----------------------------------------------------
const apiAuth = express.Router();
app.use("/auth", apiAuth);

// Xác thực người dùng
apiAuth.post("/authenticated", async (req, res) => {
  logs.log(`Kiểm tra đăng nhập`);
  auth.authenticate(req, res);
})

// Đăng nhập
apiAuth.post("/signin", async (req, res) => {
  logs.log("Đăng nhập");
  auth.login(req, res);
})

// Đăng xuất
apiAuth.post("/logout", async (req, res) => {
  logs.log("Đăng xuất");
  auth.logout(req, res);
})

// -----------------------------------------------------
// ROUTER PRODUCT
// -----------------------------------------------------
app.use("/product", productRouter);


// -----------------------------------------------------
// SOCKET.IO (XỬ LÝ KẾT NỐI REAL-TIME)
// -----------------------------------------------------
io.on('connection', function(socket) {
	logs.log(`Socket.IO client connected: ${socket.id}`, 'INFO');
    
    // Ví dụ: Lắng nghe sự kiện từ client
    socket.on('send_message', (data) => {
        logs.log(`Nhận tin nhắn từ client: ${data.text}`);
        // Phát lại tin nhắn tới tất cả client khác (trừ người gửi)
        socket.broadcast.emit('new_message', { user: 'Server', text: data.text }); 
    });

	socket.on('disconnect', () => {
		logs.log(`Socket.IO client disconnected: ${socket.id}`, 'INFO');
	});
});


// -----------------------------------------------------
// KHỞI ĐỘNG SERVER VÀ NGROK
// -----------------------------------------------------
server.listen(BACKEND_PORT, async () => {
	logs.log(`Chương trình đang chạy ở cổng ${BACKEND_PORT}!`);
	logs.log(`Server đang khởi động...`);
	try {
		const listener = await ngrok.connect({
			addr: BACKEND_PORT
		});
		logs.log(`${listener}`);
		NGROK_URL = listener; // Cập nhật biến NGROK_URL
        
        // Bạn có thể thêm logic cập nhật URL server (như bạn đã làm với GitHub trước đây) ở đây

	} catch (err) {
		logs.log(`Lỗi khi kết nối Ngrok: ${err.message}`, 'ERROR');
	}
});