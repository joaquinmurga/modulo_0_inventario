import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { useState } from 'react';
import { colors, spacing, radius } from '../theme';

const PRESETS = ['Gondola 1', 'Gondola 2', 'Vitrina A', 'Vitrina B', 'Deposito'];

export default function BlockSelector({ value, onChange }) {
  const [custom, setCustom] = useState('');

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Bloque de escaneo</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
        {PRESETS.map((p) => (
          <TouchableOpacity
            key={p}
            onPress={() => onChange(p)}
            style={[styles.pill, value === p && styles.pillActive]}
          >
            <Text style={[styles.pillText, value === p && styles.pillTextActive]}>{p}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.row}>
        <TextInput
          value={custom}
          onChangeText={setCustom}
          placeholder="Otro bloque..."
          placeholderTextColor={colors.gray400}
          style={styles.input}
        />
        <TouchableOpacity
          style={styles.useBtn}
          onPress={() => { if (custom.trim()) { onChange(custom.trim()); setCustom(''); } }}
        >
          <Text style={styles.useBtnText}>Usar</Text>
        </TouchableOpacity>
      </View>

      {value ? (
        <Text style={styles.active}>Escaneando en: <Text style={styles.activeBold}>{value}</Text></Text>
      ) : (
        <Text style={styles.hint}>Selecciona un bloque para comenzar</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  label:    { fontSize: 12, fontWeight: '600', color: colors.gray500, textTransform: 'uppercase', letterSpacing: 0.5 },
  scroll:   { flexGrow: 0 },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: colors.gray300,
    marginRight: spacing.xs,
    backgroundColor: colors.white,
  },
  pillActive:     { backgroundColor: colors.primary, borderColor: colors.primary },
  pillText:       { fontSize: 13, color: colors.gray700 },
  pillTextActive: { color: colors.white, fontWeight: '600' },
  row:    { flexDirection: 'row', gap: spacing.sm },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 13,
    color: colors.gray800,
  },
  useBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    justifyContent: 'center',
  },
  useBtnText: { color: colors.white, fontWeight: '600', fontSize: 13 },
  active:     { fontSize: 12, color: colors.primary, fontWeight: '500' },
  activeBold: { fontWeight: '700' },
  hint:       { fontSize: 12, color: colors.warning },
});
