import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, radius } from '../theme';

export default function NoServer() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>⚙</Text>
      <Text style={styles.title}>Servidor no configurado</Text>
      <Text style={styles.desc}>
        Ingresa la IP del servidor backend para conectar la app.
      </Text>
      <TouchableOpacity style={styles.btn} onPress={() => router.push('/settings')}>
        <Text style={styles.btnText}>Ir a Ajustes</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  icon:  { fontSize: 48 },
  title: { fontSize: 18, fontWeight: '700', color: colors.gray800, textAlign: 'center' },
  desc:  { fontSize: 14, color: colors.gray500, textAlign: 'center', lineHeight: 20 },
  btn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 4,
    borderRadius: radius.lg,
    marginTop: spacing.sm,
  },
  btnText: { color: colors.white, fontWeight: '600', fontSize: 14 },
});
