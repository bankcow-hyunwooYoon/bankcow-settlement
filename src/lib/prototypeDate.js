/**
 * 프로토타입 기준일.
 * 실제 오늘 날짜(new Date()) 대신 이 값을 "지금"으로 사용한다.
 * 실서비스 연결 시 이 모듈을 제거하고 new Date()로 되돌리면 된다.
 */
export const PROTOTYPE_TODAY = new Date(2026, 0, 15)

export const PROTOTYPE_TODAY_LABEL = '2026년 1월'

/** 기준일 기준의 "지금". 매번 새 인스턴스를 주어 외부에서 변형되지 않게 한다. */
export function now() {
  return new Date(PROTOTYPE_TODAY)
}
