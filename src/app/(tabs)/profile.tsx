import { MOCK_USER } from "@/src/constants/mockData";
import { COLORS, SPACING, TYPOGRAPHY } from "@/src/constants/theme";
import { StyleSheet, Text, View } from "react-native";

export default function ProfileTab() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>마이페이지</Text>

      <View style={styles.card}>
        <Text style={styles.avatar}>👤</Text>
        <Text style={styles.name}>{MOCK_USER.name}</Text>
        <Text style={styles.email}>{MOCK_USER.email}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.base,
  },
  title: {
    fontSize: TYPOGRAPHY.lg,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.textPrimary,
    paddingTop: SPACING.lg,
    marginBottom: SPACING.base,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  avatar: {
    fontSize: 48,
  },
  name: {
    fontSize: TYPOGRAPHY.xl,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.textPrimary,
  },
  email: {
    fontSize: TYPOGRAPHY.base,
    color: COLORS.textSecondary,
  },
});
