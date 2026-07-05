export const updateKeys = {
  all: ["update"] as const,
  status: () => [...updateKeys.all, "status"] as const,
};
