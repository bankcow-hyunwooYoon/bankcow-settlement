/**
 * 투자상품 생성 시 입력한 소별 예상 원가 목업.
 * 실제 서비스에서는 투자상품 생성 API의 상품정보(기초자산·예상 사료비·예상 관리비·발행제비용)를 사용한다.
 */
export function getExpectedProductCost(cattleName, unit) {
  const number = Number(cattleName.match(/(\d+)호/)?.[1] ?? 1)
  const variation = (number % 7) * 25000
  const baseAsset = 3150000 + (number % 9) * 85000
  const feedCost = 1150000 + variation
  const mgmtCost = 235000 + (number % 5) * 9000
  const issuanceCost = 275000

  return {
    securityName: `가축투자증권 ${unit?.linkedProductCount ?? 1}호`,
    productName: cattleName,
    placementDate: unit?.placementDate ?? '-',
    baseAsset,
    feedCost,
    mgmtCost,
    issuanceCost,
    fundraisingAmount: baseAsset + feedCost + mgmtCost + issuanceCost,
  }
}
