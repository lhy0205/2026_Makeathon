import { useAuth } from "@/src/context/AuthContext";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { COLORS } from "../constants/theme";

/** 로고를 최소한 이만큼은 보여준다 */
const SPLASH_MS = 2000;

export default function SplashPage() {
  const router = useRouter();
  const { user, restoring } = useAuth();
  const [minTimePassed, setMinTimePassed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMinTimePassed(true), SPLASH_MS);
    return () => clearTimeout(timer);
  }, []);

  // 저장된 토큰 확인이 끝나면 로그인 여부에 따라 갈라진다
  useEffect(() => {
    if (restoring || !minTimePassed) return;
    router.replace(user ? '/(tabs)' : '/login');
  }, [restoring, minTimePassed, user, router]);

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/images/first.png')}
        style={styles.logo}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 300,
    height: 300,
  },
});
