import { useRouter } from "expo-router";
import PrescriptionScreen from "../screens/PrescriptionScreen";

export default function PrescriptionPage() {
  const router = useRouter();

  const navigation = {
    goBack: () => router.back(),
  };

  return <PrescriptionScreen navigation={navigation as any} />;
}
