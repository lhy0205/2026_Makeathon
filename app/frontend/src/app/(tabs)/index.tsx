import HomeScreen from "@/src/screens/HomeScreen";
import { useRouter } from "expo-router";

export default function HomeTab() {
  const router = useRouter();

  const navigation = {
    navigate: (name: string) => {
      if (name === 'Prescription') router.push('./prescription');
    },
    goBack: () => router.back(),
  };

  return <HomeScreen navigation={navigation as any} />;
}
