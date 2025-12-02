import React, {useState} from "react";
import { Link, useNavigate } from 'react-router-dom';
import apiService from "../../utils/apiService";

import "../../css/side-bar.css";

function SideBar({ handleLoginSuccess }){// 🔥 Khởi tạo useNavigate
  const navigate = useNavigate(); 
  
  const[activeGroup, setActiveGroup] = useState({
    "group1": false,
    "group2": false,
    "group3": false,
    "group4": false,
  })

  var toggleBox = (groupID) => {
    setActiveGroup(oldActive => ({
      ...oldActive,
      [groupID]: !oldActive[groupID],
    }))
  }
  
  function getActiveState(groupID){
    return `${activeGroup[groupID] ? " active" : ""}`
  }

  // 🔥 Sửa hàm logout để xử lý kết quả
  var logout = async () => {
    try {
      // 1. Gọi API đăng xuất (để xóa cookie trên Backend và DB)
      const response = await apiService("/auth/logout", {
        method: 'POST', // Đảm bảo dùng POST hoặc DELETE nếu API yêu cầu
        // Lưu ý: Cần đảm bảo apiService dùng credentials: true
      }); 

      if (response.code === 200) {
        // 2. Chuyển hướng người dùng về trang đăng nhập
        handleLoginSuccess(); // 🔥 Thay thế bằng route đăng nhập của bạn
      } else {
        // Xử lý lỗi nếu API trả về trạng thái không mong muốn
        console.error("Đăng xuất thất bại:", response.message);
        // Vẫn nên chuyển hướng vì cookie đã bị xóa trên FE (nếu có)
        handleLoginSuccess();
      }

    } catch (error) {
      console.error("Lỗi kết nối khi đăng xuất:", error);
      // Xử lý khi có lỗi mạng, vẫn nên chuyển hướng để reset trạng thái
      handleLoginSuccess();
    }
  }

  return (
    <>
      <div className="side-bar">
        <div className="list-page">
          <div 
            className={"group-box" + getActiveState("group1")}
          >
            <div className="group-title"
            onClick={() => toggleBox("group1")}  >
              <p>CHÍNH</p>
            </div>

            <div className="group-content">
              <div className="box" to="/">
                <Link to="/">DASHBOARD</Link>
              </div>
              <div className="box">
                <Link to="#">Nội Dung 2</Link>
              </div>
              <div className="box">
                <Link to="#">Nội Dung 3</Link>
              </div>
              <div className="box">
                <Link to="#">Nội Dung 4</Link>
              </div>
            </div>
          </div>
          <div className="divider" style={{"--divider-height": "2px", "--divider-width": "65%"}}></div>
          <div 
            className={"group-box" + getActiveState("group2")}
          >
            <div className="group-title"
            onClick={() => toggleBox("group2")}  >
              <p>SẢN PHẨM</p>
            </div>

            <div className="group-content">
              <div className="box" to="/sanpham">
                <Link to="/sanpham">Sản Phẩm</Link>
              </div>
              <div className="box">
                <Link to="#">Kho</Link>
              </div>
              <div className="box">
                <Link to="#">Nội Dung 3</Link>
              </div>
              <div className="box">
                <Link to="#">Nội Dung 4</Link>
              </div>
            </div>
          </div>
          <div className="divider" style={{"--divider-height": "2px", "--divider-width": "65%"}}></div>
          <div 
            className={"group-box" + getActiveState("group3")}
          >
            <div className="group-title" 
            onClick={() => toggleBox("group3")}  >
              <p>TMĐT</p>
            </div>

            <div className="group-content">
              <div className="box">
                <Link to="#">Nội Dung 1</Link>
              </div>
              <div className="box">
                <Link to="#">Nội Dung 2</Link>
              </div>
              <div className="box">
                <Link to="#">Nội Dung 3</Link>
              </div>
              <div className="box">
                <Link to="#">Nội Dung 4</Link>
              </div>
            </div>
          </div>
          <div className="divider" style={{"--divider-height": "2px", "--divider-width": "65%"}}></div>
          <div 
            className={"group-box" + getActiveState("group4")}
            onClick={() => toggleBox("group4")}  
          >
            <div className="group-title">
              <p>TÀI KHOẢN</p>
            </div>

            <div className="group-content">
              <div className="box">
                <Link to="#">Tài Khoản Của Tôi</Link>
              </div>
              <div className="box">
                <Link to="#">Nội Dung 2</Link>
              </div>
              <div className="box">
                <Link to="#">Nội Dung 3</Link>
              </div>
              <div className="box">
                <Link to="#">Nội Dung 4</Link>
              </div>
            </div>
          </div>
        </div>

        <div className="log-out">
          <button onClick={() => logout()}>ĐĂNG XUẤT</button>
        </div>
      </div>
    </>
  )
}

export default SideBar