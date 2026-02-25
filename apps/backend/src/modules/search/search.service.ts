import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client as ElasticsearchClient } from '@elastic/elasticsearch';
import type {
  IndicesCreateRequest,
  SearchRequest,
  SearchResponse,
  BulkRequest,
} from '@elastic/elasticsearch/lib/api/types';
import {
  UserSearchDocument,
  UserSearchFilters,
  UserSearchHit,
  UserSearchResult,
} from './search.interfaces';

const INDEX_NAME = 'luma-users';

/**
 * User profile mapping for Elasticsearch.
 *
 * Defines field types including geo_point for location-based
 * discovery, keyword fields for exact-match filters, and
 * text fields for future full-text search.
 */
const USER_INDEX_MAPPING: IndicesCreateRequest = {
  index: INDEX_NAME,
  settings: {
    number_of_shards: 1,
    number_of_replicas: 0, // single-node dev; increase in production
    refresh_interval: '1s',
  },
  mappings: {
    properties: {
      userId: { type: 'keyword' },
      firstName: { type: 'text', analyzer: 'standard' },
      age: { type: 'integer' },
      gender: { type: 'keyword' },
      intentionTag: { type: 'keyword' },
      bio: { type: 'text', analyzer: 'standard' },
      city: { type: 'keyword' },
      country: { type: 'keyword' },
      location: { type: 'geo_point' },
      isVerified: { type: 'boolean' },
      isFullyVerified: { type: 'boolean' },
      packageTier: { type: 'keyword' },
      isComplete: { type: 'boolean' },
      isActive: { type: 'boolean' },
      isSmsVerified: { type: 'boolean' },
      lastActiveAt: { type: 'date' },
      photoCount: { type: 'integer' },
      primaryPhotoUrl: { type: 'keyword', index: false },
    },
  },
};

const DEFAULT_SEARCH_LIMIT = 50;
const MAX_SEARCH_LIMIT = 200;

