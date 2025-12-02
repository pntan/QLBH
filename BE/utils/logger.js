import { createWriteStream, promises as fsPromises } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Lấy đường dẫn thư mục hiện tại của module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Đường dẫn đến file log (sẽ nằm ở thư mục gốc của dự án, ngang hàng với app.js)
const logFilePath = path.join(__dirname, '../app_logs.log');

let logStream = null; // Biến để giữ stream ghi file

/**
 * Tạo hoặc mở lại stream ghi log.
 * Đảm bảo stream được đóng trước khi mở lại để tránh lỗi.
 */
const createLogStream = () => {
    if (logStream) {
        logStream.end(); // Đóng stream hiện có nếu tồn tại
    }
    // Mở stream ghi file ở chế độ 'a' (append) để thêm vào cuối file
    logStream = createWriteStream(logFilePath, { flags: 'a' });
    logStream.on('error', (err) => {
        // Ghi lỗi ra console nếu không thể ghi vào file log
        console.error(`Lỗi khi ghi log vào file ${logFilePath}:`, err);
    });
};

/**
 * Ghi một tin nhắn log vào file và cũng in ra console (ít chi tiết hơn).
 * @param {string} message Tin nhắn cần ghi log.
 * @param {string} level Mức độ log (INFO, WARN, ERROR). Mặc định là 'INFO'.
 */
export const log = (message, level = 'INFO') => {
    if (!logStream) {
        createLogStream(); // Đảm bảo stream được tạo nếu chưa có
    }
    const timestamp = new Date().toISOString(); // Lấy thời gian hiện tại theo định dạng ISO
    const logMessage = `[${timestamp}] [${level}] ${message}\n`; // Định dạng tin nhắn log
    logStream.write(logMessage); // Ghi tin nhắn vào file
    // Vẫn in ra console một bản tóm tắt để có phản hồi tức thì
    // Bạn có thể bỏ dòng này nếu muốn console hoàn toàn sạch
    console.log(`[${level}] ${message}`);
};

/**
 * Xóa nội dung của file log.
 * Hữu ích khi bạn muốn bắt đầu một phiên log mới.
 */
export const clearLogFile = async () => {
    if (logStream) {
        logStream.end(); // Đóng stream hiện tại trước khi xóa
        logStream = null;
    }
    try {
        await fsPromises.truncate(logFilePath, 0); // Cắt file về 0 bytes (xóa nội dung)
        log(`Đã xóa nội dung file log: ${logFilePath}`, 'INFO');
    } catch (error) {
        if (error.code === 'ENOENT') {
            log(`File log không tồn tại, không cần xóa: ${logFilePath}`, 'WARN');
        } else {
            console.error(`Lỗi khi xóa file log ${logFilePath}:`, error);
        }
    }
    createLogStream(); // Tạo lại stream sau khi xóa file
};

// Khởi tạo stream khi module được tải
createLogStream();
