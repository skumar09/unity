export function getExtension(name) {
    return name && name.includes('.') ? name.split('.').pop() : '';
  }

export function removeExtension(name) {
  if (name == null) return name;
  const lastDot = name.lastIndexOf('.');
  return lastDot >= 0 && lastDot < name.length - 1 ? name.substring(0, lastDot) : name;
}