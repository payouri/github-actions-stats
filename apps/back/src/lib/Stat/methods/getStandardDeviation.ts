export function getStandardDeviation<T extends number>(array: T[]): number {
  const n = array.length;
  if (n === 0) return 0;

  let sum = 0;
  let sumOfSquares = 0;

  for (const num of array) {
    sum += num;
    sumOfSquares += num * num;
  }

  const mean = sum / n;
  const variance = sumOfSquares / n - mean * mean;
  return Math.sqrt(variance);
}
