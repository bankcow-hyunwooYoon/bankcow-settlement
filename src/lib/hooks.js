import { useEffect, useState } from 'react'

/** 값이 delay 동안 멈췄을 때만 갱신한다. 입력 중 재계산이 과하게 도는 걸 막는 용도. */
export function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}
