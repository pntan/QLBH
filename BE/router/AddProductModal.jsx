import React, { useState } from 'react';
import { addProduct } from '../utils/apiService'; // Giả định bạn có hàm này trong apiService
import './AddProductModal.css'; // File CSS cho modal

function AddProductModal({ onClose, onProductAdded }) {
  const [product, setProduct] = useState({
    name: '',
    sku: '',
    stock: 0,
    cost: 0,
    image: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProduct(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!product.name || !product.sku) {
      setError('Tên sản phẩm và SKU là bắt buộc.');
      return;
    }
    setIsSubmitting(true);
    setError('');
    try {
      const response = await addProduct(product);
      onProductAdded(response.data); // Gọi callback để cập nhật UI cha
      onClose(); // Đóng modal
    } catch (err) {
      console.error("Lỗi khi thêm sản phẩm:", err);
      setError(err.response?.data?.message || 'Đã xảy ra lỗi. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Thêm sản phẩm mới</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Tên sản phẩm</label>
            <input type="text" id="name" name="name" value={product.name} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label htmlFor="sku">SKU</label>
            <input type="text" id="sku" name="sku" value={product.sku} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label htmlFor="stock">Tồn kho</label>
            <input type="number" id="stock" name="stock" value={product.stock} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label htmlFor="cost">Giá vốn</label>
            <input type="number" id="cost" name="cost" value={product.cost} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label htmlFor="image">URL Hình ảnh</label>
            <input type="text" id="image" name="image" value={product.image} onChange={handleChange} placeholder="https://example.com/image.jpg" />
          </div>

          {error && <p className="error-message">{error}</p>}

          <div className="form-actions">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="btn-cancel">
              Hủy
            </button>
            <button type="submit" disabled={isSubmitting} className="btn-submit">
              {isSubmitting ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddProductModal;