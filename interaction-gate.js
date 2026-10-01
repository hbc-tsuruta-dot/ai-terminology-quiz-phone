export function createInteractionGate() {
  const active = new Set();

  return {
    run(key, operation) {
      if (active.has(key)) return false;
      active.add(key);

      try {
        const result = operation();
        if (result?.then) {
          return Promise.resolve(result).finally(() => active.delete(key));
        }
        active.delete(key);
        return result;
      } catch (error) {
        active.delete(key);
        throw error;
      }
    },
  };
}
