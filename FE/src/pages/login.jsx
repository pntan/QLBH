import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signIn } from '../utils/apiService'; // 👈 Import hàm signIn

import "../css/login.css";

function Login({ handleLoginSuccess }) {
  // 1. Quản lý trạng thái đầu vào (Controlled Components)
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  // Hàm xử lý đăng nhập
  const sign_in = async (e) => {
    e.preventDefault(); // Ngăn chặn hành vi mặc định của form (tải lại trang)

    if (!username || !password) {
      setError('Vui lòng nhập đầy đủ Tên đăng nhập và Mật khẩu.');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      // 2. Gọi API Đăng nhập
      const result = await signIn(username, password);

      // 3. Xử lý thành công
      console.log("Đăng nhập thành công:", result);
      
      // Cập nhật trạng thái xác thực trong App.jsx (Nếu bạn truyền prop)
      // Nếu bạn dùng Context API, thì gọi hàm cập nhật Context tại đây.
      // Tuy nhiên, vì bạn đã có cơ chế kiểm tra Auth trong App.jsx,
      // việc chuyển hướng sẽ kích hoạt lại hàm kiểm tra đó.
      
      handleLoginSuccess();

    } catch (err) {
      // 4. Xử lý lỗi
      console.error("Lỗi đăng nhập:", err);
      setError('Tên đăng nhập hoặc mật khẩu không đúng.'); // Thông báo chung cho người dùng
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // 💡 Nên dùng thẻ <form> và gán onSubmit để người dùng có thể nhấn Enter
    <div className="login-wrap">
      <form className="login-form" onSubmit={sign_in}> 
        <div className="title">
          <p>Đăng Nhập</p>
        </div>

        <div className="divider" style={{"--divider-height": "2px"}}></div>

        <div className="form-content">
          <div className="box">
            {/* Gán giá trị và sự kiện onChange cho Controlled Component */}
            <input 
              type="text" 
              id="username" 
              placeholder="Tên đăng nhập" 
              required 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <label htmlFor="username">Tên Đăng Nhập</label>
          </div>
          
          <div className="box">
             <input 
              type="password" // 👈 Sửa type thành password
              id="password" 
              placeholder="Mật khẩu" 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <label htmlFor="password">Mật Khẩu</label>
          </div>

          {error && <p style={{ color: 'red', margin: '10px 0' }}>{error}</p>}

          <button type="submit" disabled={isLoading}>
            {isLoading ? 'ĐANG XỬ LÝ...' : 'ĐĂNG NHẬP'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default Login;