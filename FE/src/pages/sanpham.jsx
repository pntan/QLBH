import "../css/sanpham.css"

function Sanpham(){
  return(
    <div className="sanpham">
      <div className="top-bar">
        <div className="search-box">
          <input type="text" placeholder="Tìm kiém" required />
        </div>
        <div className="category">
        </div>
      </div>

      <div className="list-product">
        <div className="product-box">
          <div className="overlay">
            <input type="checkbox" />
          </div>
          <div className="product-img">
            <img src="https://placehold.co/400" />
          </div>
          <div className="product-detail">
            <div className="identify">
              <p>Tên Sản Phẩm</p>
              <p>SKU</p>
            </div>
            <div className="stock">
              <p>Số Lượng</p>
            </div>
            <div className="cost">
              <p>Giá Vốn</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Sanpham;