import { google } from "googleapis";
import fs from "fs";
import dotenv from 'dotenv';

dotenv.config();

// Đọc credentials từ file JSON tải về
const SERVICE_ACCOUNT_KEY_FILE = process.env.SERVICE_ACCOUNT_KEY_FILE;
const credentials = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_KEY_FILE));

// Tạo client auth
const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

// ID sheet bạn muốn thao tác (lấy từ URL: docs.google.com/spreadsheets/d/ID/edit)
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;

/**
 * Đọc dữ liệu từ Google Sheet
 * @param {string} sheetName - Tên sheet (vd: "Sheet1")
 * @param {string} range - Vùng dữ liệu (vd: "A1:D10")
 */
export async function readSheet(sheetName, range) {
  const client = await auth.getClient();
  const sheets = google.sheets({ version: "v4", auth: client });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!${range}`,
  });
  return res.data.values || [];
}

/**
 * Thêm một dòng dữ liệu vào Google Sheet
 * @param {string} sheetName - Tên sheet (vd: "Sheet1")
 * @param {Array} values - Mảng giá trị cần thêm (vd: ["SP001", "Áo thun", 150000])
 */
export async function appendRow(sheetName, values = []) {
  const client = await auth.getClient();
  const sheets = google.sheets({ version: "v4", auth: client });
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A1`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [values] },
  });
  return true;
}

/**
 * Cập nhật dữ liệu theo range
 * @param {string} sheetName - Tên sheet (vd: "NHÓM HÀNG")
 * @param {string} range - Range (vd: "A2:B")
 * @param {Array<Array<string>>} values - Mảng 2D dữ liệu
 */
export async function updateCell(sheetName, range, values) {
  const client = await auth.getClient();
  const sheets = google.sheets({ version: "v4", auth: client });

  let finalValues;
  if (typeof values === "string") {
    finalValues = [[values]];
  } else if (Array.isArray(values)) {
    if (Array.isArray(values[0])) {
      finalValues = values; // đã là 2D
    } else {
      finalValues = [values]; // 1D -> 2D
    }
  } else {
    throw new Error("Giá trị không hợp lệ cho updateCell");
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!${range}`,
    valueInputOption: "RAW",
    requestBody: { values: finalValues },
  });

  return true;
}
