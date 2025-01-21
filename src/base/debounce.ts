export function debounce<U, T extends unknown[], F extends (...args: T) => U | Promise<U>>(
  f: F,
  ms: number
) {
  let timer: NodeJS.Timeout;
  return (...args: T) => {
    clearTimeout(timer);
    return new Promise<U>((res) => {
      timer = setTimeout(() => res(f(...args)), ms);
    });
  };
}
