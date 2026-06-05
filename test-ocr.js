const fs = require('fs');
const path = require('path');

async function testOCR() {
  try {
    // Read the test PDF
    const pdfPath = path.join(__dirname, 'test_receipt.pdf');
    const pdfBuffer = fs.readFileSync(pdfPath);

    console.log('PDF file size:', pdfBuffer.length, 'bytes');
    console.log('Testing OCR endpoint...\n');

    // Create FormData
    const FormData = require('form-data');
    const formData = new FormData();
    formData.append('file', pdfBuffer, 'test_receipt.pdf');

    // Make request to the API
    const response = await fetch('http://localhost:3006/api/analyze-document', {
      method: 'POST',
      body: formData,
      headers: {
        ...formData.getHeaders(),
        'Authorization': 'Bearer test-token',
      },
    });

    console.log('API Response Status:', response.status);
    console.log('API Response Headers:', response.headers);

    const result = await response.json();
    console.log('\nAPI Response:');
    console.log(JSON.stringify(result, null, 2));

    if (response.ok && result.data) {
      console.log('\n✅ OCR Success!');
      console.log('Extracted Amount:', result.data.amount);
      console.log('Extracted Date:', result.data.date);
      console.log('Extracted Vendor:', result.data.vendor_name);
    } else {
      console.log('\n❌ OCR Failed!');
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testOCR();
