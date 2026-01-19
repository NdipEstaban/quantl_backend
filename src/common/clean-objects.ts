// Helper to remove undefined values
const cleanObject = <T extends object>(obj: T): Partial<T> => {
  return Object.fromEntries(Object.entries(obj).filter(([_, v]) => v !== undefined)) as Partial<T>;
};

export default cleanObject;