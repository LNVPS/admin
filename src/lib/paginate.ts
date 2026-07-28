import type { PaginatedApiResponse } from "./api";

/**
 * The largest page any admin list endpoint will serve.
 *
 * The API clamps rather than rejects (`limit.unwrap_or(50).min(100)`), so a
 * request for 200 rows succeeds and quietly returns 100. Anything that needs
 * the full set has to page for it — see {@link fetchAllPages}.
 */
export const MAX_PAGE_LIMIT = 100;

/**
 * Read a paginated admin endpoint to exhaustion.
 *
 * Used where the whole set is needed rather than a page of it — typically
 * resolving ids to names, which degrades to `#147` placeholders the moment the
 * list outgrows one page. Stops on a short page as well as on `total`, so a
 * miscounted `total` cannot spin this forever, and `maxItems` bounds it
 * regardless.
 */
export async function fetchAllPages<T>(
  fetchPage: (params: { limit: number; offset: number }) => Promise<PaginatedApiResponse<T>>,
  options?: { limit?: number; maxItems?: number },
): Promise<T[]> {
  const limit = Math.min(options?.limit ?? MAX_PAGE_LIMIT, MAX_PAGE_LIMIT);
  const maxItems = options?.maxItems ?? 10_000;
  const items: T[] = [];

  for (let offset = 0; offset < maxItems; offset += limit) {
    const page = await fetchPage({ limit, offset });
    items.push(...page.data);
    // A short page is the end of the data regardless of what `total` claims.
    if (page.data.length < limit) break;
    if (items.length >= page.total) break;
  }

  return items.slice(0, maxItems);
}
