/**
 * Game mode selection: AI, Local, Online, Blitz.
 * Blitz opens timer selection (Bullet/Blitz/Rapid/Custom) before start.
 */

import React, { useCallback, useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
  Dimensions,
  LayoutAnimation,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../lib/theme/ThemeProvider';
import { cardShadow } from '../../lib/theme/cardStyles';
import { PressableScale } from '../../lib/components/PressableScale';
import { useGameStore } from '../../lib/store/gameStore';
import { useSettingsStore } from '../../lib/store/settingsStore';
import {
  getTimerConfig,
  TIMER_PRESETS,
  CUSTOM_MINUTE_OPTIONS,
  type TimerConfig,
  type TimerPreset,
} from '../../lib/game/timerConfig';
import { useTagTeamStore } from '../../lib/store/tagTeamStore';
import type { TagTeamConfig } from '../../lib/game/tagTeamTypes';
import type { AIDifficulty } from '../../lib/game/types';
import { isFeatureEnabled } from '../../lib/features';

const MODE_IDS = [
  { id: 'ai' as const, titleKey: 'play.vsAi', subtitleKey: 'play.vsAiSubtitle', icon: 'robot' as const, available: true },
  { id: 'local' as const, titleKey: 'play.vsLocal', subtitleKey: 'play.vsLocalSubtitle', icon: 'account-multiple' as const, available: true },
  { id: 'tagteam' as const, titleKey: 'play.tagTeam', subtitleKey: 'play.tagTeamDesc', icon: 'account-group' as const, available: true },
  { id: 'online' as const, titleKey: 'play.vsOnline', subtitleKey: 'play.vsOnlineSubtitle', icon: 'cloud' as const, available: isFeatureEnabled('online') },
  { id: 'blitz' as const, titleKey: 'play.blitz', subtitleKey: 'play.vsBlitzSubtitle', icon: 'timer' as const, available: isFeatureEnabled('blitz') },
];

const AI_DIFFICULTIES: AIDifficulty[] = ['beginner', 'easy', 'medium', 'hard', 'unfair'];

export default function PlayScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { theme } = useTheme();
  const { startGame } = useGameStore();
  const { startTagTeamGame } = useTagTeamStore();
  const aiDifficulty = useSettingsStore((s) => s.aiDifficulty);
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<TimerPreset>('blitz');
  const [customMinutes, setCustomMinutes] = useState(5);
  const [showAiDifficultyModal, setShowAiDifficultyModal] = useState(false);
  const [selectedAiDifficulty, setSelectedAiDifficulty] = useState<AIDifficulty>('medium');
  const [showTagTeamModal, setShowTagTeamModal] = useState(false);
  const [showTagTeamInfoModal, setShowTagTeamInfoModal] = useState(false);
  const [showTagTeamHowItWorks, setShowTagTeamHowItWorks] = useState(false);
  const [openDifficultyPicker, setOpenDifficultyPicker] = useState<'partner' | 'oppA' | 'oppB' | null>(null);
  const [openPartnerPicker, setOpenPartnerPicker] = useState(false);
  const [tagTeamBoardBPartner, setTagTeamBoardBPartner] = useState<'ai' | 'human'>('human');
  const [tagTeamPartner, setTagTeamPartner] = useState<AIDifficulty>('easy');
  const [tagTeamOppA, setTagTeamOppA] = useState<AIDifficulty>('medium');
  const [tagTeamOppB, setTagTeamOppB] = useState<AIDifficulty>('medium');

  const timerPresetLabels: Record<TimerPreset, string> = {
    bullet: t('play.bullet'),
    blitz: t('play.blitzTime'),
    rapid: t('play.rapid'),
    custom: t('play.custom'),
  };

  const handleMode = useCallback(
    (mode: 'ai' | 'local' | 'online' | 'blitz' | 'tagteam') => {
      if (mode === 'blitz') {
        setShowTimerModal(true);
        return;
      }
      if (mode === 'tagteam') {
        setShowTagTeamModal(true);
        return;
      }
      if (mode === 'online') {
        router.push('/online');
        return;
      }
      if (mode === 'ai') {
        setSelectedAiDifficulty(aiDifficulty);
        setShowAiDifficultyModal(true);
        return;
      }
      startGame(mode, undefined);
      router.push(`/game/${mode}`);
    },
    [aiDifficulty, router, startGame]
  );

  const handleStartAiGame = useCallback(() => {
    startGame('ai', selectedAiDifficulty);
    setShowAiDifficultyModal(false);
    router.push('/game/ai');
  }, [selectedAiDifficulty, startGame, router]);

  const handleCloseAiDifficultyModal = useCallback(() => {
    setShowAiDifficultyModal(false);
  }, []);

  const handleStartTagTeam = useCallback(() => {
    const config: TagTeamConfig = {
      team1: {
        boardAPlayer: 1,
        boardBPlayer: 2,
        boardBPartner: tagTeamBoardBPartner,
        boardBAiDifficulty: tagTeamPartner,
      },
      team2: { boardAAiDifficulty: tagTeamOppA, boardBAiDifficulty: tagTeamOppB },
      maxBonusStones: 3,
    };
    startTagTeamGame(config);
    setShowTagTeamModal(false);
    router.push('/game/tagteam');
  }, [tagTeamBoardBPartner, tagTeamPartner, tagTeamOppA, tagTeamOppB, startTagTeamGame, router]);

  const handleStartBlitz = useCallback(() => {
    const config: TimerConfig =
      selectedPreset === 'custom'
        ? getTimerConfig('custom', customMinutes)
        : TIMER_PRESETS[selectedPreset];
    startGame('blitz', undefined, config);
    setShowTimerModal(false);
    router.push('/game/blitz');
  }, [selectedPreset, customMinutes, startGame, router]);

  const handleCloseTimerModal = useCallback(() => {
    setShowTimerModal(false);
  }, []);

  const handleTagTeamDifficultySelect = useCallback((d: AIDifficulty) => {
    if (openDifficultyPicker === 'partner') setTagTeamPartner(d);
    if (openDifficultyPicker === 'oppA') setTagTeamOppA(d);
    if (openDifficultyPicker === 'oppB') setTagTeamOppB(d);
    setOpenDifficultyPicker(null);
  }, [openDifficultyPicker]);

  const handlePartnerSelect = useCallback((partner: 'ai' | 'human') => {
    setOpenPartnerPicker(false);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setTagTeamBoardBPartner(partner);
  }, []);

  const tagTeamBadgeScale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(tagTeamBadgeScale, {
          toValue: 1.03,
          duration: 2500,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
        Animated.timing(tagTeamBadgeScale, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [tagTeamBadgeScale]);

  const winHeight = Dimensions.get('window').height;
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      padding: 24,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: theme.fontColor,
      marginBottom: 24,
    },
    card: {
      backgroundColor: theme.cardBackground,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 72,
      ...cardShadow,
    },
    cardTagTeamFlatBottom: {
      marginBottom: 0,
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
    },
    tagTeamTutorialBtn: {
      marginTop: 0,
      paddingHorizontal: 20,
      paddingVertical: 12,
      minHeight: 40,
      justifyContent: 'center',
      backgroundColor: theme.cardBackground,
      borderTopWidth: 1,
      borderTopColor: theme.borderColor,
      borderBottomLeftRadius: 12,
      borderBottomRightRadius: 12,
    },
    tagTeamTutorialBtnText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.fontColorSecondary,
    },
    tagTeamCardWrap: {
      marginBottom: 16,
      position: 'relative',
    },
    tagTeamBadge: {
      position: 'absolute',
      top: 8,
      right: 8,
      backgroundColor: theme.colors.accent,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 12,
    },
    tagTeamBadgeText: {
      fontSize: 11,
      fontWeight: '600',
      color: '#FFFBF0',
      letterSpacing: 0.3,
    },
    icon: {
      marginRight: 16,
    },
    cardText: {
      flex: 1,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.fontColor,
    },
    cardSubtitle: {
      fontSize: 14,
      color: theme.fontColorSecondary,
      marginTop: 4,
    },
    disabled: {
      opacity: 0.45,
    },
    comingSoonRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 6,
      gap: 6,
    },
    comingSoonText: {
      fontSize: 12,
      fontStyle: 'italic',
      color: theme.fontColorSecondary,
    },
    comingSoonIcon: {
      marginRight: 0,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    modalCard: {
      backgroundColor: theme.cardBackground,
      borderRadius: 16,
      padding: 20,
      width: '100%',
      maxWidth: 360,
      ...cardShadow,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.fontColor,
      marginBottom: 16,
      textAlign: 'center',
    },
    timerOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      marginBottom: 8,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    timerOptionSelected: {
      borderColor: theme.colors.accent,
      backgroundColor: theme.colors.background,
    },
    timerOptionText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.fontColor,
    },
    customRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 8,
      marginBottom: 16,
    },
    customMinuteBtn: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.borderColor,
      minWidth: 44,
      minHeight: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    customMinuteBtnSelected: {
      borderColor: theme.colors.accent,
      backgroundColor: theme.colors.background,
    },
    customMinuteText: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.fontColor,
    },
    modalActions: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 8,
      justifyContent: 'center',
    },
    modalBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 44,
    },
    tagTeamModalActions: {
      marginTop: 20,
      marginBottom: 8,
    },
    modalBtnPrimary: {
      backgroundColor: theme.colors.accent,
    },
    modalBtnSecondary: {
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.borderColor,
    },
    modalBtnText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.fontColor,
    },
    modalBtnTextPrimary: {
      color: theme.colors.accentContrast ?? '#fff',
    },
    modalBtnTextCentered: {
      textAlign: 'center',
    },
    tagTeamModalHeader: {
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
    },
    tagTeamModalTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: theme.fontColor,
      textAlign: 'center',
      alignSelf: 'center',
    },
    tagTeamModalCard: {
      maxHeight: winHeight * 0.9,
    },
    tagTeamModalScroll: {
      maxHeight: winHeight * 0.75,
    },
    tagTeamModalScrollContent: {
      paddingBottom: 20,
      alignItems: 'stretch',
    },
    tagTeamTeamCard: {
      borderRadius: 12,
      padding: 16,
      marginBottom: 0,
    },
    tagTeamTeamCardYour: {
      backgroundColor: (theme.colors.accent || '#C9A84C') + '14',
    },
    tagTeamTeamCardOpponent: {
      backgroundColor: 'rgba(0,0,0,0.06)',
    },
    tagTeamTeamLabel: {
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 1,
      color: theme.colors.accent || '#C9A84C',
      marginBottom: 12,
      textTransform: 'uppercase',
      textAlign: 'center',
    },
    tagTeamTeamRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    tagTeamBoardCol: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'stretch',
    },
    tagTeamBoardColLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.fontColorSecondary,
      letterSpacing: 1,
      textTransform: 'uppercase',
      marginBottom: 8,
      alignSelf: 'stretch',
      textAlign: 'center',
    },
    tagTeamBoardAContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    tagTeamBoardAText: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.fontColor,
    },
    tagTeamPartnerPill: {
      height: 40,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: theme.colors.accent,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 12,
      gap: 6,
    },
    tagTeamPartnerPillText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.accent,
    },
    tagTeamDifficultyPillPartner: {
      marginTop: 8,
      height: 40,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: theme.fontColorSecondary ?? 'rgba(0,0,0,0.15)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 12,
      flexDirection: 'row',
      gap: 6,
    },
    tagTeamTeamCol: {
      flex: 1,
      alignItems: 'stretch',
    },
    tagTeamColLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.fontColorSecondary,
      letterSpacing: 1,
      textTransform: 'uppercase',
      marginBottom: 8,
      alignSelf: 'stretch',
      textAlign: 'center',
    },
    tagTeamVsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 16,
      gap: 12,
    },
    tagTeamVsLine: {
      flex: 1,
      height: 1,
      backgroundColor: theme.borderColor,
    },
    tagTeamVsText: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.accent || '#C9A84C',
    },
    tagTeamDifficultyPill: {
      minHeight: 44,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.borderColor,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 12,
      flexDirection: 'row',
      gap: 4,
    },
    tagTeamDifficultyPillText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.fontColor,
    },
    tagTeamModalActionsNew: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      marginTop: 24,
      width: '100%',
    },
    tagTeamModalBtnCancel: {
      flex: 1,
      height: 52,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: 'rgba(0,0,0,0.12)',
      backgroundColor: 'transparent',
    },
    tagTeamModalBtnCancelText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.fontColor,
      textAlign: 'center',
    },
    tagTeamModalBtnStart: {
      flex: 1,
      height: 52,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.accent,
    },
    tagTeamModalBtnStartText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFFFFF',
      textAlign: 'center',
    },
    tagTeamModalBtnText: {
      fontSize: 16,
      fontWeight: '600',
    },
    tagTeamInfoHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    tagTeamInfoTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.fontColor,
      flex: 1,
    },
    tagTeamInfoClose: {
      padding: 8,
      minWidth: 40,
      minHeight: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    tagTeamInfoBody: {},
    tagTeamInfoRule: {
      fontSize: 14,
      color: theme.fontColorSecondary,
      lineHeight: 22,
      marginBottom: 12,
    },
    tagTeamBoardCard: {
      backgroundColor: theme.colors.background,
      borderRadius: 12,
      padding: 14,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.borderColor,
    },
    tagTeamBoardHeader: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.fontColorSecondary,
      letterSpacing: 0.5,
      marginBottom: 12,
    },
    tagTeamSlotRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    tagTeamSlotBox: {
      flex: 1,
      minHeight: 48,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.borderColor,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 8,
    },
    tagTeamSlotBoxYou: {
      borderColor: theme.colors.accent,
      backgroundColor: theme.colors.accent + '12',
    },
    tagTeamSlotVs: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.fontColorSecondary,
      minWidth: 24,
      textAlign: 'center',
    },
    tagTeamPartnerToggle: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.borderColor,
      minHeight: 44,
    },
    tagTeamPartnerToggleText: {
      fontSize: 14,
      fontWeight: '600',
    },
    tagTeamDifficultyDropdown: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.borderColor,
      minHeight: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    tagTeamDifficultyDropdownText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.fontColor,
    },
    tagTeamPickerOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    tagTeamPickerCard: {
      backgroundColor: theme.cardBackground,
      borderRadius: 16,
      padding: 16,
      width: '100%',
      maxWidth: 280,
      ...cardShadow,
    },
    tagTeamPickerTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.fontColorSecondary,
      marginBottom: 12,
    },
    tagTeamPickerOption: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 10,
      marginBottom: 6,
    },
    tagTeamPickerOptionText: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.fontColor,
    },
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
      >
        <Text style={styles.title}>{t('play.title')}</Text>
        {MODE_IDS.map((mode) => {
          const isDisabled = !mode.available;
          if (mode.id === 'tagteam') {
            return (
              <View key={mode.id} style={styles.tagTeamCardWrap}>
                <PressableScale
                  style={[styles.card, styles.cardTagTeamFlatBottom, isDisabled && styles.disabled]}
                  onPress={() => !isDisabled && handleMode('tagteam')}
                  scaleTo={0.98}
                  disabled={isDisabled}
                >
                  <MaterialCommunityIcons
                    name={mode.icon}
                    size={32}
                    color={theme.colors.accent}
                    style={styles.icon}
                  />
                  <View style={styles.cardText}>
                    <Text style={styles.cardTitle}>{t(mode.titleKey)}</Text>
                    <Text style={styles.cardSubtitle}>{t(mode.subtitleKey)}</Text>
                    {isDisabled && (
                      <View style={styles.comingSoonRow}>
                        <MaterialCommunityIcons
                          name="lock-outline"
                          size={14}
                          color={theme.fontColorSecondary}
                          style={styles.comingSoonIcon}
                        />
                        <Text style={styles.comingSoonText}>{t('play.comingSoon')}</Text>
                      </View>
                    )}
                  </View>
                </PressableScale>
                <Animated.View style={[styles.tagTeamBadge, { transform: [{ scale: tagTeamBadgeScale }] }]} pointerEvents="none">
                  <Text style={styles.tagTeamBadgeText} numberOfLines={1}>{t('play.tagTeamBadge')}</Text>
                </Animated.View>
                <TouchableOpacity
                  style={styles.tagTeamTutorialBtn}
                  onPress={() => setShowTagTeamInfoModal(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.tagTeamTutorialBtnText}>📖 {t('tagTeam.tutorialButton')}</Text>
                </TouchableOpacity>
              </View>
            );
          }
          return (
            <PressableScale
              key={mode.id}
              style={[styles.card, isDisabled && styles.disabled]}
              onPress={() => !isDisabled && handleMode(mode.id as 'ai' | 'local' | 'online' | 'blitz' | 'tagteam')}
              scaleTo={0.98}
              disabled={isDisabled}
            >
              <MaterialCommunityIcons
                name={mode.icon}
                size={32}
                color={theme.colors.accent}
                style={styles.icon}
              />
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>{t(mode.titleKey)}</Text>
                <Text style={styles.cardSubtitle}>{t(mode.subtitleKey)}</Text>
                {isDisabled && (
                  <View style={styles.comingSoonRow}>
                    <MaterialCommunityIcons
                      name="lock-outline"
                      size={14}
                      color={theme.fontColorSecondary}
                      style={styles.comingSoonIcon}
                    />
                    <Text style={styles.comingSoonText}>{t('play.comingSoon')}</Text>
                  </View>
                )}
              </View>
            </PressableScale>
          );
        })}
      </ScrollView>

      <Modal
        visible={showTimerModal}
        transparent
        animationType="fade"
        onRequestClose={handleCloseTimerModal}
      >
        <Pressable style={styles.modalOverlay} onPress={handleCloseTimerModal}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>{t('play.timePerPlayer')}</Text>
            {(['bullet', 'blitz', 'rapid', 'custom'] as const).map((presetId) => (
              <TouchableOpacity
                key={presetId}
                style={[
                  styles.timerOption,
                  selectedPreset === presetId && styles.timerOptionSelected,
                ]}
                onPress={() => setSelectedPreset(presetId)}
                activeOpacity={0.8}
              >
                <Text style={styles.timerOptionText}>{timerPresetLabels[presetId]}</Text>
              </TouchableOpacity>
            ))}
            {selectedPreset === 'custom' && (
              <View style={styles.customRow}>
                {CUSTOM_MINUTE_OPTIONS.map((min) => (
                  <TouchableOpacity
                    key={min}
                    style={[
                      styles.customMinuteBtn,
                      customMinutes === min && styles.customMinuteBtnSelected,
                    ]}
                    onPress={() => setCustomMinutes(min)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.customMinuteText}>{min} Min</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSecondary]}
                onPress={handleCloseTimerModal}
                activeOpacity={0.8}
              >
                <Text style={styles.modalBtnText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnPrimary]}
                onPress={handleStartBlitz}
                activeOpacity={0.8}
              >
                <Text style={[styles.modalBtnText, styles.modalBtnTextPrimary]}>
                  {t('play.start')}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={showAiDifficultyModal}
        transparent
        animationType="fade"
        onRequestClose={handleCloseAiDifficultyModal}
      >
        <Pressable style={styles.modalOverlay} onPress={handleCloseAiDifficultyModal}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>{t('play.difficulty')}</Text>
            {AI_DIFFICULTIES.map((diff) => (
              <TouchableOpacity
                key={diff}
                style={[
                  styles.timerOption,
                  selectedAiDifficulty === diff && styles.timerOptionSelected,
                ]}
                onPress={() => setSelectedAiDifficulty(diff)}
                activeOpacity={0.8}
              >
                <Text style={styles.timerOptionText}>{t(`play.difficultyLevels.${diff}`)}</Text>
              </TouchableOpacity>
            ))}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSecondary]}
                onPress={handleCloseAiDifficultyModal}
                activeOpacity={0.8}
              >
                <Text style={styles.modalBtnText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnPrimary]}
                onPress={handleStartAiGame}
                activeOpacity={0.8}
              >
                <Text style={[styles.modalBtnText, styles.modalBtnTextPrimary]}>
                  {t('play.startGame')}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={showTagTeamModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTagTeamModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowTagTeamModal(false)}>
          <Pressable style={[styles.modalCard, styles.tagTeamModalCard]} onPress={(e) => e.stopPropagation()}>
            <ScrollView
              style={styles.tagTeamModalScroll}
              contentContainerStyle={styles.tagTeamModalScrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.tagTeamModalHeader}>
                <Text style={styles.tagTeamModalTitle}>⚔️ {t('play.tagTeam')}</Text>
              </View>

              <View style={[styles.tagTeamTeamCard, styles.tagTeamTeamCardYour]}>
                <Text style={styles.tagTeamTeamLabel}>{t('tagTeam.yourTeam')}</Text>
                <View style={styles.tagTeamTeamRow}>
                  <View style={styles.tagTeamBoardCol}>
                    <Text style={styles.tagTeamBoardColLabel}>{t('tagTeam.boardA')}</Text>
                    <View style={styles.tagTeamBoardAContent}>
                      <MaterialCommunityIcons name="account" size={24} color={theme.colors.accent} />
                      <Text style={styles.tagTeamBoardAText}>{t('tagTeam.you')}</Text>
                    </View>
                  </View>
                  <View style={styles.tagTeamBoardCol}>
                    <Text style={styles.tagTeamBoardColLabel}>{t('tagTeam.boardB')}</Text>
                    <TouchableOpacity
                      style={styles.tagTeamPartnerPill}
                      onPress={() => setOpenPartnerPicker(true)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.tagTeamPartnerPillText} numberOfLines={1}>
                        {tagTeamBoardBPartner === 'ai' ? '🤖 ' + t('tagTeam.aiPartner') : '👤 ' + t('tagTeam.yourself')}
                      </Text>
                      <MaterialCommunityIcons name="chevron-down" size={18} color={theme.colors.accent} />
                    </TouchableOpacity>
                    {tagTeamBoardBPartner === 'ai' && (
                      <TouchableOpacity
                        style={styles.tagTeamDifficultyPillPartner}
                        onPress={() => setOpenDifficultyPicker('partner')}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.tagTeamDifficultyPillText} numberOfLines={1}>
                          {t(`play.difficultyLevels.${tagTeamPartner}`)}
                        </Text>
                        <MaterialCommunityIcons name="chevron-down" size={18} color={theme.fontColorSecondary} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>

              <View style={styles.tagTeamVsRow}>
                <View style={styles.tagTeamVsLine} />
                <Text style={styles.tagTeamVsText}>VS</Text>
                <View style={styles.tagTeamVsLine} />
              </View>

              <View style={[styles.tagTeamTeamCard, styles.tagTeamTeamCardOpponent]}>
                <Text style={styles.tagTeamTeamLabel}>{t('tagTeam.opponent')}</Text>
                <View style={styles.tagTeamTeamRow}>
                  <View style={styles.tagTeamTeamCol}>
                    <Text style={styles.tagTeamColLabel}>{t('tagTeam.boardA')}</Text>
                    <TouchableOpacity
                      style={styles.tagTeamDifficultyPill}
                      onPress={() => setOpenDifficultyPicker('oppA')}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.tagTeamDifficultyPillText} numberOfLines={1}>
                        {t(`play.difficultyLevels.${tagTeamOppA}`)}
                      </Text>
                      <MaterialCommunityIcons name="chevron-down" size={18} color={theme.fontColorSecondary} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.tagTeamTeamCol}>
                    <Text style={styles.tagTeamColLabel}>{t('tagTeam.boardB')}</Text>
                    <TouchableOpacity
                      style={styles.tagTeamDifficultyPill}
                      onPress={() => setOpenDifficultyPicker('oppB')}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.tagTeamDifficultyPillText} numberOfLines={1}>
                        {t(`play.difficultyLevels.${tagTeamOppB}`)}
                      </Text>
                      <MaterialCommunityIcons name="chevron-down" size={18} color={theme.fontColorSecondary} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <View style={styles.tagTeamModalActionsNew}>
                <PressableScale
                  style={styles.tagTeamModalBtnCancel}
                  onPress={() => setShowTagTeamModal(false)}
                  scaleTo={0.98}
                >
                  <Text style={[styles.tagTeamModalBtnCancelText]} numberOfLines={1}>
                    {t('tagTeam.cancel')}
                  </Text>
                </PressableScale>
                <PressableScale
                  style={styles.tagTeamModalBtnStart}
                  onPress={handleStartTagTeam}
                  scaleTo={0.98}
                >
                  <Text style={styles.tagTeamModalBtnStartText} numberOfLines={1}>
                    {t('tagTeam.startShort')}
                  </Text>
                </PressableScale>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={showTagTeamInfoModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTagTeamInfoModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowTagTeamInfoModal(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.tagTeamInfoHeader}>
              <Text style={styles.tagTeamInfoTitle}>{t('tagTeam.infoTitle')}</Text>
              <TouchableOpacity
                onPress={() => setShowTagTeamInfoModal(false)}
                style={styles.tagTeamInfoClose}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <MaterialCommunityIcons name="close" size={24} color={theme.fontColorSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.tagTeamInfoBody}>
              <Text style={styles.tagTeamInfoRule}>🎮 {t('tagTeam.infoRule1')}</Text>
              <Text style={styles.tagTeamInfoRule}>🎁 {t('tagTeam.infoRule2')}</Text>
              <Text style={[styles.tagTeamInfoRule, { marginBottom: 0 }]}>🏆 {t('tagTeam.infoRule3')}</Text>
            </View>
            <TouchableOpacity
              style={[styles.modalBtn, styles.modalBtnPrimary, { marginTop: 16 }]}
              onPress={() => setShowTagTeamInfoModal(false)}
              activeOpacity={0.8}
            >
              <Text style={[styles.modalBtnText, styles.modalBtnTextPrimary]}>{t('tagTeam.understood')}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={openPartnerPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setOpenPartnerPicker(false)}
      >
        <Pressable style={styles.tagTeamPickerOverlay} onPress={() => setOpenPartnerPicker(false)}>
          <Pressable style={styles.tagTeamPickerCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.tagTeamPickerTitle}>{t('tagTeam.boardB')}</Text>
            <TouchableOpacity
              style={[styles.tagTeamPickerOption, tagTeamBoardBPartner === 'ai' && { backgroundColor: theme.colors.accent + '20', borderWidth: 1, borderColor: theme.colors.accent }]}
              onPress={() => handlePartnerSelect('ai')}
              activeOpacity={0.8}
            >
              <Text style={styles.tagTeamPickerOptionText}>🤖 {t('tagTeam.aiPartner')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tagTeamPickerOption, tagTeamBoardBPartner === 'human' && { backgroundColor: theme.colors.accent + '20', borderWidth: 1, borderColor: theme.colors.accent }]}
              onPress={() => handlePartnerSelect('human')}
              activeOpacity={0.8}
            >
              <Text style={styles.tagTeamPickerOptionText}>👤 {t('tagTeam.yourself')}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={openDifficultyPicker !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setOpenDifficultyPicker(null)}
      >
        <Pressable style={styles.tagTeamPickerOverlay} onPress={() => setOpenDifficultyPicker(null)}>
          <Pressable style={styles.tagTeamPickerCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.tagTeamPickerTitle}>{t('play.difficulty')}</Text>
            {AI_DIFFICULTIES.map((d) => (
              <TouchableOpacity
                key={d}
                style={[
                  styles.tagTeamPickerOption,
                  (openDifficultyPicker === 'partner' && tagTeamPartner === d) ||
                  (openDifficultyPicker === 'oppA' && tagTeamOppA === d) ||
                  (openDifficultyPicker === 'oppB' && tagTeamOppB === d)
                    ? { backgroundColor: theme.colors.accent + '20', borderWidth: 1, borderColor: theme.colors.accent }
                    : {},
                ]}
                onPress={() => handleTagTeamDifficultySelect(d)}
                activeOpacity={0.8}
              >
                <Text style={styles.tagTeamPickerOptionText}>{t(`play.difficultyLevels.${d}`)}</Text>
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
