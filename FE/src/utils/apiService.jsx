// utils/apiService.js

// Lấy URL cơ sở từ biến môi trường (Nếu đang chạy cục bộ, nên dùng http://localhost:PORT)
const BASE_URL = "http://localhost:2105";

/**
 * Hàm gọi API chung
 * @param {string} endpoint - Đường dẫn API (ví dụ: '/api/dashboard/data')
 * @param {object} options - Cấu hình fetch API (method, body, headers, etc.)
 * @returns {Promise<any>} Dữ liệu JSON từ server
 */
const request = async (endpoint, options = {}) => {
    const url = `${BASE_URL}${endpoint}`;

    // Cấu hình mặc định cho tất cả các request
    const defaultOptions = {
        credentials: 'include', // RẤT QUAN TRỌNG: để gửi Cookie/AccessToken
        ...options,
        headers: {
            // Tự động thêm Content-Type, trừ khi đó là upload file (FormData)
            ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
            ...options.headers,
        },
    };

    try {
        const response = await fetch(url, defaultOptions);

        if (response.status === 401) {
            // Xử lý xác thực (ví dụ: chuyển hướng đến trang đăng nhập)
            console.error("Lỗi 401: Yêu cầu xác thực.");
            // throw new Error("UNAUTHORIZED"); // Tùy chọn: ném lỗi để component bắt
        }
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Lỗi HTTP: ${response.status}`);
        }

        // Kiểm tra nếu request là DELETE (204 No Content)
        if (response.status === 204 || response.headers.get('content-length') === '0') {
            return { message: "Thao tác thành công, không có nội dung trả về." };
        }
        
        return await response.json();

    } catch (error) {
        console.error(`Lỗi khi gọi API tới ${endpoint}:`, error);
        throw error;
    }
};

// -------------------------------------------------------------------
// CÁC HÀM API CỤ THỂ DÀNH CHO COMPONENT
// -------------------------------------------------------------------

// 1. Lấy dữ liệu Dashboard (GET)
export const getDashboardData = () => {
    return request('/api/dashboard/data', { method: 'GET' });
};

// 2. Tải lên file (POST/FormData)
export const uploadFile = (file) => {
    const formData = new FormData();
    // 'file' phải khớp với tên trường Multer của BE
    formData.append('file', file); 

    return request('/api/upload', {
        method: 'POST',
        body: formData,
        // Content-Type tự động bị bỏ qua (xem logic trong hàm request)
    });
};

// 3. Đăng nhập (POST/JSON)
export const signIn = (username, password) => {
    return request('/auth/signin', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
    });
};

// Hàm kiểm tra trạng thái đăng nhập
export const checkAuthStatus = async () => {
    // Endpoint này sẽ trả về 200 OK nếu cookie hợp lệ, hoặc 401 nếu không
    const response = await request('/auth/authenticated', { method: 'POST' });
    return response.data.user; // Trả về thông tin người dùng nếu xác thực thành công
};

export default request;