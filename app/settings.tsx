/**
 * Settings: Language, Profil (Name, Avatar), theme, sound, haptics, AI difficulty.
 */

import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../lib/theme/ThemeProvider';
import { useSettingsStore } from '../lib/store/settingsStore';
import { useStatsStore } from '../lib/store/statsStore';
import { usePurchasesStore } from '../lib/store/purchasesStore';
import { themes } from '../lib/theme/themes';
import { getAvailableThemeIds } from '../lib/theme/availableThemes';
import type { ThemeId } from '../lib/theme/types';
import type { AIDifficulty } from '../lib/game/types';
import { PRODUCT_IDS, PRODUCT_DISPLAY, type ProductId } from '../lib/iap/products';
import { cardShadow } from '../lib/theme/cardStyles';
import { PressableScale } from '../lib/components/PressableScale';

const AVATAR_COLORS = ['#8B6914', '#2196F3', '#4CAF50', '#E74C3C', '#9C27B0', '#FF9800'];
const AVATAR_ICONS = ['account', 'crown', 'star', 'chess-queen', 'shield-account'] as const;
const DIFFICULTIES: AIDifficulty[] = ['beginner', 'easy', 'medium', 'hard', 'unfair'];
const DIFFICULTIES_ROW1: AIDifficulty[] = ['beginner', 'easy', 'medium'];
const DIFFICULTIES_ROW2: AIDifficulty[] = ['hard', 'unfair'];

/** Only these IAP items are shown in settings. Theme items (Neon, Marmor, Bundle) removed. */
const SHOP_PRODUCT_IDS = [
  PRODUCT_IDS.WERBEFREI,
  PRODUCT_IDS.PUZZLE_PACK_EXPERT,
] as const;

const SHOP_NAME_KEYS: Record<string, string> = {
  [PRODUCT_IDS.WERBEFREI]: 'shop.adFree',
  [PRODUCT_IDS.PUZZLE_PACK_EXPERT]: 'shop.puzzlePackExpert',
};
const SHOP_DESC_KEYS: Record<string, string> = {
  [PRODUCT_IDS.WERBEFREI]: 'shop.adFreeDesc',
  [PRODUCT_IDS.PUZZLE_PACK_EXPERT]: 'shop.puzzlePackExpertDescComingSoon',
};
/** Puzzle-Paket: Experte is shown but not purchasable (coming soon). */
const SHOP_PUZZLE_PACK_LOCKED = PRODUCT_IDS.PUZZLE_PACK_EXPERT;

const THEME_KEY_BY_ID: Record<string, string> = {
  holz: 'wood',
  minimal: 'minimal',
  dark: 'dark',
  pixel: 'pixel',
  vintage: 'vintage',
};

