// Module để thao tác với cơ sở dữ liệu MongoDB
// Các hàm được thiết kế để tương tự như các câu lệnh SQL: SELECT, INSERT, UPDATE, DELETE.

import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

var uri = process.env.CONNECT_STRING_MONGO;

// Lớp MongoDB để quản lý kết nối và các thao tác với database
export class MongoDB {
	constructor(dbName) {
        if (!uri || !dbName) {
            // Cập nhật thông báo lỗi để rõ ràng hơn
            throw new Error('Vui lòng cung cấp URI kết nối trong file .env và tên database.');
        }
        this.client = new MongoClient(uri);
        this.dbName = dbName;
        this.db = null;
    }

	/**
	 * Kết nối đến cơ sở dữ liệu MongoDB
	 * @returns {Promise<void>}
	 */
	async connect() {
		try {
			await this.client.connect();
			this.db = this.client.db(this.dbName);
			console.log(`Kết nối thành công đến database: ${this.dbName}`);
		} catch (error) {
			console.error('Lỗi khi kết nối đến MongoDB:', error);
			throw error;
		}
	}

	/**
	 * Ngắt kết nối khỏi cơ sở dữ liệu
	 * @returns {Promise<void>}
	 */
	async disconnect() {
		try {
			await this.client.close();
			console.log('Đã ngắt kết nối khỏi MongoDB.');
		} catch (error) {
			console.error('Lỗi khi ngắt kết nối:', error);
		}
	}

	/**
     * INSERT - Thêm một document mới vào collection.
     * @param {string} collectionName Tên của collection.
     * @param {object} data Dữ liệu cần thêm.
     * @returns {Promise<string>} ID của document vừa được thêm.
    */
    async insert(collectionName, data) {
        if (!this.db) {
            throw new Error('Chưa kết nối đến database. Vui lòng gọi hàm connect() trước.');
        }
        const collection = this.db.collection(collectionName);
        const result = await collection.insertOne(data);
        console.log(`Đã thêm document với ID: ${result.insertedId}`);
        // Trả về ID của document đã được thêm
        return result.insertedId; 
    }

    /**
     * SELECT - Tìm kiếm và lấy thông tin từ một collection.
     * Hàm này có thể tìm kiếm theo nhiều trường, hỗ trợ tìm kiếm bằng ObjectId.
     * @param {string} collectionName Tên của collection.
     * @param {object} query (Tùy chọn) Đối tượng điều kiện tìm kiếm.
     * @returns {Promise<Array>} Mảng các document phù hợp.
    */
    async select(collectionName, query = {}) {
        if (!this.db) {
            throw new Error('Chưa kết nối đến database. Vui lòng gọi hàm connect() trước.');
        }
        const collection = this.db.collection(collectionName);
        
        // Xử lý trường hợp người dùng muốn tìm kiếm bằng _id (dưới dạng chuỗi)
        if (query._id && typeof query._id === 'string') {
            query._id = new ObjectId(query._id);
        }

        return collection.find(query).toArray();
    }

    /**
     * SELECT - Tìm kiếm một tài liệu duy nhất.
     * @param {string} collectionName Tên của collection.
     * @param {object} query (Tùy chọn) Đối tượng điều kiện tìm kiếm.
     * @returns {Promise<object | null>} Tài liệu tìm thấy hoặc null nếu không tồn tại.
     */
    async findOne(collectionName, query = {}) {
        if (!this.db) {
            throw new Error('Chưa kết nối đến database. Vui lòng gọi hàm connect() trước.');
        }
        const collection = this.db.collection(collectionName);
        
        // Xử lý trường hợp người dùng muốn tìm kiếm bằng _id (dưới dạng chuỗi)
        if (query._id && typeof query._id === 'string') {
            query._id = new ObjectId(query._id);
        }
        
        return collection.findOne(query);
    }

    /**
     * SELECT - Tìm kiếm và trả về một cursor.
     * Hàm này có thể tìm kiếm theo nhiều trường, hỗ trợ tìm kiếm bằng ObjectId.
     * @param {string} collectionName Tên của collection.
     * @param {object} query (Tùy chọn) Đối tượng điều kiện tìm kiếm.
     * @returns {Promise<Cursor>} Cursor của kết quả tìm kiếm.
     */
    async selectCursor(collectionName, query = {}) {
        if (!this.db) {
            throw new Error('Chưa kết nối đến database. Vui lòng gọi hàm connect() trước.');
        }
        const collection = this.db.collection(collectionName);
        
        // Xử lý trường hợp người dùng muốn tìm kiếm bằng _id (dưới dạng chuỗi)
        if (query._id && typeof query._id === 'string') {
            query._id = new ObjectId(query._id);
        }
        
        // Trả về Cursor thay vì Array
        return collection.find(query);
    }

	/**
     * UPDATE - Sửa đổi để xử lý cả $set và các toán tử cập nhật khác
     * @param {string} collectionName Tên của collection.
     * @param {object} query Điều kiện để tìm kiếm document cần cập nhật.
     * @param {object} updateData Dữ liệu cần cập nhật, có thể chứa toán tử ($set, $push...).
     * @returns {Promise<object>} Kết quả của thao tác cập nhật.
     */
    async update(collectionName, query, updateData) {
        if (!this.db) {
            throw new Error('Chưa kết nối đến database. Vui lòng gọi hàm connect() trước.');
        }
        const collection = this.db.collection(collectionName);

        // Kiểm tra xem updateData có chứa các toán tử cập nhật không (key bắt đầu bằng $)
        const hasUpdateOperators = Object.keys(updateData).some(key => key.startsWith('$'));
		let updateDoc = hasUpdateOperators ? updateData : { $set: updateData };
        
        const result = await collection.updateMany(query, updateDoc);
        console.log(`${result.modifiedCount} document đã được cập nhật.`);
        return result;
    }

	/**
	 * DELETE - Xóa một hoặc nhiều document khỏi collection.
	 * @param {string} collectionName Tên của collection.
	 * @param {object} query Điều kiện để tìm kiếm document cần xóa.
	 * @returns {Promise<object>} Kết quả của thao tác xóa.
	 */

	async remove(collectionName, query) {
		if (!this.db) {
			throw new Error('Chưa kết nối đến database. Vui lòng gọi hàm connect() trước.');
		}
		const collection = this.db.collection(collectionName);
		const result = await collection.deleteMany(query);
		console.log(`${result.deletedCount} document đã được xóa.`);
		return result;
	}
}