@Injectable()
export class SearchService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SearchService.name);
  private client: ElasticsearchClient | null = null;
  private isConnected = false;

  constructor(private readonly configService: ConfigService) {}

  // ─── Lifecycle ──────────────────────────────────────────────

  async onModuleInit(): Promise<void> {
    const esUrl = this.configService.get<string>(
      'ELASTICSEARCH_URL',
      'http://localhost:9200',
    );

    try {
      this.client = new ElasticsearchClient({
        node: esUrl,
        requestTimeout: 5000,
        maxRetries: 3,
      });

      // Verify connection
      const health = await this.client.cluster.health();
      this.isConnected = true;
      this.logger.log(
        `Elasticsearch connected — cluster: ${health.cluster_name}, status: ${health.status}`,
      );

      // Ensure index exists
      await this.ensureIndex();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Elasticsearch connection failed: ${message}. Discovery will fall back to database queries.`,
      );
      this.isConnected = false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.close().catch(() => {
        /* swallow close errors during shutdown */
      });
      this.client = null;
      this.isConnected = false;
    }
  }

  // ─── Index Management ───────────────────────────────────────

  /**
   * Create the user profiles index if it does not exist.
   * Applies the mapping defined in USER_INDEX_MAPPING.
   */
  private async ensureIndex(): Promise<void> {
    if (!this.isAvailable()) return;

    try {
      const exists = await this.client!.indices.exists({ index: INDEX_NAME });
      if (!exists) {
        await this.client!.indices.create(USER_INDEX_MAPPING);
        this.logger.log(`Created Elasticsearch index: ${INDEX_NAME}`);
      } else {
        this.logger.debug(`Elasticsearch index "${INDEX_NAME}" already exists`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to ensure index "${INDEX_NAME}": ${message}`);
    }
  }

  // ─── Document Operations ────────────────────────────────────

  /**
   * Index (upsert) a single user profile document.
   * Call this when a user updates their profile, changes verification
   * status, or upgrades their package.
   */
  async indexUser(doc: UserSearchDocument): Promise<void> {
    if (!this.isAvailable()) return;

    try {
      await this.client!.index({
        index: INDEX_NAME,
        id: doc.userId,
        document: doc,
        refresh: 'wait_for', // make immediately searchable
      });
      this.logger.debug(`Indexed user ${doc.userId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to index user ${doc.userId}: ${message}`);
    }
  }

  /**
   * Bulk-index multiple user documents at once.
   * Useful for initial data seeding or re-indexing.
   */
  async indexUsers(docs: UserSearchDocument[]): Promise<void> {
    if (!this.isAvailable() || docs.length === 0) return;

    try {
      const operations: BulkRequest['operations'] = [];
      for (const doc of docs) {
        operations.push({ index: { _index: INDEX_NAME, _id: doc.userId } });
        operations.push(doc);
      }

      const result = await this.client!.bulk({
        operations,
        refresh: 'wait_for',
      });

      if (result.errors) {
        const errorItems = result.items.filter((item) => item.index?.error);
        this.logger.warn(
          `Bulk index completed with ${errorItems.length} errors out of ${docs.length} documents`,
        );
      } else {
        this.logger.log(`Bulk indexed ${docs.length} users`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Bulk index failed: ${message}`);
    }
  }

  /**
   * Remove a user from the search index.
   * Call this on account deletion or deactivation.
   */
  async removeUser(userId: string): Promise<void> {
    if (!this.isAvailable()) return;

    try {
      await this.client!.delete({
        index: INDEX_NAME,
        id: userId,
        refresh: 'wait_for',
      });
      this.logger.debug(`Removed user ${userId} from index`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // 404 is expected if user was never indexed
      if (!message.includes('not_found')) {
        this.logger.error(`Failed to remove user ${userId}: ${message}`);
      }
    }
  }

  // ─── Search Operations ──────────────────────────────────────

  /**
   * Search for users matching the given filters.
   *
   * Supports:
   *   - Geo-distance filtering and sorting
   *   - Age range filtering
   *   - Gender and intention tag exact-match
   *   - Verified-only filter
   *   - Exclusion of specific user IDs (already swiped/blocked)
   *
   * Returns results sorted by distance (if geo-filter), then by
   * lastActiveAt descending (most recently active first).
   */
  async searchUsers(filters: UserSearchFilters): Promise<UserSearchResult> {
    if (!this.isAvailable()) {
      return { hits: [], total: 0 };
    }

    const limit = Math.min(
      filters.limit ?? DEFAULT_SEARCH_LIMIT,
      MAX_SEARCH_LIMIT,
    );
    const offset = filters.offset ?? 0;

    try {
      // Build must conditions (all must match)
      const must: Record<string, unknown>[] = [
        { term: { isActive: true } },
        { term: { isSmsVerified: true } },
        { term: { isComplete: true } },
      ];

      // Gender filter
      if (filters.gender) {
        must.push({ term: { gender: filters.gender } });
      }

      // Intention tag filter
      if (filters.intentionTag) {
        must.push({ term: { intentionTag: filters.intentionTag } });
      }

      // Verified only
      if (filters.verifiedOnly) {
        must.push({ term: { isVerified: true } });
      }

      // Age range
      if (filters.minAge !== undefined || filters.maxAge !== undefined) {
        const rangeFilter: Record<string, number> = {};
        if (filters.minAge !== undefined) rangeFilter.gte = filters.minAge;
        if (filters.maxAge !== undefined) rangeFilter.lte = filters.maxAge;
        must.push({ range: { age: rangeFilter } });
      }

      // Must-not conditions (exclusions)
      const mustNot: Record<string, unknown>[] = [];
      if (filters.excludeUserIds && filters.excludeUserIds.length > 0) {
        mustNot.push({ terms: { userId: filters.excludeUserIds } });
      }

      // Geo-distance filter
      const geoFilter: Record<string, unknown> | null =
        filters.location && filters.maxDistanceKm
          ? {
              geo_distance: {
                distance: `${filters.maxDistanceKm}km`,
                location: {
                  lat: filters.location.lat,
                  lon: filters.location.lon,
                },
              },
            }
          : null;

      if (geoFilter) {
        must.push(geoFilter);
      }

      // Build sort
      const sort: Record<string, unknown>[] = [];

      // Primary sort: distance (if geo-filter is active)
      if (filters.location) {
        sort.push({
          _geo_distance: {
            location: {
              lat: filters.location.lat,
              lon: filters.location.lon,
            },
            order: 'asc',
            unit: 'km',
            mode: 'min',
            distance_type: 'arc',
          },
        });
      }

      // Secondary sort: recently active
      sort.push({ lastActiveAt: { order: 'desc' } });

      const searchRequest: SearchRequest = {
        index: INDEX_NAME,
        from: offset,
        size: limit,
        query: {
          bool: {
            must,
            must_not: mustNot,
          },
        },
        sort: sort as unknown as SearchRequest['sort'],
        _source: [
          'userId',
          'firstName',
          'age',
          'gender',
          'intentionTag',
          'bio',
          'city',
          'isVerified',
          'packageTier',
          'primaryPhotoUrl',
        ],
      };

      const response: SearchResponse<UserSearchDocument> =
        await this.client!.search(searchRequest);

      const totalValue = response.hits.total;
      const total =
        typeof totalValue === 'number'
          ? totalValue
          : totalValue?.value ?? 0;

      const hits: UserSearchHit[] = response.hits.hits.map((hit) => {
        const source = hit._source as UserSearchDocument;
        // Extract geo distance from sort values (first sort field if geo used)
        let distanceKm: number | null = null;
        if (filters.location && Array.isArray(hit.sort) && hit.sort.length > 0) {
          const rawDistance = hit.sort[0];
          distanceKm =
            typeof rawDistance === 'number'
              ? Math.round(rawDistance * 10) / 10
              : null;
        }

        return {
          userId: source.userId,
          firstName: source.firstName,
          age: source.age,
          gender: source.gender,
          intentionTag: source.intentionTag,
          bio: source.bio,
          city: source.city,
          isVerified: source.isVerified,
          packageTier: source.packageTier,
          primaryPhotoUrl: source.primaryPhotoUrl,
          distanceKm,
        };
      });

      return { hits, total };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Search failed: ${message}`);
      return { hits: [], total: 0 };
    }
  }

  // ─── Utilities ──────────────────────────────────────────────

  /**
   * Check if Elasticsearch is available.
   * Used by DiscoveryService to decide between ES and DB fallback.
   */
  isElasticsearchConnected(): boolean {
    return this.isAvailable();
  }

  /**
   * Delete and recreate the index. Use for testing or schema changes.
   */
  async recreateIndex(): Promise<void> {
    if (!this.isAvailable()) return;

    try {
      const exists = await this.client!.indices.exists({ index: INDEX_NAME });
      if (exists) {
        await this.client!.indices.delete({ index: INDEX_NAME });
        this.logger.log(`Deleted index: ${INDEX_NAME}`);
      }
      await this.client!.indices.create(USER_INDEX_MAPPING);
      this.logger.log(`Recreated index: ${INDEX_NAME}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to recreate index: ${message}`);
    }
  }

  // ─── Private ────────────────────────────────────────────────

  private isAvailable(): boolean {
    return this.client !== null && this.isConnected;
  }
}
