const objectAny = Object as typeof Object & {
  groupBy?: <T>(
    items: Iterable<T>,
    callback: (value: T, index: number) => PropertyKey,
  ) => Record<PropertyKey, T[]>;
};

if (typeof objectAny.groupBy !== 'function') {
  objectAny.groupBy = function groupBy<T>(
    items: Iterable<T>,
    callback: (value: T, index: number) => PropertyKey,
  ): Record<PropertyKey, T[]> {
    const result: Record<PropertyKey, T[]> = {};
    let index = 0;
    for (const item of items) {
      const key = callback(item, index++);
      (result[key] ??= []).push(item);
    }
    return result;
  };
}
