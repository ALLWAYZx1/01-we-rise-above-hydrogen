import {Link, useLocation} from 'react-router';
import type {PageInfo} from '@shopify/hydrogen/storefront-api-types';

/**
 * ─────────────────────────────────────────────────────────────────────────
 * Local pagination component (Phase 4: retired out of the Phase 1 legacy
 * bridge into the app's own component layer, alongside the local
 * pagination lib in ~/lib/pagination).
 *
 * Server-rendered behavior, matching the repo pattern established in
 * Phase 3: Previous / Next are real links carrying the direction /
 * cursor search params that `getPaginationVariables` (~/lib/pagination)
 * reads on the next request. This is the documented behavior change from
 * the classic client-side Hydrogen `Pagination` component, which
 * accumulated pages in client state; here each page is its own request.
 * `isLoading` is always false.
 * ─────────────────────────────────────────────────────────────────────────
 */

export type PaginationConnection<NodesType> = {
  nodes: NodesType[];
  pageInfo: PageInfo;
};

type PaginationLinkProps = {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: React.MouseEventHandler;
  preventScrollReset?: boolean;
};

export type PaginationRenderArgs<NodesType> = {
  nodes: NodesType[];
  isLoading: boolean;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  NextLink: React.ComponentType<PaginationLinkProps>;
  PreviousLink: React.ComponentType<PaginationLinkProps>;
  nextPageUrl: string;
  previousPageUrl: string;
  state: {pageInfo: PageInfo; nodes: NodesType[]};
};

export function Pagination<NodesType>({
  connection,
  children,
}: {
  connection: PaginationConnection<NodesType>;
  children: (args: PaginationRenderArgs<NodesType>) => React.ReactNode;
}) {
  const location = useLocation();
  const {pageInfo} = connection;

  const buildUrl = (
    direction: 'next' | 'previous',
    cursor: string | null | undefined,
  ) => {
    const params = new URLSearchParams(location.search);
    params.set('direction', direction);
    if (cursor) params.set('cursor', cursor);
    else params.delete('cursor');
    return `${location.pathname}?${params.toString()}`;
  };

  const nextPageUrl = buildUrl('next', pageInfo.endCursor);
  const previousPageUrl = buildUrl('previous', pageInfo.startCursor);

  const NextLink: React.ComponentType<PaginationLinkProps> = ({
    children: linkChildren,
    ...props
  }) =>
    pageInfo.hasNextPage ? (
      <Link to={nextPageUrl} {...props}>
        {linkChildren}
      </Link>
    ) : (
      <span {...props}>{linkChildren}</span>
    );

  const PreviousLink: React.ComponentType<PaginationLinkProps> = ({
    children: linkChildren,
    ...props
  }) =>
    pageInfo.hasPreviousPage ? (
      <Link to={previousPageUrl} {...props}>
        {linkChildren}
      </Link>
    ) : (
      <span {...props}>{linkChildren}</span>
    );

  return (
    <>
      {children({
        nodes: connection.nodes,
        isLoading: false,
        hasNextPage: pageInfo.hasNextPage,
        hasPreviousPage: pageInfo.hasPreviousPage,
        NextLink,
        PreviousLink,
        nextPageUrl,
        previousPageUrl,
        state: {pageInfo, nodes: connection.nodes},
      })}
    </>
  );
}
