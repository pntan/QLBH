import React, { useState, useEffect } from "react"; // Import useEffect
import { addProduct, uploadFile } from '../../utils/apiService'; // Import uploadFile
import "../../css/AddProductModal.css";

function AddProductModal({ onClose, onProductAdded }) {
  const [product, setProduct] = useState({
    name: '',
    sku: '',
    stock: 0,
    cost: 0,
    image: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');
  const [imageInputMode, setImageInputMode] = useState('url'); // 'url' or 'upload'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Cleanup for image preview URL
  useEffect(() => {
    return () => {
      if (imagePreviewUrl && selectedFile) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl, selectedFile]);

  // Hàm xử lý khi click vào vùng nền (overlay)
  const handleOverlayClick = (e) => {
    // Nếu target của event là chính div.popup (vùng nền) thì đóng modal
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleTextChange = (e) => { // Renamed to avoid conflict with image specific change
    const { name, value } = e.target;
    setProduct(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setImagePreviewUrl(URL.createObjectURL(file));
      setProduct(prev => ({ ...prev, image: '' })); // Clear URL if file is selected
    } else {
      setSelectedFile(null);
      setImagePreviewUrl('');
    }
  };

  const handleImageUrlChange = (e) => {
    const { value } = e.target;
    setProduct(prev => ({ ...prev, image: value }));
    setImagePreviewUrl(value); // Update preview directly from URL
    setSelectedFile(null); // Clear selected file if URL is entered
  };

  const handleInputModeChange = (mode) => {
    setImageInputMode(mode);
    // Clear relevant states when switching modes
    if (mode === 'url') {
      setSelectedFile(null);
      // If product.image already has a URL, use it for preview
      setImagePreviewUrl(product.image);
    } else { // mode === 'upload'
      setProduct(prev => ({ ...prev, image: '' })); // Clear URL
      setImagePreviewUrl('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basic validation for image if it's considered mandatory
    if (imageInputMode === 'url' && !product.image && !selectedFile) {
      setError('Vui lòng cung cấp URL hình ảnh hoặc tải lên một tệp.');
      return;
    }

    if (!product.name || !product.sku) {
      setError('Tên sản phẩm và SKU là bắt buộc.');
      return;
    }
    setIsSubmitting(true);
    setError('');
    try {
      let finalImageUrl = product.image;

      if (imageInputMode === 'upload' && selectedFile) {
        // Upload the file first
        const uploadResponse = await uploadFile(selectedFile);
        if (uploadResponse && uploadResponse.url) { // Assuming uploadFile returns { url: '...' }
          finalImageUrl = uploadResponse.url;
        } else {
          throw new Error('Upload ảnh thất bại hoặc không nhận được URL.');
        }
      } else if (imageInputMode === 'url' && !product.image) {
        finalImageUrl = ''; // Allow empty image if not uploaded
      }

      const response = await addProduct({ ...product, image: finalImageUrl });
      onProductAdded(response.data); // Gọi callback để cập nhật UI cha
      onClose(); // Đóng modal
    } catch (err) {
      console.error("Lỗi khi thêm sản phẩm:", err);
      setError(err.message || 'Đã xảy ra lỗi. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="popup add-product" onClick={handleOverlayClick}>
      <div className="popup-content">
        <div className="title">
          <h2>Thêm sản phẩm mới</h2>
        </div>
        <div className="group-input"> {/* This div contains the form */}
          <form onSubmit={handleSubmit}>
            {/* Image Section - moved to top */}
            <div className="form-group image-section">
              <label>Hình ảnh sản phẩm</label>
              <div className="image-input-mode-toggle">
                <label>
                  <input
                    type="radio"
                    name="imageMode"
                    value="url"
                    checked={imageInputMode === 'url'}
                    onChange={() => handleInputModeChange('url')}
                  />
                  URL
                </label>
                <label>
                  <input
                    type="radio"
                    name="imageMode"
                    value="upload"
                    checked={imageInputMode === 'upload'}
                    onChange={() => handleInputModeChange('upload')}
                  />
                  Tải lên
                </label>
              </div>

              {imageInputMode === 'url' ? (
                <input
                  type="text"
                  id="image"
                  name="image"
                  value={product.image}
                  onChange={handleImageUrlChange}
                  placeholder="https://example.com/image.jpg"
                />
              ) : (
                <input
                  type="file"
                  id="file-upload"
                  name="file-upload"
                  accept="image/*"
                  onChange={handleFileChange}
                />
              )}

              {imagePreviewUrl && (
                <div className="image-preview">
                  <img src={imagePreviewUrl} alt="Xem trước ảnh" />
                </div>
              )}
            </div>
            {/* Other form fields */}
            <div className="form-group"><label htmlFor="name">Tên sản phẩm</label><input type="text" id="name" name="name" value={product.name} onChange={handleTextChange} required /></div>
            <div className="form-group"><label htmlFor="sku">SKU</label><input type="text" id="sku" name="sku" value={product.sku} onChange={handleTextChange} required /></div>
            <div className="form-group"><label htmlFor="stock">Tồn kho</label><input type="number" id="stock" name="stock" value={product.stock} onChange={handleTextChange} /></div>
            <div className="form-group"><label htmlFor="cost">Giá vốn</label><input type="number" id="cost" name="cost" value={product.cost} onChange={handleTextChange} /></div>

            {error && <p className="error-message">{error}</p>}

            <div className="form-actions">
              <button type="button" onClick={onClose} disabled={isSubmitting} className="btn-cancel">Hủy</button>
              <button type="submit" disabled={isSubmitting} className="btn-submit">{isSubmitting ? 'Đang lưu...' : 'Lưu'}</button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}

export default AddProductModal;