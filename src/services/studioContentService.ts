import {
  getAppearanceSettings,
  subscribeAppearanceSettings,
  updateAppearanceSettings,
  uploadShowcaseImage,
  AppearanceSettings,
  DEFAULT_APPEARANCE_SETTINGS,
} from './settingsService';

export interface StudioBranding {
  studioName: string;
  tagline: string;
  heroBadge: string;
  heroHeadline: string;
  heroSubtitle: string;
  primaryAccentColor: string;
}

export interface StudioContentData {
  heroImages: string[];
  browsePhotos: string[];
  branding: StudioBranding;
  updatedAt: string;
  updatedBy: string;
  updatedByEmail: string;
}

function mapToStudioContent(settings: AppearanceSettings): StudioContentData {
  return {
    heroImages:
      settings.heroMontageImages && settings.heroMontageImages.length > 0
        ? settings.heroMontageImages
        : DEFAULT_APPEARANCE_SETTINGS.heroMontageImages,
    browsePhotos:
      settings.browsePhotos && settings.browsePhotos.length > 0
        ? settings.browsePhotos
        : DEFAULT_APPEARANCE_SETTINGS.browsePhotos,
    branding: {
      studioName: settings.studioName || DEFAULT_APPEARANCE_SETTINGS.studioName || "Beki's Studio",
      tagline: settings.brandTagline || DEFAULT_APPEARANCE_SETTINGS.brandTagline || '',
      heroBadge: settings.badgeText || DEFAULT_APPEARANCE_SETTINGS.badgeText || '',
      heroHeadline: settings.brandTagline || DEFAULT_APPEARANCE_SETTINGS.brandTagline || '',
      heroSubtitle: settings.brandSubtitle || DEFAULT_APPEARANCE_SETTINGS.brandSubtitle || '',
      primaryAccentColor: settings.primaryColor || '#C8A96B',
    },
    updatedAt: settings.updatedAt || new Date().toISOString(),
    updatedBy: settings.updatedBy || 'admin',
    updatedByEmail: settings.updatedByEmail || 'admin@bekisstudio.com',
  };
}

/**
 * StudioContentService: Simple, direct manager for welcome page images and branding.
 * Unified with SettingsService so any changes in Admin Settings or Studio Content
 * immediately synchronize across the welcome page in real time.
 */
export const StudioContentService = {
  /**
   * Fetch current live homepage content from Firestore.
   */
  async getStudioContent(): Promise<StudioContentData> {
    const settings = await getAppearanceSettings();
    return mapToStudioContent(settings);
  },

  /**
   * Subscribe to real-time homepage content updates from Firestore.
   */
  subscribeStudioContent(callback: (content: StudioContentData) => void): () => void {
    return subscribeAppearanceSettings((settings) => {
      callback(mapToStudioContent(settings));
    });
  },

  /**
   * Upload an image asset directly via integrated server storage endpoint.
   */
  async uploadAsset(file: File): Promise<string> {
    return uploadShowcaseImage(file);
  },

  /**
   * Add a new hero image (simple, no description required).
   */
  async addHeroImage(imageUrl: string): Promise<string[]> {
    const current = await getAppearanceSettings();
    const heroMontageImages = [imageUrl, ...current.heroMontageImages];
    await updateAppearanceSettings({ heroMontageImages });
    return heroMontageImages;
  },

  /**
   * Remove a hero image by index.
   */
  async removeHeroImage(index: number): Promise<string[]> {
    const current = await getAppearanceSettings();
    const heroMontageImages = current.heroMontageImages.filter((_, i) => i !== index);
    await updateAppearanceSettings({ heroMontageImages });
    return heroMontageImages;
  },

  /**
   * Update a hero image at a specific index.
   */
  async updateHeroImage(index: number, newUrl: string): Promise<string[]> {
    const current = await getAppearanceSettings();
    const heroMontageImages = [...current.heroMontageImages];
    heroMontageImages[index] = newUrl;
    await updateAppearanceSettings({ heroMontageImages });
    return heroMontageImages;
  },

  /**
   * Reorder hero images.
   */
  async reorderHeroImages(newOrder: string[]): Promise<string[]> {
    await updateAppearanceSettings({ heroMontageImages: newOrder });
    return newOrder;
  },

  /**
   * Add a browse photo (simple, no description required).
   */
  async addBrowsePhoto(imageUrl: string): Promise<string[]> {
    const current = await getAppearanceSettings();
    const browsePhotos = [imageUrl, ...current.browsePhotos];
    await updateAppearanceSettings({ browsePhotos });
    return browsePhotos;
  },

  /**
   * Remove a browse photo by index.
   */
  async removeBrowsePhoto(index: number): Promise<string[]> {
    const current = await getAppearanceSettings();
    const browsePhotos = current.browsePhotos.filter((_, i) => i !== index);
    await updateAppearanceSettings({ browsePhotos });
    return browsePhotos;
  },

  /**
   * Update a browse photo at a specific index.
   */
  async updateBrowsePhoto(index: number, newUrl: string): Promise<string[]> {
    const current = await getAppearanceSettings();
    const browsePhotos = [...current.browsePhotos];
    browsePhotos[index] = newUrl;
    await updateAppearanceSettings({ browsePhotos });
    return browsePhotos;
  },

  /**
   * Update branding copy.
   */
  async updateBranding(branding: Partial<StudioBranding>): Promise<void> {
    const updates: Partial<AppearanceSettings> = {};
    if (branding.heroHeadline !== undefined) updates.brandTagline = branding.heroHeadline;
    if (branding.tagline !== undefined && !branding.heroHeadline) updates.brandTagline = branding.tagline;
    if (branding.heroSubtitle !== undefined) updates.brandSubtitle = branding.heroSubtitle;
    if (branding.heroBadge !== undefined) updates.badgeText = branding.heroBadge;
    if (branding.studioName !== undefined) updates.studioName = branding.studioName;
    if (branding.primaryAccentColor !== undefined) updates.primaryColor = branding.primaryAccentColor;
    await updateAppearanceSettings(updates);
  },
};
