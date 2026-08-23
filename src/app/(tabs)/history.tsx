import { MOCK_PERSCRIPTIONS } from "@/src/constants/mockData";
import { COLORS, SPACING, TYPOGRAPHY } from "@/src/constants/theme";
import { StyleSheet, Text, View } from "react-native";

export default function HistoryTab() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>복약 기록</Text>

      {MOCK_PERSCRIPTIONS.map((rx) => (
        <View key={rx.id} style={styles.card}>
          <Text style={styles.hospital}>{rx.hospital}</Text>
          <Text style={styles.date}>{rx.date}</Text>
          <Text style={styles.meds}>
            {rx.medications.map((m: any) => `${m.name} ${m.dosage}`).join(', ')}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.base,
    gap: SPACING.sm,
  },
  title: {
    fontSize: TYPOGRAPHY.lg,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.textPrimary,
    paddingTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.base,
    gap: SPACING.xs,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  hospital: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.semibold,
    color: COLORS.textPrimary,
  },
  date: {
    fontSize: TYPOGRAPHY.sm,
    color: COLORS.textSecondary,
  },
  meds: {
    fontSize: TYPOGRAPHY.sm,
    color: COLORS.textSecondary,
  },
});
