// MessageComposer — reusable sticky bottom input bar for all chat screens
//
// Layout model (why this works on both platforms):
//
//   iOS:
//     Parent screen wraps everything in a <KeyboardAvoidingView behavior="padding">.
//     KAV adds paddingBottom equal to the keyboard height, pushing the entire
//     screen content (including this composer) up above the keyboard.
//     The composer's own paddingBottom switches from insets.bottom (home indicator)
//     to spacing.xs (small gap) when the keyboard is visible, because the keyboard
//     already provides visual separation.
//
//   Android:
//     app.json sets softwareKeyboardLayoutMode: "resize", so the OS resizes the
//     window when the keyboard appears. The <KeyboardAvoidingView behavior={undefined}>
//     does nothing on Android — the OS has already done the work. Same padding logic
//     applies for the home indicator / keyboard gap.
//
// Multiline growth:
//   TextInput grows naturally line-by-line up to MAX_INPUT_HEIGHT, then becomes
//   scrollable. The inputWrapper maxHeight cap prevents the composer from growing
//   too tall on very long messages.
//
// Usage:
//   <MessageComposer
//     ref={composerRef}
//     value={inputText}
//     onChangeText={setInputText}
//     onSend={handleSend}
//     isKeyboardVisible={keyboard.isVisible}
//     leftSlot={<MediaButtons />}
//     rightSlot={<SendButton />}
//   />
//
//   // Imperative control (blur on navigate away):
//   composerRef.current?.blur();

import React, { forwardRef, useRef, useImperativeHandle } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';

// Max height of the text input wrapper before it becomes scrollable.
// Roughly 4 lines of body text.
const MAX_INPUT_HEIGHT = 120;

export interface MessageComposerHandle {
  focus: () => void;
  blur: () => void;
}

export interface MessageComposerProps {
  value: string;
  onChangeText: (text: string) => void;
  /** Called when the user taps the send button or submits via keyboard */
  onSend: () => void;
  placeholder?: string;
  maxLength?: number;
  /** Passed from useKeyboard().isVisible — determines bottom padding */
  isKeyboardVisible: boolean;
  /** Whether the input should be non-interactive (limit reached, etc.) */
  disabled?: boolean;
  /** Content rendered to the left of the text field (media buttons, etc.) */
  leftSlot?: React.ReactNode;
  /** Content rendered to the right of the text field (send/mic button) */
  rightSlot?: React.ReactNode;
  testID?: string;
}

export const MessageComposer = forwardRef<MessageComposerHandle, MessageComposerProps>(
  (
    {
      value,
      onChangeText,
      onSend: _onSend,
      placeholder = 'Mesaj yaz...',
      maxLength = 1000,
      isKeyboardVisible,
      disabled = false,
      leftSlot,
      rightSlot,
      testID,
    },
    ref,
  ) => {
    const insets = useSafeAreaInsets();
    const inputRef = useRef<TextInput>(null);

    // Expose focus/blur to parent for keyboard dismissal on navigation
    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
      blur: () => inputRef.current?.blur(),
    }));

    // When keyboard is visible the home indicator is covered — use minimal gap.
    // When keyboard is hidden keep enough space for the home indicator pill.
    const bottomPadding = isKeyboardVisible
      ? spacing.xs
      : Math.max(insets.bottom, spacing.sm);

    return (
      <View style={[styles.container, { paddingBottom: bottomPadding }]}>
        {leftSlot}
        <View style={styles.inputWrapper}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={colors.textTertiary}
            multiline
            maxLength={maxLength}
            // 'default' keeps the keyboard open on Enter (insert newline)
            returnKeyType="default"
            editable={!disabled}
            // scrollEnabled allows scrolling within the input once maxHeight is reached
            scrollEnabled
            // Android: keeps cursor at top-left when multiline
            textAlignVertical="top"
            testID={testID ?? 'message-composer-input'}
            accessibilityLabel={placeholder}
            accessibilityRole="text"
          />
        </View>
        {rightSlot}
      </View>
    );
  },
);

MessageComposer.displayName = 'MessageComposer';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: colors.background,
    gap: spacing.sm,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    paddingHorizontal: spacing.md,
    // Platform-specific vertical padding keeps the single-line height consistent
    paddingVertical: Platform.OS === 'ios' ? spacing.sm : 2,
    maxHeight: MAX_INPUT_HEIGHT,
  },
  input: {
    ...typography.body,
    color: colors.text,
    // Cap the raw TextInput height so the wrapper's maxHeight clip kicks in
    maxHeight: MAX_INPUT_HEIGHT - 16,
    paddingVertical: Platform.OS === 'android' ? spacing.sm : 0,
  },
});
