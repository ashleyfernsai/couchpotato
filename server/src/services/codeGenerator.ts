import crypto from 'crypto';

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed ambiguous: I,O,0,1

export function generateRoomCode(): string {
  const bytes = crypto.randomBytes(6);
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CHARS[bytes[i] % CHARS.length];
  }
  return code;
}

export function generateMessageId(): string {
  return crypto.randomBytes(8).toString('hex');
}
