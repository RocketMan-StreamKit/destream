export const mergeDestreamParams = async <T extends Record<string, unknown>>(
  patch: T
) => {
  const current = await api.config.getParams<Record<string, unknown>>();
  return api.config.updateParams({ ...current, ...patch });
};
