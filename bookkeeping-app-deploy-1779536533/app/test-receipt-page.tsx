export default function TestReceiptPage() {
  return (
    <div style={{ padding: '40px', backgroundColor: '#fff', fontFamily: 'monospace', maxWidth: '500px', margin: '0 auto' }}>
      <pre style={{ fontSize: '14px', lineHeight: '1.6' }}>
{`╔════════════════════════════════════════╗
║           GROCERY STORE RECEIPT         ║
╠════════════════════════════════════════╣
║ Date: May 15, 2026                     ║
║ Time: 14:32                            ║
║ Store: ABC Market Inc.                 ║
║ Location: Toronto, ON                  ║
╠════════════════════════════════════════╣
║ ITEMS                                  ║
║ Fresh Apples (2kg)        $12.99       ║
║ Whole Wheat Bread         $4.50        ║
║ Milk (2L)                 $5.99        ║
║ Cheddar Cheese (500g)     $8.50        ║
║ Coffee Beans (1kg)        $16.00       ║
╠════════════════════════════════════════╣
║ Subtotal:                 $47.98       ║
║ HST (13%):                $6.24        ║
║ ─────────────────────────────────────  ║
║ TOTAL:                    $54.22       ║
║                                        ║
║ Payment Method: VISA                   ║
║ Card Ending: ****4242                  ║
║ Transaction ID: #TXN12345              ║
╚════════════════════════════════════════╝`}
      </pre>
    </div>
  )
}
