export function getXPercentile<T extends number>(
  array: T[],
  percentile: number
): number {
  const sortedArray = array.sort((a, b) => a - b);
  const index = Math.floor((percentile / 100) * sortedArray.length);

  return sortedArray[index];
}
