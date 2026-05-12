import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, ScrollView,
} from 'react-native';
import { getServerUrl, setServerUrl, clearServerUrl } from '../../src/config';
import { api } from '../../src/api';
import { colors, spacing, radius } from '../../src/theme';

export default function SettingsScreen() {
  const [url, setUrl] = useState('');
  const [saved, setSaved] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getServerUrl().then((v) => { if (v) { setUrl(v); setSaved(v); } });
  }, []);

  async function save() {
    if (!url.trim()) return;
    setSaving(true);
    await setServerUrl(url.trim());
    setSaved(url.trim());
    setTestResult(null);
    setSaving(false);
  }

  async function testConnection() {
    if (!url.trim()) return;
    await setServerUrl(url.trim());
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.testConnection();
      setTestResult({ ok: true, msg: `Conectado: ${res.module || 'FlexSaaS'}` });
    } catch (e) {
      setTestResult({ ok: false, msg: e.message });
    } finally {
      setTesting(false);
    }
  }

  async function clear() {
    await clearServerUrl();
    setUrl('');
    setSaved('');
    setTestResult(null);
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Conexion al servidor</Text>

      <View style={styles.card}>
        <Text style={styles.label}>URL del servidor</Text>
        <Text style={styles.hint}>
          Ejemplo: http://192.168.1.100:3001{'\n'}
          Usa la IP local del PC donde corre el backend.
          Para acceso remoto usa Tailscale o Cloudflare Tunnel.
        </Text>
        <TextInput
          value={url}
          onChangeText={setUrl}
          placeholder="http://192.168.1.100:3001"
          placeholderTextColor={colors.gray400}
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />

        {testResult && (
          <View style={[styles.result, testResult.ok ? styles.resultOk : styles.resultErr]}>
            <Text style={[styles.resultText, testResult.ok ? styles.resultTextOk : styles.resultTextErr]}>
              {testResult.msg}
            </Text>
          </View>
        )}

        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.testBtn} onPress={testConnection} disabled={testing || !url.trim()}>
            {testing
              ? <ActivityIndicator size="small" color={colors.primary} />
              : <Text style={styles.testBtnText}>Probar conexion</Text>
            }
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving || !url.trim()}>
            <Text style={styles.saveBtnText}>{saving ? 'Guardando...' : 'Guardar'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {saved ? (
        <View style={styles.savedCard}>
          <Text style={styles.savedLabel}>Servidor activo</Text>
          <Text style={styles.savedUrl}>{saved}</Text>
          <TouchableOpacity onPress={clear}>
            <Text style={styles.clearText}>Desconectar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.noServerCard}>
          <Text style={styles.noServerText}>No hay servidor configurado. La app no puede conectarse al inventario.</Text>
        </View>
      )}

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Como encontrar la IP del servidor</Text>
        <Text style={styles.infoText}>
          En Windows, abri PowerShell y ejecuta:{'\n'}
          <Text style={styles.code}>ipconfig</Text>{'\n\n'}
          Buscas "Direccion IPv4" bajo tu conexion WiFi.{'\n'}
          El dispositivo Android y el servidor deben estar en la misma red WiFi.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, gap: spacing.md },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.gray800 },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm },
  label: { fontSize: 14, fontWeight: '600', color: colors.gray700 },
  hint:  { fontSize: 12, color: colors.gray500, lineHeight: 18 },
  input: {
    borderWidth: 1, borderColor: colors.gray300, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2,
    fontSize: 14, color: colors.gray800,
  },
  result:       { borderRadius: radius.md, padding: spacing.sm },
  resultOk:     { backgroundColor: colors.successLight },
  resultErr:    { backgroundColor: colors.dangerLight },
  resultText:   { fontSize: 13, fontWeight: '500' },
  resultTextOk: { color: colors.success },
  resultTextErr:{ color: colors.danger },
  btnRow:       { flexDirection: 'row', gap: spacing.sm },
  testBtn: {
    flex: 1, borderWidth: 1, borderColor: colors.primary,
    borderRadius: radius.md, paddingVertical: spacing.sm + 4, alignItems: 'center',
  },
  testBtnText:  { color: colors.primary, fontWeight: '600', fontSize: 14 },
  saveBtn: {
    flex: 1, backgroundColor: colors.primary,
    borderRadius: radius.md, paddingVertical: spacing.sm + 4, alignItems: 'center',
  },
  saveBtnText:  { color: colors.white, fontWeight: '600', fontSize: 14 },
  savedCard: {
    backgroundColor: colors.successLight, borderRadius: radius.lg,
    padding: spacing.md, gap: spacing.xs,
    borderWidth: 1, borderColor: '#BBF7D0',
  },
  savedLabel: { fontSize: 12, fontWeight: '600', color: colors.success, textTransform: 'uppercase' },
  savedUrl:   { fontSize: 14, color: colors.gray800, fontFamily: 'monospace' },
  clearText:  { fontSize: 13, color: colors.danger, fontWeight: '500', marginTop: spacing.xs },
  noServerCard: {
    backgroundColor: colors.warningLight, borderRadius: radius.lg,
    padding: spacing.md, borderWidth: 1, borderColor: '#FDE68A',
  },
  noServerText: { fontSize: 13, color: colors.warning },
  infoCard: { backgroundColor: colors.gray100, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm },
  infoTitle: { fontSize: 14, fontWeight: '600', color: colors.gray700 },
  infoText:  { fontSize: 13, color: colors.gray600, lineHeight: 20 },
  code:      { fontFamily: 'monospace', backgroundColor: colors.gray200 },
});
