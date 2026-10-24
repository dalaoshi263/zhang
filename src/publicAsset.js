const publicBase = import.meta.env.BASE_URL

export function publicAsset(path) {
  return `${publicBase}${String(path).replace(/^\/+/, '')}`
}
