const fetch = require("node-fetch");
const FormData = require("form-data");

const OCR_API_URL = process.env.OCR_API_URL || "http://localhost:3000/image-reader/ocr";

function extractUpiFromText(text) {
  const upiRegex = /[\w.\-]{2,}@[a-zA-Z]{2,}/;
  const match = text.match(upiRegex);
  return match ? match[0].toLowerCase().trim() : null;
}

async function ocrScreenshot(fileBuffer, filename = "screenshot.jpg") {
  const form = new FormData();
  form.append("file", fileBuffer, filename);

  const res = await fetch(OCR_API_URL, {
    method: "POST",
    body: form,
    headers: form.getHeaders(),
  });

  if (!res.ok) throw new Error(`OCR API failed: ${res.status}`);
  const data = await res.json();
  return data.text || data.result || "";
}

function isUpiMatch(extractedText, storedUpi) {
  const found = extractUpiFromText(extractedText);
  if (!found) return false;
  return found === storedUpi.toLowerCase().trim();
}

module.exports = { ocrScreenshot, isUpiMatch, extractUpiFromText };