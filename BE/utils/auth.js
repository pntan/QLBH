import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';

const JWT_SECRET = process.env.JWT_SECRET;

export function socketAuth(socket) {
  const cookies = cookie.parse(socket.handshake.headers.cookie || "");
  const accessToken = cookies.accessToken;
  if (!accessToken) return null;
  try {
    const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
    return decoded.id;
  } catch { return null; }
}