function getUnlockedThemeIdsFromAchievements(unlockedAchievementAt: Record<string, number>): string[] {
  const ids: string[] = [];
  if (unlockedAchievementAt['blitz_koenig']) ids.push('pixel');
  if (unlockedAchievementAt['puzzle_meister']) ids.push('vintage');
  return ids;
}

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { theme, setThemeId } = useTheme();
  const unlockedAchievementAt = useStatsStore((s) => s.unlockedAchievementAt);
  const unlockedThemeIds = React.useMemo(
    () => getUnlockedThemeIdsFromAchievements(unlockedAchievementAt),
    [unlockedAchievementAt]
  );
  const hasTheme = usePurchasesStore((s) => s.hasTheme);
  const purchase = usePurchasesStore((s) => s.purchase);
  const restorePurchases = usePurchasesStore((s) => s.restorePurchases);
  const [shopLoading, setShopLoading] = React.useState<string | null>(null);
  const [shopError, setShopError] = React.useState<string | null>(null);
  const selectableThemeIds = React.useMemo(
    () => getAvailableThemeIds(unlockedThemeIds, hasTheme),
    [unlockedThemeIds, hasTheme]
  );
  const {
    playerName,
    avatarColor,
    avatarIcon,
    themeId,
    soundEnabled,
    hapticsEnabled,
    undoEnabled,
    coachEnabled,
    aiDifficulty,
    setPlayerName,
    setAvatarColor,
    setAvatarIcon,
    setSoundEnabled,
    setHapticsEnabled,
    setUndoEnabled,
    setCoachEnabled,
    setAIDifficulty,
  } = useSettingsStore();

  const handlePurchase = async (productId: string) => {
    setShopError(null);
    setShopLoading(productId);
    const { error } = await purchase(productId as ProductId);
    setShopLoading(null);
    if (error) setShopError(error);
  };

  const handleRestore = async () => {
    setShopError(null);
    setShopLoading('restore');
    const { error } = await restorePurchases();
    setShopLoading(null);
    if (error) setShopError(error);
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      padding: 24,
    },
    section: {
      marginBottom: 28,
    },
    sectionDivider: {
      height: 1,
      backgroundColor: theme.borderColor,
      marginBottom: 20,
      opacity: 0.6,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.fontColor,
      marginBottom: 16,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderColor,
    },
    label: {
      fontSize: 16,
      color: theme.fontColor,
    },
    themeRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginTop: 8,
    },
    themeChip: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 20,
      borderWidth: 2,
    },
    themeChipText: {
      fontSize: 14,
      fontWeight: '600',
    },
    diffRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 8,
    },
    diffRowSecond: {
      marginTop: 8,
    },
    diffChip: {
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 10,
      borderWidth: 1,
      minWidth: 72,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.borderColor,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      color: theme.fontColor,
      backgroundColor: theme.cardBackground,
      minHeight: 44,
    },
    avatarColorWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginTop: 8,
    },
    avatarColorDot: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 3,
    },
    avatarIconWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginTop: 8,
    },
    avatarIconBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 2,
      justifyContent: 'center',
      alignItems: 'center',
    },
    shopCard: {
      backgroundColor: theme.cardBackground,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      ...cardShadow,
    },
    shopItemTitle: { fontSize: 16, fontWeight: '600', color: theme.fontColor },
    shopItemDesc: { fontSize: 14, color: theme.fontColorSecondary, marginTop: 4 },
    shopCardFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      marginTop: 12,
    },
    shopButton: {
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 10,
      backgroundColor: theme.colors.accent,
      minHeight: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    shopButtonText: { fontSize: 16, fontWeight: '600', color: theme.cardBackground },
    restoreButton: {
      marginTop: 16,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: theme.borderColor,
      minHeight: 44,
      justifyContent: 'center',
      alignSelf: 'flex-start',
    },
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 48 }}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.profile')}</Text>
        <Text style={[styles.label, { marginBottom: 6 }]}>{t('settings.playerName')}</Text>
        <TextInput
          style={styles.input}
          value={playerName}
          onChangeText={setPlayerName}
          placeholder={t('settings.playerName')}
          placeholderTextColor={theme.fontColorSecondary}
        />
        <Text style={[styles.label, { marginTop: 16, marginBottom: 6 }]}>{t('settings.avatarColor')}</Text>
        <View style={styles.avatarColorWrap}>
          {AVATAR_COLORS.map((color) => (
            <TouchableOpacity
              key={color}
              style={[
                styles.avatarColorDot,
                { backgroundColor: color, borderColor: avatarColor === color ? theme.colors.accent : 'transparent' },
              ]}
              onPress={() => setAvatarColor(color)}
            />
          ))}
        </View>
        <Text style={[styles.label, { marginTop: 16, marginBottom: 6 }]}>{t('settings.avatarIcon')}</Text>
        <View style={styles.avatarIconWrap}>
          {AVATAR_ICONS.map((icon) => (
            <TouchableOpacity
              key={icon}
              style={[
                styles.avatarIconBtn,
                {
                  backgroundColor: theme.cardBackground,
                  borderColor: avatarIcon === icon ? theme.colors.accent : theme.borderColor,
                },
              ]}
              onPress={() => setAvatarIcon(icon)}
            >
              <MaterialCommunityIcons
                name={icon}
                size={24}
                color={avatarIcon === icon ? theme.colors.accent : theme.fontColor}
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.sectionDivider} />
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.design')}</Text>
        <View style={styles.themeRow}>
          {selectableThemeIds.map((id) => {
            const themeDef = themes[id];
            if (!themeDef) return null;
            const active = themeId === id;
            const nameKey = THEME_KEY_BY_ID[id];
            const displayName = nameKey ? t(`themes.${nameKey}`) : themeDef.name;
            return (
              <TouchableOpacity
                key={id}
                style={[
                  styles.themeChip,
                  {
                    backgroundColor: themeDef.colors.background,
                    borderColor: active ? themeDef.colors.accent : themeDef.borderColor,
                  },
                ]}
                onPress={() => setThemeId(id as ThemeId)}
              >
                <Text style={[styles.themeChipText, { color: themeDef.fontColor }]}>{displayName}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.sectionDivider} />
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.soundHaptics')}</Text>
        <View style={styles.row}>
          <Text style={styles.label}>{t('settings.sound')}</Text>
          <TouchableOpacity onPress={() => setSoundEnabled(!soundEnabled)}>
            <Text style={{ color: theme.colors.accent, fontWeight: '600' }}>
              {soundEnabled ? t('common.on') : t('common.off')}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>{t('settings.haptics')}</Text>
          <TouchableOpacity onPress={() => setHapticsEnabled(!hapticsEnabled)}>
            <Text style={{ color: theme.colors.accent, fontWeight: '600' }}>
              {hapticsEnabled ? t('common.on') : t('common.off')}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.row}>
          <View>
            <Text style={styles.label}>{t('settings.undo')}</Text>
            <Text style={[styles.label, { fontSize: 12, opacity: 0.8, marginTop: 2 }]}>
              {t('settings.undoDescription')}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setUndoEnabled(!undoEnabled)}>
            <Text style={{ color: theme.colors.accent, fontWeight: '600' }}>
              {undoEnabled ? t('common.on') : t('common.off')}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.row}>
          <View>
            <Text style={styles.label}>💡 {t('settings.coach')}</Text>
            <Text style={[styles.label, { fontSize: 12, opacity: 0.8, marginTop: 2 }]}>
              {t('settings.coachDescription')}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setCoachEnabled(!coachEnabled)}>
            <Text style={{ color: theme.colors.accent, fontWeight: '600' }}>
              {coachEnabled ? t('common.on') : t('common.off')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.sectionDivider} />
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.aiDifficulty')}</Text>
        <View style={styles.diffRow}>
          {DIFFICULTIES_ROW1.map((d) => {
            const active = aiDifficulty === d;
            const label = t(`play.difficultyLevels.${d}`);
            return (
              <TouchableOpacity
                key={d}
                style={[
                  styles.diffChip,
                  {
                    backgroundColor: active ? theme.colors.accent : theme.cardBackground,
                    borderColor: theme.borderColor,
                  },
                ]}
                onPress={() => setAIDifficulty(d)}
              >
                <Text
                  style={[
                    styles.themeChipText,
                    { color: active ? theme.cardBackground : theme.fontColor },
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={[styles.diffRow, styles.diffRowSecond]}>
          {DIFFICULTIES_ROW2.map((d) => {
            const active = aiDifficulty === d;
            const label = t(`play.difficultyLevels.${d}`);
            return (
              <TouchableOpacity
                key={d}
                style={[
                  styles.diffChip,
                  {
                    backgroundColor: active ? theme.colors.accent : theme.cardBackground,
                    borderColor: theme.borderColor,
                  },
                ]}
                onPress={() => setAIDifficulty(d)}
              >
                <Text
                  style={[
                    styles.themeChipText,
                    { color: active ? theme.cardBackground : theme.fontColor },
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.sectionDivider} />
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.inAppPurchases')}</Text>
        {shopError ? (
          <Text style={[styles.shopItemDesc, { color: theme.colors.error || '#c62828', marginBottom: 12 }]}>
            {shopError}
          </Text>
        ) : null}
        {SHOP_PRODUCT_IDS.map((id) => {
          const info = PRODUCT_DISPLAY[id];
          if (!info) return null;
          const loading = shopLoading === id;
          const nameKey = SHOP_NAME_KEYS[id];
          const descKey = SHOP_DESC_KEYS[id];
          const isPuzzlePackLocked = id === SHOP_PUZZLE_PACK_LOCKED;
          return (
            <View key={id} style={styles.shopCard}>
              <Text style={styles.shopItemTitle}>{nameKey ? t(nameKey) : info.name}</Text>
              <Text style={styles.shopItemDesc}>{descKey ? t(descKey) : info.description}</Text>
              <View style={styles.shopCardFooter}>
                <PressableScale
                  style={[
                    styles.shopButton,
                    loading && { opacity: 0.6 },
                    isPuzzlePackLocked && { opacity: 0.5 },
                  ]}
                  onPress={() => !isPuzzlePackLocked && handlePurchase(id)}
                  scaleTo={0.97}
                  disabled={!!shopLoading || isPuzzlePackLocked}
                >
                  <Text style={styles.shopButtonText}>
                    {loading ? '…' : isPuzzlePackLocked ? t('iap.comingSoon') : `${t('settings.buy')} ${info.price}`}
                  </Text>
                </PressableScale>
              </View>
            </View>
          );
        })}
        <PressableScale
          style={[styles.restoreButton, shopLoading === 'restore' && { opacity: 0.6 }]}
          onPress={handleRestore}
          scaleTo={0.97}
          disabled={!!shopLoading}
        >
          <Text style={[styles.shopItemTitle, { margin: 0 }]}>
            {shopLoading === 'restore' ? '…' : t('settings.restorePurchases')}
          </Text>
        </PressableScale>
      </View>
    </ScrollView>
  );
}
