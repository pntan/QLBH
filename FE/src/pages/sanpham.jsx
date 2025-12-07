import React, { useState, useEffect } from 'react';
import { getProducts, deleteProducts } from '../utils/apiService'; // Thêm deleteProducts
import "../css/sanpham.css";

function Sanpham(){
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState([]);

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

  // Hàm xử lý khi chọn/bỏ chọn một sản phẩm
  const handleSelectProduct = (productId) => {
    setSelectedProducts((prevSelected) => {
      if (prevSelected.includes(productId)) {
        return prevSelected.filter((id) => id !== productId); // Bỏ chọn
      } else {
        return [...prevSelected, productId]; // Chọn
      }
    });
  };

  // Hàm xử lý khi chọn/bỏ chọn tất cả
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      // Chọn tất cả sản phẩm đang hiển thị
      const allProductIds = products.map((p) => p._id);
      setSelectedProducts(allProductIds);
    } else {
      // Bỏ chọn tất cả
      setSelectedProducts([]);
    }
  };

  // Hàm xử lý sao chép hàng loạt (bạn sẽ thêm logic API sau)
  const handleBulkCopy = () => {
    console.log("Sao chép các sản phẩm có ID:", selectedProducts);
    alert(`Chuẩn bị sao chép ${selectedProducts.length} sản phẩm.`);
  };

  // Hàm xử lý xóa hàng loạt (bạn sẽ thêm logic API sau)
  const handleBulkDelete = async () => {
    // Lấy thông tin chi tiết của các sản phẩm đã chọn
    const productsToDelete = products.filter(p => selectedProducts.includes(p._id));

    // Tạo danh sách tên và SKU để hiển thị trong thông báo xác nhận
    const productDetailsList = productsToDelete
      .map(p => `- ${p.name} (SKU: ${p.sku})`)
      .join('\n');

    const confirmationMessage = `Bạn có chắc chắn muốn xóa ${selectedProducts.length} sản phẩm đã chọn?\n\n${productDetailsList}`;

    // Hiển thị hộp thoại xác nhận
    if (window.confirm(confirmationMessage)) {
      try {
        // Gọi API để xóa
        await deleteProducts(selectedProducts);

        // Cập nhật lại UI sau khi xóa thành công
        setProducts(prevProducts => prevProducts.filter(p => !selectedProducts.includes(p._id)));
        setSelectedProducts([]); // Xóa danh sách đã chọn

        alert('Đã xóa các sản phẩm thành công!');
      } catch (err) {
        console.error("Lỗi khi xóa sản phẩm:", err);
        alert('Đã xảy ra lỗi khi xóa sản phẩm. Vui lòng thử lại.');
      }
    }
  };

  return(
    <div className="sanpham">
      <div className="top-bar">
        <input type="checkbox" onChange={handleSelectAll} checked={products.length > 0 && selectedProducts.length === products.length} title="Chọn tất cả" />
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
              products.map((product) => (
                <div
                  className={`product-box ${selectedProducts.includes(product._id) ? 'selected' : ''}`}
                  key={product._id}
                  data-id={product._id}
                >
                  <div className="overlay">
                    <input
                      type="checkbox"
                      checked={selectedProducts.includes(product._id)}
                      onChange={() => handleSelectProduct(product._id)}
                    />
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

      {/* Thanh công cụ hành động nổi */}
      {selectedProducts.length > 0 && (
        <div className="floating-action-bar">
          <div className="selection-count">
            Đã chọn: <strong>{selectedProducts.length}</strong>
          </div>
          <div className="button-actions">
            <button className="copy-btn" onClick={handleBulkCopy}>Sao chép</button>
            <button className="delete-btn" onClick={handleBulkDelete}>Xóa</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Sanpham;