export function calculateCompletionRate(progress, total) {
  const viewed = new Set(progress?.viewed || []);
  if (!total) return 0;
  return Math.round((viewed.size / total) * 100);
}
