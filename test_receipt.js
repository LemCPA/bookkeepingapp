const fs = require('fs');
const path = require('path');

async function testReceiptAnalysis() {
  const imagePath = './receipt_image.jpg';
  
  if (!fs.existsSync(imagePath)) {
    console.error('Receipt image not found');
    return;
  }

  const fileBuffer = fs.readFileSync(imagePath);
  const base64 = fileBuffer.toString('base64');
  const mimeType = 'image/jpeg';

  // Create form data
  const formData = new FormData();
  formData.append('file', new Blob([fileBuffer], { type: mimeType }), 'receipt.jpg');

  try {
    console.log('📷 Testing receipt analysis...');
    console.log('Sending image to Claude Vision API...');
    
    // Simulate the API call
    const response = await fetch('http://localhost:3000/api/analyze-document', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer test-token-for-demo',
      },
      body: formData,
    });

    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      return;
    }

    const data = await response.json();
    console.log('✅ Receipt analysis successful!');
    console.log('Extracted data:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error during test:', error.message);
  }
}

testReceiptAnalysis();
