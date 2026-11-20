function getHostname(value: string): string | null {
  try {
    return new URL(
      value.includes('://') ? value : `https://${value}`,
    ).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function getMenuLinkUrl(
  url: string,
  publicStoreDomain: string,
  primaryDomainUrl: string,
): string {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(url, 'https://internal-menu.invalid');
  } catch {
    return url;
  }

  const hostname = parsedUrl.hostname.toLowerCase();
  const publicHostname = getHostname(publicStoreDomain);
  const primaryHostname = getHostname(primaryDomainUrl);
  const isMyshopifyDomain =
    hostname === 'myshopify.com' || hostname.endsWith('.myshopify.com');
  const isStoreDomain =
    (publicHostname !== null && hostname === publicHostname) ||
    (primaryHostname !== null && hostname === primaryHostname);

  return isMyshopifyDomain || isStoreDomain ? parsedUrl.pathname : url;
}
