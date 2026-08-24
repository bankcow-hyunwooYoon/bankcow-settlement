/**
 * 농장 등록 시 연결할 수 있는 진행 중 투자상품 목업.
 * 실제 연동에서는 정산이 완료되지 않은 투자상품 API 목록을 사용한다.
 */
export const ACTIVE_INVESTMENT_PRODUCTS = [
  { id: 'product-5-1', productName: '가축투자계약증권 5-1', farmName: '새봄농장', productCode: 'CERT-5-1', placementDate: '2026-08-04', headCount: 18 },
  { id: 'product-5-2', productName: '가축투자계약증권 5-2', farmName: '새봄농장', productCode: 'CERT-5-2', placementDate: '2026-07-12', headCount: 22 },
  { id: 'product-5-3', productName: '가축투자계약증권 5-3', farmName: '새봄농장', productCode: 'CERT-5-3', placementDate: '2026-07-18', headCount: 16 },
  { id: 'product-6-1', productName: '가축투자계약증권 6-1', farmName: '늘푸른농장', productCode: 'CERT-6-1', placementDate: '2026-06-03', headCount: 25 },
  { id: 'product-6-2', productName: '가축투자계약증권 6-2', farmName: '늘푸른농장', productCode: 'CERT-6-2', placementDate: '2026-06-24', headCount: 25 },
  { id: 'product-6-3', productName: '가축투자계약증권 6-3', farmName: '늘푸른농장', productCode: 'CERT-6-3', placementDate: '2026-05-18', headCount: 20 },
  { id: 'product-7-1', productName: '가축투자계약증권 7-1', farmName: '한결농장', productCode: 'CERT-7-1', placementDate: '2026-05-21', headCount: 30 },
  { id: 'product-7-2', productName: '가축투자계약증권 7-2', farmName: '한결농장', productCode: 'CERT-7-2', placementDate: '2026-04-09', headCount: 24 },
  { id: 'product-7-3', productName: '가축투자계약증권 7-3', farmName: '한결농장', productCode: 'CERT-7-3', placementDate: '2026-03-08', headCount: 28 },
  { id: 'product-8-1', productName: '가축투자계약증권 8-1', farmName: '청정농장', productCode: 'CERT-8-1', placementDate: '2026-02-16', headCount: 26 },
  { id: 'product-8-2', productName: '가축투자계약증권 8-2', farmName: '청정농장', productCode: 'CERT-8-2', placementDate: '2026-01-22', headCount: 21 },
  { id: 'product-8-3', productName: '가축투자계약증권 8-3', farmName: '청정농장', productCode: 'CERT-8-3', placementDate: '2025-12-11', headCount: 29 },
]

/** 이미 사육 단위에 연결된 진행 상품 목업. 수정 모달에서 현재 연결값으로 사용한다. */
export const REGISTERED_INVESTMENT_PRODUCTS = [
  { id: 'product-2-1', productName: '가축투자계약증권 2-1', farmName: '푸른농장', placementDate: '2026-03-08', headCount: 25 },
  { id: 'product-2-2', productName: '가축투자계약증권 2-2', farmName: '푸른농장', placementDate: '2026-03-18', headCount: 25 },
  { id: 'product-3-1', productName: '가축투자계약증권 3-1', farmName: '청정농장', placementDate: '2026-05-18', headCount: 20 },
  { id: 'product-3-2', productName: '가축투자계약증권 3-2', farmName: '청정농장', placementDate: '2026-06-02', headCount: 15 },
  { id: 'product-3-3', productName: '가축투자계약증권 3-3', farmName: '청정농장', placementDate: '2026-06-02', headCount: 15 },
  { id: 'product-4-1', productName: '가축투자계약증권 4-1', farmName: '충만농장', placementDate: '2026-06-24', headCount: 15 },
  { id: 'product-4-2', productName: '가축투자계약증권 4-2', farmName: '충만농장', placementDate: '2026-06-24', headCount: 15 },
  { id: 'product-4-3', productName: '가축투자계약증권 4-3', farmName: '충만농장', placementDate: '2026-07-05', headCount: 10 },
  { id: 'product-4-4', productName: '가축투자계약증권 4-4', farmName: '충만농장', placementDate: '2026-07-05', headCount: 10 },
]

export const INVESTMENT_PRODUCTS = [...REGISTERED_INVESTMENT_PRODUCTS, ...ACTIVE_INVESTMENT_PRODUCTS]
