// Giphy API service — search and trending GIF fetching
// Uses Giphy's free tier API for development

import { APP_CONFIG } from '../constants/config';

// ─── Types ──────────────────────────────────────────────────

export interface GiphyImage {
  url: string;
  width: string;
  height: string;
}

export interface GiphyGif {
  id: string;
  url: string;
  previewUrl: string;
  width: number;
  height: number;
  title: string;
}

interface GiphyApiImage {
  url: string;
  width: string;
  height: string;
}

interface GiphyApiItem {
  id: string;
  title: string;
  images: {
    original: GiphyApiImage;
    fixed_height_small: GiphyApiImage;
    downsized: GiphyApiImage;
    fixed_width: GiphyApiImage;
  };
}

interface GiphyApiResponse {
  data: GiphyApiItem[];
  pagination: {
    total_count: number;
    count: number;
    offset: number;
  };
}

// ─── Config ─────────────────────────────────────────────────

// Giphy public beta key for development — replace with production key via env
const GIPHY_API_KEY = (APP_CONFIG as Record<string, string>).GIPHY_API_KEY || 'GlVGYHkr3WSBnllca54iNt0yFbjz7L65';
const GIPHY_BASE_URL = 'https://api.giphy.com/v1/gifs';
const DEFAULT_LIMIT = 20;

// ─── Helpers ────────────────────────────────────────────────

const mapGiphyItem = (item: GiphyApiItem): GiphyGif => {
  const preview = item.images.fixed_height_small ?? item.images.downsized;
  const original = item.images.original;

  return {
    id: item.id,
    url: original.url,
    previewUrl: preview.url,
    width: parseInt(preview.width, 10) || 200,
    height: parseInt(preview.height, 10) || 200,
    title: item.title,
  };
};

// ─── Service ────────────────────────────────────────────────

export const giphyService = {
  /**
   * Search GIFs by query string.
   * Returns mapped GIF objects with preview and full URLs.
   */
  searchGifs: async (
    query: string,
    offset = 0,
    limit = DEFAULT_LIMIT,
  ): Promise<{ gifs: GiphyGif[]; totalCount: number; offset: number }> => {
    try {
      const params = new URLSearchParams({
        api_key: GIPHY_API_KEY,
        q: query,
        limit: String(limit),
        offset: String(offset),
        rating: 'pg-13',
        lang: 'tr',
      });

      const response = await fetch(`${GIPHY_BASE_URL}/search?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`Giphy API hatasi: ${response.status}`);
      }

      const data: GiphyApiResponse = await response.json();

      return {
        gifs: data.data.map(mapGiphyItem),
        totalCount: data.pagination.total_count,
        offset: data.pagination.offset + data.pagination.count,
      };
    } catch (error) {
      if (__DEV__) {
        console.warn('GIF arama hatasi:', error);
      }
      throw new Error('GIF aranamadı. Lütfen tekrar deneyin.');
    }
  },

  /**
   * Get trending GIFs.
   * Shown by default when the GIF picker opens without a search query.
   */
  getTrending: async (
    offset = 0,
    limit = DEFAULT_LIMIT,
  ): Promise<{ gifs: GiphyGif[]; totalCount: number; offset: number }> => {
    try {
      const params = new URLSearchParams({
        api_key: GIPHY_API_KEY,
        limit: String(limit),
        offset: String(offset),
        rating: 'pg-13',
      });

      const response = await fetch(`${GIPHY_BASE_URL}/trending?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`Giphy API hatasi: ${response.status}`);
      }

      const data: GiphyApiResponse = await response.json();

      return {
        gifs: data.data.map(mapGiphyItem),
        totalCount: data.pagination.total_count,
        offset: data.pagination.offset + data.pagination.count,
      };
    } catch (error) {
      if (__DEV__) {
        console.warn('Trending GIF hatasi:', error);
      }
      throw new Error('Trend GIF\'ler yüklenemedi. Lütfen tekrar deneyin.');
    }
  },

  /**
   * Get a single GIF by its Giphy ID.
   */
  getGifById: async (id: string): Promise<GiphyGif | null> => {
    try {
      const params = new URLSearchParams({
        api_key: GIPHY_API_KEY,
      });

      const response = await fetch(`${GIPHY_BASE_URL}/${id}?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`Giphy API hatasi: ${response.status}`);
      }

      const data: { data: GiphyApiItem } = await response.json();
      return mapGiphyItem(data.data);
    } catch (error) {
      if (__DEV__) {
        console.warn('GIF detay hatasi:', error);
      }
      return null;
    }
  },
};
