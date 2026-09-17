export interface PaginateOptions {
  where?: any;
  orderBy?: any;
  take?: number;
  cursor?: string | null;
  include?: any;
  select?: any;
}

export interface PaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
  count: number;
}

const DEFAULT_TAKE = 20;
const MAX_TAKE = 100;

function encodeCursor(id: string): string {
  return Buffer.from(id).toString('base64url');
}

function decodeCursor(cursor: string): string {
  return Buffer.from(cursor, 'base64url').toString('utf8');
}

/**
 * Pagination cursor-based générique.
 *
 * Avantages vs offset (page=1,2,3...) :
 *  - Stable : insérer/supprimer un item ne décale pas les pages suivantes
 *  - Performant : pas de OFFSET qui scanne tout jusqu'à la position
 */
export async function paginate<T>(
  model: any,
  options: PaginateOptions = {},
): Promise<PaginatedResult<T>> {
  const take = Math.min(Math.max(1, options.take || DEFAULT_TAKE), MAX_TAKE);
  const orderBy = options.orderBy || { createdAt: 'desc' };

  const query: any = {
    where: options.where,
    orderBy,
    take: take + 1,
  };

  if (options.include) query.include = options.include;
  if (options.select) query.select = options.select;

  if (options.cursor) {
    try {
      query.cursor = { id: decodeCursor(options.cursor) };
      query.skip = 1;
    } catch {
      /* curseur invalide → page 1 */
    }
  }

  const rows = (await model.findMany(query)) as T[];

  const hasMore = rows.length > take;
  const items = hasMore ? rows.slice(0, take) : rows;
  const nextCursor =
    hasMore && items.length > 0
      ? encodeCursor((items[items.length - 1] as any).id)
      : null;

  return { items, nextCursor, hasMore, count: items.length };
}
