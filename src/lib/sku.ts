import crypto from 'node:crypto';

export const generateProductSku = (name: string): string => {
  const cleanName = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const initials = cleanName.substring(0, 5) || 'PROD';
  const randomNum = crypto.randomInt(10, 99).toString();
  return `p-${initials}${randomNum}`;
};
