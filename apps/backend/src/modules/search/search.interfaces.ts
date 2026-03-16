/**
 * Elasticsearch type definitions for LUMA V1 search/discovery.
 *
 * These interfaces define the shape of indexed documents and
 * query filters used by the SearchService.
 */

/** Document shape stored in the 'luma-users' Elasticsearch index. */
export interface UserSearchDocument {
  /** User UUID — also serves as the ES document _id */
  userId: string;
  firstName: string;
  age: number;
  gender: string;
  intentionTag: string;
  bio: string | null;
  city: string | null;
  country: string | null;
  /** Elasticsearch geo_point: { lat, lon } */
  location: { lat: number; lon: number } | null;
  isVerified: boolean;
  isFullyVerified: boolean;
  packageTier: string;
  isComplete: boolean;
  isActive: boolean;
  isSmsVerified: boolean;
  lastActiveAt: string; // ISO date string
  photoCount: number;
  primaryPhotoUrl: string | null;
}

/** Filters accepted by SearchService.searchUsers() */
export interface UserSearchFilters {
  /** Exclude these user IDs from results */
  excludeUserIds?: string[];
  /** Geographic center for distance filter */
  location?: { lat: number; lon: number };
  /** Maximum distance in kilometers */
  maxDistanceKm?: number;
  /** Minimum age */
  minAge?: number;
  /** Maximum age */
  maxAge?: number;
  /** Filter by gender */
  gender?: string;
  /** Filter by intention tag (LOCKED: 3 tags) */
  intentionTag?: string;
  /** Only return verified users */
  verifiedOnly?: boolean;
  /** Number of results to return */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

/** A single hit returned from an Elasticsearch search */
export interface UserSearchHit {
  userId: string;
  firstName: string;
  age: number;
  gender: string;
  intentionTag: string;
  bio: string | null;
  city: string | null;
  isVerified: boolean;
  packageTier: string;
  primaryPhotoUrl: string | null;
  /** Distance in km from the search origin (if geo-filter was used) */
  distanceKm: number | null;
}

/** Aggregated search response */
export interface UserSearchResult {
  hits: UserSearchHit[];
  total: number;
}
