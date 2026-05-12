import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { colors, spacing, radius } from '../theme';

export default function BarcodeScanner({ onScan, active }) {
  const [permission, requestPermission] = useCameraPermissions();

  if (!active) return null;

  if (!permission) {
    return <View style={styles.placeholder} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.permText}>Se necesita permiso de camara</Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>Dar permiso</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <CameraView
      style={styles.camera}
      facing="back"
      onBarcodeScanned={({ data }) => onScan(data)}
      barcodeScannerSettings={{
        barcodeTypes: ['ean13', 'ean8', 'ean5', 'code128', 'code39', 'upc_a', 'qr'],
      }}
    />
  );
}

const styles = StyleSheet.create({
  camera: { width: '100%', height: 220, borderRadius: radius.lg, overflow: 'hidden' },
  placeholder: {
    height: 220,
    backgroundColor: colors.gray100,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  permText: { fontSize: 13, color: colors.gray600, textAlign: 'center', paddingHorizontal: spacing.lg },
  btn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  btnText: { color: colors.white, fontWeight: '600', fontSize: 13 },
});
