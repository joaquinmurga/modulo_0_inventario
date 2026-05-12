import { useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, StyleSheet,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../api';
import { colors, spacing, radius } from '../theme';

const CATEGORIES = ['Lacteos', 'Bebidas', 'Limpieza', 'Snacks', 'Electronica', 'Ropa', 'Otro'];

export default function ProductModal({ barcode, onConfirm, onCancel }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiError, setAiError] = useState(null);

  async function pickAndAnalyze(useCamera) {
    setAiError(null);
    const fn = useCamera ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
    const result = await fn({ base64: true, quality: 0.7, mediaTypes: ImagePicker.MediaTypeOptions.Images });
    if (result.canceled || !result.assets?.[0]?.base64) return;

    setAnalyzing(true);
    try {
      const asset = result.assets[0];
      const { data } = await api.analyzeImage(asset.base64, 'image/jpeg', barcode);
      const parts = [data.brand, data.model, data.name].filter(Boolean);
      if (parts.length) setName(parts.join(' - ').substring(0, 80));
      if (data.category) {
        const match = CATEGORIES.find(c =>
          c.toLowerCase().includes(data.category.toLowerCase()) ||
          data.category.toLowerCase().includes(c.toLowerCase())
        );
        setCategory(match || data.category);
      }
      const desc = [data.capacity && `Cap: ${data.capacity}`, data.description].filter(Boolean);
      if (desc.length) setDescription(desc.join(', '));
    } catch (err) {
      setAiError(err.message || 'Error al analizar la imagen');
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleSubmit() {
    if (!name.trim()) return;
    setLoading(true);
    await onConfirm({ barcode, name: name.trim(), category, description: description.trim(), price: parseFloat(price) || 0 });
    setLoading(false);
  }

  return (
    <Modal visible transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>Producto no encontrado</Text>
            <Text style={styles.code}>Codigo: <Text style={styles.codeValue}>{barcode}</Text></Text>

            {/* Botones IA */}
            <Text style={styles.sectionLabel}>Analizar con IA</Text>
            <View style={styles.aiRow}>
              <TouchableOpacity
                style={styles.aiBtn}
                onPress={() => pickAndAnalyze(true)}
                disabled={analyzing}
              >
                <Text style={styles.aiBtnText}>Tomar foto</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.aiBtn}
                onPress={() => pickAndAnalyze(false)}
                disabled={analyzing}
              >
                <Text style={styles.aiBtnText}>Galeria</Text>
              </TouchableOpacity>
            </View>

            {analyzing && (
              <View style={styles.analyzingRow}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.analyzingText}>Analizando producto...</Text>
              </View>
            )}
            {aiError && <Text style={styles.error}>{aiError}</Text>}

            {/* Formulario */}
            <Text style={styles.fieldLabel}>Nombre *</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Ej. Leche Entera 1L"
              placeholderTextColor={colors.gray400}
              style={styles.input}
            />

            <Text style={styles.fieldLabel}>Categoria</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
              {['', ...CATEGORIES].map((c) => (
                <TouchableOpacity
                  key={c || '__none__'}
                  onPress={() => setCategory(c)}
                  style={[styles.catPill, category === c && styles.catPillActive]}
                >
                  <Text style={[styles.catPillText, category === c && styles.catPillTextActive]}>
                    {c || 'Sin categoria'}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.fieldLabel}>Descripcion</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Marca, modelo, capacidad..."
              placeholderTextColor={colors.gray400}
              style={styles.input}
            />

            <Text style={styles.fieldLabel}>Precio</Text>
            <TextInput
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={colors.gray400}
              style={styles.input}
            />

            <View style={styles.actions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, (!name.trim() || loading) && styles.btnDisabled]}
                onPress={handleSubmit}
                disabled={!name.trim() || loading}
              >
                <Text style={styles.confirmText}>{loading ? 'Guardando...' : 'Guardar y registrar'}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    maxHeight: '90%',
  },
  title:        { fontSize: 17, fontWeight: '700', color: colors.gray800, marginBottom: spacing.xs },
  code:         { fontSize: 12, color: colors.gray500, marginBottom: spacing.md },
  codeValue:    { color: colors.primary, fontFamily: 'monospace' },
  sectionLabel: { fontSize: 11, fontWeight: '600', color: colors.gray500, textTransform: 'uppercase', marginBottom: spacing.sm },
  aiRow:        { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  aiBtn: {
    flex: 1,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
  },
  aiBtnText:     { color: colors.primary, fontWeight: '600', fontSize: 13 },
  analyzingRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  analyzingText: { fontSize: 12, color: colors.primary },
  error:         { fontSize: 12, color: colors.danger, marginBottom: spacing.sm },
  fieldLabel:    { fontSize: 13, fontWeight: '500', color: colors.gray700, marginTop: spacing.md, marginBottom: spacing.xs },
  input: {
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    fontSize: 14,
    color: colors.gray800,
  },
  catScroll:        { flexGrow: 0, marginBottom: spacing.xs },
  catPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: colors.gray300,
    marginRight: spacing.xs,
    marginTop: spacing.xs,
  },
  catPillActive:     { backgroundColor: colors.primary, borderColor: colors.primary },
  catPillText:       { fontSize: 12, color: colors.gray700 },
  catPillTextActive: { color: colors.white, fontWeight: '600' },
  actions:    { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 4,
    alignItems: 'center',
  },
  cancelText:  { color: colors.gray700, fontWeight: '500', fontSize: 14 },
  confirmBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 4,
    alignItems: 'center',
  },
  confirmText: { color: colors.white, fontWeight: '600', fontSize: 14 },
  btnDisabled: { opacity: 0.5 },
});
