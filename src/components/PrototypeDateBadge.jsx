import { PROTOTYPE_TODAY_LABEL } from '../lib/prototypeDate.js'

/** 디버깅용. 프로토타입이 "지금"으로 간주하는 시점을 표시한다. */
export default function PrototypeDateBadge() {
  return (
    <span className="text-xs text-gray-400">프로토타입 기준일: {PROTOTYPE_TODAY_LABEL}</span>
  )
}
