/**
 * Local replacement for the classic Hydrogen `getPaginationVariables`
 * helper, which Hydrogen 2026.10 no longer exports. Reads the same
 * `direction` / `cursor` search params that PaginatedResourceSection's
 * Previous / Next links emit.
 */
export function getPaginationVariables(
  request: Request,
  {pageBy = 20}: {pageBy?: number} = {},
) {
  const searchParams = new URLSearchParams(new URL(request.url).search);
  const direction = searchParams.get('direction');
  const cursor = searchParams.get('cursor');

  if (direction === 'previous') {
    return {
      first: null,
      last: pageBy,
      startCursor: cursor,
      endCursor: null,
    };
  }

  return {
    first: pageBy,
    last: null,
    startCursor: null,
    endCursor: cursor,
  };
}
