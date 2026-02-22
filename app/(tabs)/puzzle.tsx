/**
 * Puzzle library: daily challenge + grid by difficulty, progress, locked (next 5 open).
 * Uses SectionList for scroll performance. Progress bar: gray track, accent/green at 100%.
 */

import React, { useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SectionList,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../lib/theme/ThemeProvider';
import { cardShadow } from '../../lib/theme/cardStyles';
import { PressableScale } from '../../lib/components/PressableScale';
import { usePuzzleStore } from '../../lib/store/puzzleStore';
import {
  PUZZLES_BY_DIFFICULTY,
  UNLOCKED_DIFFICULTIES,
  type PuzzleDefinition,
} from '../../lib/game/puzzles';

const DIFFICULTIES: (1 | 2 | 3 | 4 | 5)[] = [1, 2, 3, 4, 5];
const GRID_GAP = 12;
const NUM_COLS = 2;
const NUM_OPEN = 5;
const STAR_GOLD = '#C9A84C';
const PROGRESS_TRACK_GRAY = 'rgba(0,0,0,0.08)';
const SECTION_TOP = 24;
const HEADER_TO_GRID = 12;

type Difficulty = 1 | 2 | 3 | 4 | 5;

/** Row of puzzles for 2-column grid (1 or 2 items). */
type PuzzleRow = PuzzleDefinition[];

interface PuzzleSection {
  key: string;
  diff: Difficulty;
  title: string;
  completed: number;
  total: number;
  progress: number;
  data: PuzzleRow[];
  sectionLocked: boolean;
}

export default function PuzzleScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { theme } = useTheme();
  const { getStars, getCompletedCount, loadPuzzle } = usePuzzleStore();

  const width = Dimensions.get('window').width;
  const padding = 24;
  const available = width - padding * 2;
  const cardWidth = (available - (NUM_COLS - 1) * GRID_GAP) / NUM_COLS;

  const isUnlocked = (puzzle: PuzzleDefinition, difficulty: Difficulty): boolean => {
    const list = PUZZLES_BY_DIFFICULTY[difficulty];
    const idx = list.findIndex((p) => p.id === puzzle.id);
    const completedInDiff = getCompletedCount(difficulty);
    return idx < NUM_OPEN || completedInDiff >= idx - NUM_OPEN + 1;
  };

  const sections: PuzzleSection[] = useMemo(() => {
    return DIFFICULTIES.map((diff) => {
      const list = PUZZLES_BY_DIFFICULTY[diff];
      const completed = getCompletedCount(diff);
      const total = list.length;
      const progress = total > 0 ? completed / total : 0;
      const rows: PuzzleRow[] = [];
      for (let i = 0; i < list.length; i += NUM_COLS) {
        rows.push(list.slice(i, i + NUM_COLS));
      }
      const sectionLocked = !UNLOCKED_DIFFICULTIES.includes(diff);
      return {
        key: String(diff),
        diff,
        title: t(`puzzleDifficulty.${String(diff)}`),
        completed,
        total,
        progress,
        data: rows,
        sectionLocked,
      };
    });
  }, [t, getCompletedCount]);

  const handlePuzzle = (id: string) => {
    loadPuzzle(id);
    router.push(`/puzzle/${id}`);
  };

  const handleLockedSectionTap = () => {
    Alert.alert(t('puzzle.locked'), t('puzzle.lockedMessage'));
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: theme.colors.background,
        },
        listContent: {
          paddingHorizontal: padding,
          paddingBottom: 24,
          flexGrow: 1,
        },
        title: {
          fontSize: 28,
          fontWeight: '700',
          color: theme.fontColor,
          marginBottom: 8,
        },
        subtitle: {
          fontSize: 14,
          color: theme.fontColorSecondary,
          marginBottom: 24,
        },
        dailyCard: {
          backgroundColor: theme.cardBackground,
          borderRadius: 16,
          paddingVertical: 12,
          paddingHorizontal: 20,
          marginBottom: 8,
          ...cardShadow,
        },
        dailyCardDisabled: {
          opacity: 0.5,
        },
        dailyBadge: {
          fontSize: 12,
          color: theme.colors.accent,
          textTransform: 'uppercase',
          fontWeight: '600',
          marginBottom: 2,
        },
        dailyTitle: {
          fontSize: 18,
          fontWeight: '600',
          color: theme.fontColor,
        },
        sectionWrap: {
          marginTop: SECTION_TOP,
        },
        sectionHeader: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: HEADER_TO_GRID,
        },
        sectionTitle: {
          fontSize: 18,
          fontWeight: '700',
          color: theme.fontColor,
        },
        sectionCount: {
          fontSize: 14,
          fontWeight: '600',
          color: theme.fontColorSecondary,
        },
        sectionLockedLabel: {
          fontSize: 13,
          color: theme.fontColorSecondary,
          marginBottom: 6,
        },
        progressBar: {
          height: 6,
          borderRadius: 3,
          backgroundColor: PROGRESS_TRACK_GRAY,
          marginBottom: HEADER_TO_GRID,
          overflow: 'hidden',
        },
        progressBarLocked: {
          backgroundColor: PROGRESS_TRACK_GRAY,
        },
        progressFill: {
          height: '100%',
          borderRadius: 3,
        },
        progressFillComplete: {
          backgroundColor: theme.successColor,
        },
        progressFillNormal: {
          backgroundColor: theme.colors.accent,
        },
        sectionFooter: {
          height: 28,
        },
        grid: {
          flexDirection: 'row',
          flexWrap: 'nowrap',
          gap: GRID_GAP,
          marginBottom: GRID_GAP,
        },
        card: {
          width: cardWidth,
          minHeight: 76,
          backgroundColor: theme.cardBackground,
          borderRadius: 12,
          padding: 12,
          justifyContent: 'flex-start',
          alignItems: 'center',
          ...cardShadow,
        },
        cardLocked: {
          opacity: 0.7,
        },
        cardSectionLocked: {
          opacity: 0.45,
        },
        cardSectionLockedTitle: {
          color: theme.fontColorSecondary,
        },
        cardLockedTitle: {
          fontSize: 12,
          fontWeight: '600',
          color: theme.fontColorSecondary,
          textAlign: 'center',
          marginTop: 4,
        },
        cardLockedHint: {
          fontSize: 11,
          color: theme.fontColorSecondary,
          marginTop: 6,
          textAlign: 'center',
          opacity: 0.9,
        },
        cardTitle: {
          fontSize: 13,
          fontWeight: '600',
          color: theme.fontColor,
          textAlign: 'center',
        },
        cardStarsRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 6,
          gap: 2,
        },
      }),
    [theme, cardWidth]
  );

  const renderListHeader = () => (
    <>
      <Text style={styles.title}>{t('puzzle.title')}</Text>
      <Text style={styles.subtitle}>{t('puzzle.subtitle')}</Text>
      <View style={[styles.dailyCard, styles.dailyCardDisabled]} pointerEvents="none">
        <Text style={styles.dailyBadge}>{t('puzzle.daily')}</Text>
        <Text style={styles.dailyTitle}>{t('puzzle.locked')}</Text>
      </View>
    </>
  );

  const renderSectionHeader = ({ section }: { section: PuzzleSection }) => {
    const isComplete = section.progress >= 1;
    const isLocked = section.sectionLocked;
    return (
      <View style={styles.sectionWrap}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <Text style={styles.sectionCount}>
            {section.completed}/{section.total}
          </Text>
        </View>
        {isLocked ? (
          <Text style={styles.sectionLockedLabel}>🔒 {t('puzzle.locked')}</Text>
        ) : null}
        <View style={[styles.progressBar, isLocked && styles.progressBarLocked]}>
          <View
            style={[
              styles.progressFill,
              !isLocked && (isComplete ? styles.progressFillComplete : styles.progressFillNormal),
              { width: isLocked ? '0%' : `${Math.min(100, section.progress * 100)}%` },
            ]}
          />
        </View>
      </View>
    );
  };

  const renderSectionFooter = () => <View style={styles.sectionFooter} />;

  const renderPuzzleCard = (puzzle: PuzzleDefinition, section: PuzzleSection) => {
    const sectionLocked = section.sectionLocked;
    const unlocked = !sectionLocked && isUnlocked(puzzle, section.diff);
    const stars = getStars(puzzle.id);
    const showLockedCard = sectionLocked || !unlocked;
    const lockedHint = sectionLocked ? t('puzzle.locked') : t('puzzle.solvePrevious');
    const disabled = !sectionLocked && !unlocked;
    return (
      <PressableScale
        key={puzzle.id}
        style={[
          styles.card,
          showLockedCard && styles.cardLocked,
          sectionLocked && styles.cardSectionLocked,
        ]}
        onPress={() => {
          if (sectionLocked) handleLockedSectionTap();
          else if (unlocked) handlePuzzle(puzzle.id);
        }}
        scaleTo={0.95}
        disabled={disabled}
      >
        {showLockedCard ? (
          <>
            <MaterialCommunityIcons name="lock" size={22} color={theme.fontColorSecondary} />
            <Text style={[styles.cardLockedTitle, sectionLocked && styles.cardSectionLockedTitle]} numberOfLines={2}>
              {t(`puzzle.titles.${puzzle.id}` as const) !== `puzzle.titles.${puzzle.id}` ? t(`puzzle.titles.${puzzle.id}` as const) : puzzle.title}
            </Text>
            <Text style={styles.cardLockedHint}>{lockedHint}</Text>
          </>
        ) : (
          <>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {t(`puzzle.titles.${puzzle.id}` as const) !== `puzzle.titles.${puzzle.id}` ? t(`puzzle.titles.${puzzle.id}` as const) : puzzle.title}
            </Text>
            <View style={styles.cardStarsRow}>
              {[1, 2, 3].map((i) => (
                <MaterialCommunityIcons
                  key={i}
                  name={i <= stars ? 'star' : 'star-outline'}
                  size={14}
                  color={i <= stars ? STAR_GOLD : theme.fontColorSecondary}
                />
              ))}
            </View>
          </>
        )}
      </PressableScale>
    );
  };

  const renderItem = ({
    item: row,
    section,
  }: {
    item: PuzzleRow;
    section: PuzzleSection;
  }) => (
    <View style={styles.grid}>
      {row.map((puzzle) => renderPuzzleCard(puzzle, section))}
      {row.length === 1 && <View style={[styles.card, { opacity: 0 }]} />}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
      <SectionList
        style={styles.container}
        contentContainerStyle={styles.listContent}
        sections={sections}
        bounces={false}
        overScrollMode="never"
        keyExtractor={(item) => item.map((p) => p.id).join('-')}
        ListHeaderComponent={renderListHeader}
        renderSectionHeader={renderSectionHeader}
        renderSectionFooter={renderSectionFooter}
        renderItem={renderItem}
        stickySectionHeadersEnabled={false}
        initialNumToRender={20}
        maxToRenderPerBatch={15}
        windowSize={5}
      />
    </SafeAreaView>
  );
}
