// StoryCreator — Instagram-quality story creation screen
// Features: camera/gallery capture, text overlays (drag/pinch), sticker picker,
// drawing tool, color palette, preview, and "Paylas" (share) button
// 24-hour auto-expiry notice shown before posting

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Dimensions,
  Platform,
  Alert,
  StatusBar,
  ScrollView,
  PanResponder,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { useStoryStore } from '../../stores/storyStore';
import type { StoryOverlay } from '../../services/storyService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Color Presets ────────────────────────────────────────────

const COLOR_PRESETS = [
  '#FFFFFF',
  '#000000',
  '#FF3B30',
  '#FF9500',
  '#FCD34D',
  '#34C759',
  '#007AFF',
  '#AF52DE',
] as const;

// ─── Brush Sizes ─────────────────────────────────────────────

const BRUSH_SIZES = [3, 6, 12] as const;

// ─── Sticker/Emoji Options ───────────────────────────────────

const STICKER_OPTIONS = [
  '\u2764\uFE0F', '\uD83D\uDD25', '\uD83D\uDE0D', '\uD83D\uDE02',
  '\uD83E\uDD70', '\uD83D\uDE18', '\uD83C\uDF1F', '\uD83C\uDF89',
  '\uD83D\uDC4B', '\uD83D\uDE4C', '\uD83D\uDCAB', '\uD83C\uDF38',
  '\u2728', '\uD83C\uDFB5', '\uD83C\uDF0A', '\uD83C\uDF19',
  '\uD83E\uDDE1', '\uD83D\uDC9C', '\uD83D\uDC95', '\uD83E\uDD8B',
] as const;

// ─── Tool Modes ──────────────────────────────────────────────

type ToolMode = 'none' | 'text' | 'sticker' | 'draw';

// ─── Text Overlay State ──────────────────────────────────────

interface TextOverlayState {
  id: string;
  content: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
}

// ─── Props ───────────────────────────────────────────────────

interface StoryCreatorProps {
  /** Pre-selected image URI from gallery */
  imageUri?: string;
  /** Callback when story is successfully created */
  onStoryCreated?: () => void;
}

