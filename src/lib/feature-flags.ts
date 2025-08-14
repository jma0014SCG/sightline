/**
 * Feature flag system for safe rollout of new features
 * Uses localStorage for persistence and environment variables for defaults
 */

export interface FeatureFlags {
  improvedSummaryLayout: boolean;
  // Add more feature flags here as needed
}

const DEFAULT_FLAGS: FeatureFlags = {
  improvedSummaryLayout: process.env.NEXT_PUBLIC_IMPROVED_SUMMARY_LAYOUT === 'true' || true,
};

class FeatureFlagManager {
  private flags: FeatureFlags;
  private storageKey = 'sightline_feature_flags';

  constructor() {
    this.flags = this.loadFlags();
  }

  private loadFlags(): FeatureFlags {
    if (typeof window === 'undefined') {
      return DEFAULT_FLAGS;
    }

    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        return { ...DEFAULT_FLAGS, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Failed to load feature flags:', error);
    }

    return DEFAULT_FLAGS;
  }

  private saveFlags(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.flags));
    } catch (error) {
      console.error('Failed to save feature flags:', error);
    }
  }

  public isEnabled(flag: keyof FeatureFlags): boolean {
    return this.flags[flag] ?? DEFAULT_FLAGS[flag];
  }

  public setFlag(flag: keyof FeatureFlags, enabled: boolean): void {
    this.flags[flag] = enabled;
    this.saveFlags();
  }

  public getAllFlags(): FeatureFlags {
    return { ...this.flags };
  }

  public resetToDefaults(): void {
    this.flags = DEFAULT_FLAGS;
    this.saveFlags();
  }

  // Enable feature for specific user IDs (for gradual rollout)
  public enableForUser(userId: string, percentage: number = 10): boolean {
    // Simple hash-based rollout
    const hash = userId.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    
    return Math.abs(hash) % 100 < percentage;
  }
}

export const featureFlags = new FeatureFlagManager();

// Hook for React components
import { useState, useEffect } from 'react';

export function useFeatureFlag(flag: keyof FeatureFlags): boolean {
  const [enabled, setEnabled] = useState(() => featureFlags.isEnabled(flag));

  useEffect(() => {
    // Re-check on mount in case localStorage changed
    setEnabled(featureFlags.isEnabled(flag));
  }, [flag]);

  return enabled;
}