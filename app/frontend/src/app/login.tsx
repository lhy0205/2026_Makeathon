import { useRouter } from "expo-router";
import LoginScreen from "../screens/LoginScreen";

export default function LoginPage() {
  const router = useRouter();

  const navigation = {
    replace: (name: string) => {
      if (name === "Main") router.replace('/(tabs)');
    },
  };

  return <LoginScreen navigation={navigation as any} />;
}
