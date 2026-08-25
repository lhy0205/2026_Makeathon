// ─────────────────────────────────────────────
//  usePushRegistration — 복약 알림 토큰 등록
//
//  서버는 이미 준비돼 있다. MedicationReminderScheduler가 1분마다 돌면서
//  복용 시간이 된 PENDING 일정을 찾아 ExpoPushService로 보낸다.
//  앱이 토큰을 등록해 두지 않으면 보낼 곳이 없어 그냥 지나간다.
//
//  Expo Go는 SDK 53부터 원격 푸시를 지원하지 않는다.
//  expo-notifications는 import되는 것만으로 빨간 에러를 띄우므로,
//  Expo Go에서는 모듈을 아예 불러오지 않는다 (아래 동적 import).
//  실제로 알림을 받으려면 development build가 필요하다.
// ─────────────────────────────────────────────
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { pushTokenApi } from '../api/Client';

/** Expo Go로 실행 중인가 */
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/** EAS 프로젝트 id — getExpoPushTokenAsync가 요구한다 */
function getProjectId(): string | undefined {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId
  );
}

async function registerForPush(): Promise<string | null> {
  // 여기서 처음 불러온다. Expo Go에서는 이 함수 자체를 부르지 않는다
  const Notifications = await import('expo-notifications');

  // 알림이 오면 앱이 떠 있어도 배너를 띄운다
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  // Android는 채널이 있어야 알림이 표시된다
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('medication', {
      name: '복약 알림',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;

  if (status !== 'granted') {
    const asked = await Notifications.requestPermissionsAsync();
    status = asked.status;
  }

  // 거절했으면 여기서 멈춘다
  if (status !== 'granted') return null;

  const projectId = getProjectId();
  if (!projectId) {
    // EAS 설정 전이면 토큰을 받을 수 없다. 앱은 그대로 쓸 수 있어야 한다
    console.warn('[push] EAS projectId가 없어 알림 토큰을 건너뜁니다.');
    return null;
  }

  const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
  return data;
}

/**
 * 로그인한 뒤 한 번만 토큰을 등록한다.
 * 서버 쪽 등록은 멱등이라 같은 토큰을 다시 보내도 중복 저장되지 않는다.
 */
export function usePushRegistration(enabled: boolean) {
  const done = useRef(false);

  useEffect(() => {
    if (!enabled || done.current) return;

    // Expo Go에서는 원격 푸시를 받을 수 없다. 모듈을 건드리지도 않는다
    if (isExpoGo) {
      done.current = true;
      return;
    }

    done.current = true;

    (async () => {
      try {
        const token = await registerForPush();
        if (!token) return;
        await pushTokenApi.register(token);
      } catch (e) {
        // 알림은 있으면 좋은 기능이다. 실패해도 앱을 막지 않는다
        console.warn('[push] 알림 토큰 등록 실패:', e);
        done.current = false;
      }
    })();
  }, [enabled]);
}
