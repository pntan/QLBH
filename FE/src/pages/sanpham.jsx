import React, { useState, useEffect } from 'react';
import { getProducts } from '../utils/apiService'; // Giả sử bạn có hàm này để gọi API
import "../css/sanpham.css";

function Sanpham(){
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setIsLoading(true);
        const data = await getProducts(); // Gọi API để lấy danh sách sản phẩm
        // Giả định API trả về { data: [...] }. Nếu key khác, hãy thay đổi 'data'
        // Ví dụ: nếu API trả về { products: [...] } thì dùng data.products
        // Kiểm tra xem data.data có phải là một mảng không trước khi set state
        setProducts(Array.isArray(data.data) ? data.data : []);
        setError(null);
      } catch (err) {
        console.error("Lỗi khi lấy danh sách sản phẩm:", err);
        setError("Không thể tải danh sách sản phẩm. Vui lòng thử lại sau.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, []); // Mảng rỗng đảm bảo useEffect chỉ chạy một lần khi component mount

  return(
    <div className="sanpham">
      <div className="top-bar">
        <div className="search-box">
          <input type="text" placeholder="Tìm kiếm" required />
        </div>
        <div className="category">
          {/* Có thể thêm bộ lọc danh mục ở đây */}
        </div>
      </div>

      <div className="list-product">
        {isLoading && <p>Đang tải danh sách sản phẩm...</p>}
        {error && <p style={{ color: 'red' }}>{error}</p>}
        {!isLoading && !error && (
          <>
            {products.length > 0 ? (
              products.map(product => (
                <div className="product-box" key={product.id}>
                  <div className="overlay">
                    <input type="checkbox" />
                  </div>
                  <div className="product-img">
                    {/* Sử dụng ảnh từ sản phẩm hoặc ảnh mặc định */}
                    <img src={product.image || "https://placehold.co/400"} alt={product.name} />
                  </div>
                  <div className="product-detail">
                    <div className="identify">
                      <p>{product.name}</p>
                      <p>{product.sku}</p>
                    </div>
                    <div className="stock">
                      <p>{product.stock}</p>
                    </div>
                    <div className="cost">
                      {/* Định dạng giá tiền cho dễ đọc */}
                      <p>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(product.cost)}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p>Không có sản phẩm nào.</p>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default Sanpham;