function getHostname(value: string): string | null {
  try {
    const url = value.includes('://') ? new URL(value) : new URL(`https://${value}`);
    return url.hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function getInternalMenuUrl(
  value: string,
  publicStoreDomain: string,
  primaryDomainUrl: string,
) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return value;
    }
    const hostname = url.hostname.toLowerCase();
    const publicStoreHostname = getHostname(publicStoreDomain);
    const primaryHostname = getHostname(primaryDomainUrl);
    const isMyshopifyDomain =
      hostname === 'myshopify.com' || hostname.endsWith('.myshopify.com');

    if (
      isMyshopifyDomain ||
      hostname === publicStoreHostname ||
      hostname === primaryHostname
    ) {
      return url.pathname;
    }
  } catch {
    // Relative menu URLs are already internal.
  }

  return value;
}
