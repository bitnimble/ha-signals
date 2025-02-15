export function debounce<F extends (...args: Parameters<F>) => ReturnType<F>>(f: F, ms: number) {
  let timer: NodeJS.Timeout;
  return (...args: Parameters<F>) => {
    clearTimeout(timer);
    return new Promise<ReturnType<F>>((res) => {
      timer = setTimeout(() => res(f(...args)), ms);
    });
  };
}