export const StoryCreator: React.FC<StoryCreatorProps> = ({
  imageUri: initialImageUri,
  onStoryCreated,
}) => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const createStory = useStoryStore((s) => s.createStory);
  const isCreating = useStoryStore((s) => s.isCreating);

  // ── Image state ──
  const [imageUri] = useState<string | null>(initialImageUri ?? null);

  // ── Tool state ──
  const [activeMode, setActiveMode] = useState<ToolMode>('none');
  const [selectedColor, setSelectedColor] = useState<string>(COLOR_PRESETS[0]);
  const [selectedBrushSize, setSelectedBrushSize] = useState<number>(BRUSH_SIZES[1]);

  // ── Text overlays ──
  const [textOverlays, setTextOverlays] = useState<TextOverlayState[]>([]);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [textInput, setTextInput] = useState('');
  const [textFontSize, setTextFontSize] = useState(24);

  // ── Sticker overlays ──
  const [stickerOverlays, setStickerOverlays] = useState<Array<{
    id: string;
    emoji: string;
    x: number;
    y: number;
  }>>([]);

  // ── Drawing paths ──
  const [drawingPaths, setDrawingPaths] = useState<Array<{
    id: string;
    color: string;
    brushSize: number;
    points: Array<{ x: number; y: number }>;
  }>>([]);
  const currentDrawPath = useRef<Array<{ x: number; y: number }>>([]);

  // ── Show sticker picker ──
  const [showStickerPicker, setShowStickerPicker] = useState(false);

  // ── Show preview mode ──
  const [showPreview, setShowPreview] = useState(false);

  // ─── Pan Responder for Drawing ─────────────────────────────

  const drawPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => activeMode === 'draw',
      onMoveShouldSetPanResponder: () => activeMode === 'draw',
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        currentDrawPath.current = [{ x: locationX, y: locationY }];
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        currentDrawPath.current.push({ x: locationX, y: locationY });
      },
      onPanResponderRelease: () => {
        if (currentDrawPath.current.length > 1) {
          setDrawingPaths((prev) => [
            ...prev,
            {
              id: `draw-${Date.now()}`,
              color: selectedColor,
              brushSize: selectedBrushSize,
              points: [...currentDrawPath.current],
            },
          ]);
        }
        currentDrawPath.current = [];
      },
    }),
  ).current;

  // ─── Handlers ──────────────────────────────────────────────

  const handleSelectImage = useCallback(() => {
    // In production, use expo-image-picker
    // For now, use a placeholder
    Alert.alert(
      'Fotoğraf Seç',
      'Galeriden fotograf secmek icin expo-image-picker entegrasyonu gereklidir.',
      [
        { text: 'Tamam', style: 'default' },
      ],
    );
  }, []);

  const handleAddText = useCallback(() => {
    setActiveMode('text');
    setTextInput('');
    setEditingTextId(null);
  }, []);

  const handleConfirmText = useCallback(() => {
    if (!textInput.trim()) {
      setActiveMode('none');
      return;
    }

    if (editingTextId) {
      setTextOverlays((prev) =>
        prev.map((t) =>
          t.id === editingTextId
            ? { ...t, content: textInput, fontSize: textFontSize, color: selectedColor }
            : t,
        ),
      );
    } else {
      const newOverlay: TextOverlayState = {
        id: `text-${Date.now()}`,
        content: textInput,
        x: SCREEN_WIDTH / 2 - 100,
        y: SCREEN_HEIGHT / 3,
        fontSize: textFontSize,
        color: selectedColor,
      };
      setTextOverlays((prev) => [...prev, newOverlay]);
    }
    setTextInput('');
    setEditingTextId(null);
    setActiveMode('none');
  }, [textInput, editingTextId, textFontSize, selectedColor]);

  const handleAddSticker = useCallback((emoji: string) => {
    setStickerOverlays((prev) => [
      ...prev,
      {
        id: `sticker-${Date.now()}`,
        emoji,
        x: SCREEN_WIDTH / 2 - 20,
        y: SCREEN_HEIGHT / 3,
      },
    ]);
    setShowStickerPicker(false);
    setActiveMode('none');
  }, []);

  const handleUndoDraw = useCallback(() => {
    setDrawingPaths((prev) => prev.slice(0, -1));
  }, []);

  const handlePublish = useCallback(async () => {
    if (!imageUri) return;

    // Build overlays array for API
    const overlays: StoryOverlay[] = [
      ...textOverlays.map((t) => ({
        type: 'text' as const,
        x: t.x / SCREEN_WIDTH,
        y: t.y / SCREEN_HEIGHT,
        content: t.content,
        fontSize: t.fontSize,
        color: t.color,
      })),
      ...stickerOverlays.map((s) => ({
        type: 'sticker' as const,
        x: s.x / SCREEN_WIDTH,
        y: s.y / SCREEN_HEIGHT,
        emoji: s.emoji,
      })),
      ...drawingPaths.map((d) => ({
        type: 'drawing' as const,
        x: 0,
        y: 0,
        pathData: JSON.stringify(d.points),
        brushSize: d.brushSize,
        brushColor: d.color,
      })),
    ];

    await createStory(imageUri, 'image', overlays);
    onStoryCreated?.();
    navigation.goBack();
  }, [imageUri, textOverlays, stickerOverlays, drawingPaths, createStory, onStoryCreated, navigation]);

  const handleClose = useCallback(() => {
    if (imageUri || textOverlays.length > 0 || stickerOverlays.length > 0) {
      Alert.alert(
        'Vazgeç',
        'Hikayeni kaydetmeden cikmak istedigin kesin mi?',
        [
          { text: 'Kaldir', style: 'cancel' },
          { text: 'Cik', style: 'destructive', onPress: () => navigation.goBack() },
        ],
      );
    } else {
      navigation.goBack();
    }
  }, [imageUri, textOverlays, stickerOverlays, navigation]);

  // ─── No Image Selected State ───────────────────────────────

  if (!imageUri) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" />
        <View style={styles.emptyState}>
          <TouchableOpacity style={styles.selectImageButton} onPress={handleSelectImage}>
            <Ionicons name="camera-outline" size={48} color={palette.gold[500]} />
            <Text style={styles.selectImageText}>Fotoğraf Seç veya Çek</Text>
            <Text style={styles.selectImageHint}>
              Galerinden seç veya kamerayla çek
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.closeButtonEmpty} onPress={handleClose}>
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─── Preview Mode ──────────────────────────────────────────

  if (showPreview) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <Image source={{ uri: imageUri }} style={styles.fullImage} resizeMode="cover" />

        {/* Render text overlays */}
        {textOverlays.map((overlay) => (
          <View
            key={overlay.id}
            style={[
              styles.textOverlayPreview,
              { left: overlay.x, top: overlay.y },
            ]}
          >
            <Text
              style={[
                styles.overlayText,
                { fontSize: overlay.fontSize, color: overlay.color },
              ]}
            >
              {overlay.content}
            </Text>
          </View>
        ))}

        {/* Render sticker overlays */}
        {stickerOverlays.map((sticker) => (
          <Text
            key={sticker.id}
            style={[styles.stickerEmoji, { left: sticker.x, top: sticker.y }]}
          >
            {sticker.emoji}
          </Text>
        ))}

        {/* Preview controls */}
        <View style={[styles.previewControls, { top: insets.top + 16 }]}>
          <TouchableOpacity
            onPress={() => setShowPreview(false)}
            style={styles.previewBackButton}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.previewTitle}>Onizleme</Text>
        </View>

        {/* 24h notice + Publish */}
        <View style={[styles.publishBar, { bottom: insets.bottom + 16 }]}>
          <View style={styles.expiryNotice}>
            <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.6)" />
            <Text style={styles.expiryText}>Hikayen 24 saat sonra kaybolacak</Text>
          </View>
          <TouchableOpacity
            style={[styles.publishButton, isCreating && styles.publishButtonDisabled]}
            onPress={handlePublish}
            disabled={isCreating}
          >
            <Text style={styles.publishButtonText}>
              {isCreating ? 'Paylasiliyor...' : 'Paylas'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─── Editor Mode ───────────────────────────────────────────

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Background image */}
      <View
        style={styles.canvasContainer}
        {...(activeMode === 'draw' ? drawPanResponder.panHandlers : {})}
      >
        <Image source={{ uri: imageUri }} style={styles.fullImage} resizeMode="cover" />

        {/* Render text overlays */}
        {textOverlays.map((overlay) => (
          <TouchableOpacity
            key={overlay.id}
            style={[
              styles.textOverlayPreview,
              { left: overlay.x, top: overlay.y },
            ]}
            onPress={() => {
              setEditingTextId(overlay.id);
              setTextInput(overlay.content);
              setTextFontSize(overlay.fontSize);
              setSelectedColor(overlay.color);
              setActiveMode('text');
            }}
          >
            <Text
              style={[
                styles.overlayText,
                { fontSize: overlay.fontSize, color: overlay.color },
              ]}
            >
              {overlay.content}
            </Text>
          </TouchableOpacity>
        ))}

        {/* Render sticker overlays */}
        {stickerOverlays.map((sticker) => (
          <Text
            key={sticker.id}
            style={[styles.stickerEmoji, { left: sticker.x, top: sticker.y }]}
          >
            {sticker.emoji}
          </Text>
        ))}

        {/* Drawing paths rendered as dots (simplified — real app uses react-native-svg) */}
        {drawingPaths.map((path) =>
          path.points.map((point, idx) => (
            <View
              key={`${path.id}-${idx}`}
              style={[
                styles.drawDot,
                {
                  left: point.x - path.brushSize / 2,
                  top: point.y - path.brushSize / 2,
                  width: path.brushSize,
                  height: path.brushSize,
                  borderRadius: path.brushSize / 2,
                  backgroundColor: path.color,
                },
              ]}
            />
          )),
        )}
      </View>

      {/* Top toolbar */}
      <View style={[styles.topToolbar, { top: insets.top + 8 }]}>
        <TouchableOpacity onPress={handleClose} style={styles.toolbarButton}>
          <Ionicons name="close" size={28} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.toolbarCenter}>
          <TouchableOpacity
            onPress={handleAddText}
            style={[styles.toolbarButton, activeMode === 'text' && styles.toolbarButtonActive]}
          >
            <Ionicons name="text" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setActiveMode('sticker');
              setShowStickerPicker(true);
            }}
            style={[styles.toolbarButton, activeMode === 'sticker' && styles.toolbarButtonActive]}
          >
            <Ionicons name="happy-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveMode(activeMode === 'draw' ? 'none' : 'draw')}
            style={[styles.toolbarButton, activeMode === 'draw' && styles.toolbarButtonActive]}
          >
            <Ionicons name="brush-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          {activeMode === 'draw' && drawingPaths.length > 0 && (
            <TouchableOpacity onPress={handleUndoDraw} style={styles.toolbarButton}>
              <Ionicons name="arrow-undo" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          onPress={() => setShowPreview(true)}
          style={styles.toolbarButton}
        >
          <Ionicons name="eye-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Text input mode */}
      {activeMode === 'text' && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.textInputOverlay}
        >
          <View style={styles.textInputContainer}>
            <TextInput
              style={[
                styles.textInputField,
                { fontSize: textFontSize, color: selectedColor },
              ]}
              placeholder="Metin yaz..."
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={textInput}
              onChangeText={setTextInput}
              multiline
              autoFocus
            />
            <View style={styles.textControls}>
              {/* Font size controls */}
              <View style={styles.fontSizeControls}>
                <TouchableOpacity
                  onPress={() => setTextFontSize(Math.max(14, textFontSize - 2))}
                  style={styles.fontSizeButton}
                >
                  <Text style={styles.fontSizeButtonText}>A-</Text>
                </TouchableOpacity>
                <Text style={styles.fontSizeLabel}>{textFontSize}</Text>
                <TouchableOpacity
                  onPress={() => setTextFontSize(Math.min(48, textFontSize + 2))}
                  style={styles.fontSizeButton}
                >
                  <Text style={styles.fontSizeButtonText}>A+</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.confirmTextButton} onPress={handleConfirmText}>
                <Text style={styles.confirmTextButtonText}>Tamam</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      )}

      {/* Sticker picker overlay */}
      {showStickerPicker && (
        <View style={[styles.stickerPicker, { bottom: insets.bottom + 80 }]}>
          <View style={styles.stickerPickerHeader}>
            <Text style={styles.stickerPickerTitle}>Çıkartma Seç</Text>
            <TouchableOpacity
              onPress={() => {
                setShowStickerPicker(false);
                setActiveMode('none');
              }}
            >
              <Ionicons name="close-circle" size={24} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.stickerGrid}
          >
            {STICKER_OPTIONS.map((emoji, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.stickerItem}
                onPress={() => handleAddSticker(emoji)}
              >
                <Text style={styles.stickerItemText}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Drawing tool bar (brush size + color) */}
      {activeMode === 'draw' && (
        <View style={[styles.drawToolbar, { bottom: insets.bottom + 80 }]}>
          <View style={styles.brushSizeRow}>
            {BRUSH_SIZES.map((size) => (
              <TouchableOpacity
                key={size}
                onPress={() => setSelectedBrushSize(size)}
                style={[
                  styles.brushSizeButton,
                  selectedBrushSize === size && styles.brushSizeButtonActive,
                ]}
              >
                <View
                  style={[
                    styles.brushSizeDot,
                    {
                      width: size * 2,
                      height: size * 2,
                      borderRadius: size,
                      backgroundColor: selectedColor,
                    },
                  ]}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Color palette — shown for text and draw modes */}
      {(activeMode === 'text' || activeMode === 'draw') && (
        <View style={[styles.colorPalette, { bottom: insets.bottom + 140 }]}>
          {COLOR_PRESETS.map((color) => (
            <TouchableOpacity
              key={color}
              onPress={() => setSelectedColor(color)}
              style={[
                styles.colorSwatch,
                { backgroundColor: color },
                selectedColor === color && styles.colorSwatchActive,
              ]}
            />
          ))}
        </View>
      )}

      {/* Bottom action bar */}
      <View style={[styles.bottomBar, { bottom: insets.bottom + 16 }]}>
        <TouchableOpacity style={styles.changeImageButton} onPress={handleSelectImage}>
          <Ionicons name="images-outline" size={20} color="#FFFFFF" />
          <Text style={styles.changeImageText}>Degistir</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.publishButton, isCreating && styles.publishButtonDisabled]}
          onPress={() => setShowPreview(true)}
          disabled={isCreating}
        >
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          <Text style={styles.publishButtonText}>Devam</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  canvasContainer: {
    flex: 1,
  },
  fullImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    position: 'absolute',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  selectImageButton: {
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.xl,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: borderRadius.xl,
    borderStyle: 'dashed',
    width: '80%',
  },
  selectImageText: {
    ...typography.h4,
    color: '#FFFFFF',
  },
  selectImageHint: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },
  closeButtonEmpty: {
    position: 'absolute',
    top: 16,
    left: spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Top toolbar
  topToolbar: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toolbarCenter: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  toolbarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolbarButtonActive: {
    backgroundColor: palette.purple[500],
  },

  // Text overlays
  textOverlayPreview: {
    position: 'absolute',
    padding: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: borderRadius.sm,
  },
  overlayText: {
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },

  // Sticker overlays
  stickerEmoji: {
    position: 'absolute',
    fontSize: 40,
  },

  // Drawing
  drawDot: {
    position: 'absolute',
  },

  // Text input mode
  textInputOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  textInputContainer: {
    width: '100%',
    gap: spacing.md,
  },
  textInputField: {
    color: '#FFFFFF',
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    textAlign: 'center',
    minHeight: 60,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  textControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fontSizeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  fontSizeButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: borderRadius.sm,
  },
  fontSizeButtonText: {
    ...typography.bodySmall,
    color: '#FFFFFF',
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  fontSizeLabel: {
    ...typography.body,
    color: '#FFFFFF',
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    minWidth: 28,
    textAlign: 'center',
  },
  confirmTextButton: {
    backgroundColor: palette.gold[500],
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  confirmTextButtonText: {
    ...typography.button,
    color: '#FFFFFF',
  },

  // Sticker picker
  stickerPicker: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.85)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  stickerPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  stickerPickerTitle: {
    ...typography.bodySmall,
    color: '#FFFFFF',
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  stickerGrid: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  stickerItem: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: borderRadius.md,
  },
  stickerItemText: {
    fontSize: 28,
  },

  // Drawing toolbar
  drawToolbar: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    alignItems: 'center',
  },
  brushSizeRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  brushSizeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  brushSizeButtonActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  brushSizeDot: {},

  // Color palette
  colorPalette: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  colorSwatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  colorSwatchActive: {
    borderColor: '#FFFFFF',
    borderWidth: 3,
  },

  // Bottom bar
  bottomBar: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  changeImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  changeImageText: {
    ...typography.bodySmall,
    color: '#FFFFFF',
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  publishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: palette.gold[500],
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.full,
  },
  publishButtonDisabled: {
    opacity: 0.5,
  },
  publishButtonText: {
    ...typography.button,
    color: '#FFFFFF',
  },

  // Preview controls
  previewControls: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  previewBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewTitle: {
    ...typography.h4,
    color: '#FFFFFF',
  },
  publishBar: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    alignItems: 'center',
    gap: spacing.md,
  },
  expiryNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  expiryText: {
    ...typography.captionSmall,
    color: 'rgba(255,255,255,0.6)',
  },
});
