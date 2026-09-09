import 'server-only'

export function getCheckoutUpstreamOrigin(request: Request, siteUrl: string) {
  const incomingOrigin = request.headers.get('origin')?.trim()

  if (!incomingOrigin) {
    return null
  }

  try {
    const normalizedIncomingOrigin = new URL(incomingOrigin).origin
    const requestOrigin = new URL(request.url).origin

    if (normalizedIncomingOrigin !== requestOrigin) {
      return null
    }

    return new URL(siteUrl).origin
  } catch {
    return null
  }
}
