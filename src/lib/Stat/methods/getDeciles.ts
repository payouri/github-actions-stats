export function getDeciles<T extends number>(array: T[]): number[] {
  const sortedArray = array.sort((a, b) => a - b);
  const deciles: number[] = [];

  for (let i = 0; i < 10; i++) {
    const index = Math.floor(((i + 1) * sortedArray.length) / 10);
    if (index >= sortedArray.length) {
      sortedArray.push(sortedArray[sortedArray.length - 1]);
      continue;
    }
    deciles.push(sortedArray[index]);
  }

  return deciles;
}
