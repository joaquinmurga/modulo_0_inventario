import { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { getServerUrl } from '../../src/config';
import { api } from '../../src/api';
import { colors, spacing, radius } from '../../src/theme';
import NoServer from '../../src/components/NoServer';
import BlockSelector from '../../src/components/BlockSelector';
import BarcodeScanner from '../../src/components/BarcodeScanner';
import ProductModal from '../../src/components/ProductModal';

export default function ScanScreen() {
  const [serverOk, setServerOk] = useState(null);
  const [block, setBlock] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [pendingBarcode, setPendingBarcode] = useState(null);
  const [lastScan, setLastScan] = useState(null);
  const [soloEscanear, setSoloEscanear] = useState(true);
  const processingRef = useRef(false);

  useEffect(() => {
    getServerUrl().then((url) => setServerOk(!!url));
  }, []);

  const handleScan = useCallback(
    async (barcode) => {
      if (!block || processingRef.current || barcode === lastScan?.barcode) return;
      processingRef.current = true;
      try {
        const { status, data } = await api.scan(barcode, block);
        if (status === 404) {
          if (soloEscanear) {
            await api.createProduct({ barcode, name: barcode });
            await api.scan(barcode, block);
            setLastScan({ barcode, product: { name: barcode }, action: 'created' });
          } else {
            setPendingBarcode(barcode);
          }
        } else {
          setLastScan({ barcode, product: data.product, action: 'registered' });
        }
      } catch {
        // silencioso
      } finally {
        processingRef.current = false;
      }
    },
    [block, lastScan, soloEscanear]
  );

  function handleManualSubmit() {
    const code = manualCode.trim();
    if (!code) return;
    setManualCode('');
    handleScan(code);
  }

  async function handleNewProduct(productData) {
    await api.createProduct(productData);
    await api.scan(productData.barcode, block);
    setLastScan({ barcode: productData.barcode, product: productData, action: 'created' });
    setPendingBarcode(null);
  }

  if (serverOk === null) return <View style={styles.screen} />;
  if (!serverOk) return <View style={styles.screen}><NoServer /></View>;

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        <BlockSelector value={block} onChange={setBlock} />

        <View style={styles.modeCard}>
          <View style={styles.modeSegment}>
            <TouchableOpacity
              style={[styles.modeOption, soloEscanear && styles.modeOptionActive]}
              onPress={() => setSoloEscanear(true)}
            >
              <Text style={[styles.modeOptionText, soloEscanear && styles.modeOptionTextActive]}>
                Solo escanear
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeOption, !soloEscanear && styles.modeOptionActive]}
              onPress={() => setSoloEscanear(false)}
            >
              <Text style={[styles.modeOptionText, !soloEscanear && styles.modeOptionTextActive]}>
                Escanear y completar
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.modeHint}>
            {soloEscanear
              ? 'Productos nuevos se registran sin datos. Ideal para inventario rapido.'
              : 'Al detectar un codigo nuevo se abre el formulario para completar los datos.'}
          </Text>
        </View>

        {!block && (
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>Selecciona un bloque para comenzar a escanear.</Text>
          </View>
        )}

        {block && (
          <>
            {/* Entrada manual */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Codigo de barras</Text>
              <View style={styles.row}>
                <TextInput
                  value={manualCode}
                  onChangeText={setManualCode}
                  onSubmitEditing={handleManualSubmit}
                  returnKeyType="done"
                  placeholder="Escribi o escanea con pistola..."
                  placeholderTextColor={colors.gray400}
                  style={styles.codeInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity style={styles.registerBtn} onPress={handleManualSubmit}>
                  <Text style={styles.registerBtnText}>Registrar</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Camara */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Camara</Text>
                <TouchableOpacity
                  onPress={() => setCameraActive((v) => !v)}
                  style={[styles.toggleBtn, cameraActive && styles.toggleBtnActive]}
                >
                  <Text style={[styles.toggleBtnText, cameraActive && styles.toggleBtnTextActive]}>
                    {cameraActive ? 'Detener' : 'Activar'}
                  </Text>
                </TouchableOpacity>
              </View>
              <BarcodeScanner onScan={handleScan} active={cameraActive && !!block} />
              {!cameraActive && (
                <Text style={styles.cameraOff}>Camara detenida. Usa el campo de arriba o activa la camara.</Text>
              )}
            </View>

            {/* Ultimo escaneo */}
            {lastScan && (
              <View style={[styles.feedbackBox, lastScan.action === 'created' && styles.feedbackBlue]}>
                <Text style={[styles.feedbackText, lastScan.action === 'created' && styles.feedbackTextBlue]}>
                  {lastScan.action === 'created' ? 'Nuevo producto creado: ' : 'Registrado: '}
                  <Text style={styles.feedbackBold}>{lastScan.product?.name}</Text>
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {pendingBarcode && (
        <ProductModal
          barcode={pendingBarcode}
          onConfirm={handleNewProduct}
          onCancel={() => setPendingBarcode(null)}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen:   { flex: 1, backgroundColor: colors.gray50 },
  content:  { padding: spacing.md, gap: spacing.md },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle:   { fontSize: 15, fontWeight: '600', color: colors.gray700 },
  row:         { flexDirection: 'row', gap: spacing.sm },
  codeInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: 14,
    color: colors.gray800,
  },
  registerBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    justifyContent: 'center',
  },
  registerBtnText: { color: colors.white, fontWeight: '600', fontSize: 13 },
  toggleBtn: {
    backgroundColor: colors.successLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.md,
  },
  toggleBtnActive:     { backgroundColor: colors.dangerLight },
  toggleBtnText:       { color: colors.success, fontWeight: '600', fontSize: 13 },
  toggleBtnTextActive: { color: colors.danger },
  cameraOff: { fontSize: 13, color: colors.gray400, textAlign: 'center', paddingVertical: spacing.md },
  modeCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  modeSegment: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  modeOption: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  modeOptionActive: {
    backgroundColor: colors.primary,
  },
  modeOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.gray500,
  },
  modeOptionTextActive: {
    color: colors.white,
  },
  modeHint: { fontSize: 12, color: colors.gray500, lineHeight: 17 },
  warningBox: {
    backgroundColor: colors.warningLight,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  warningText: { fontSize: 13, color: colors.warning },
  feedbackBox: {
    backgroundColor: colors.successLight,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    gap: spacing.sm,
  },
  feedbackBlue: { backgroundColor: colors.primaryLight, borderColor: '#BFDBFE' },
  feedbackText: { fontSize: 13, color: colors.success },
  feedbackTextBlue: { color: colors.primary },
  feedbackBold: { fontWeight: '700' },
});
