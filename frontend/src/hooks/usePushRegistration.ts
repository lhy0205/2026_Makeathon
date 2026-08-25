// ─────────────────────────────────────────────
//  usePushRegistration — 복약 알림 토큰 등록
//
//  서버는 이미 준비돼 있다. MedicationReminderScheduler가 1분마다 돌면서
//  복용 시간이 된 PENDING 일정을 찾아 ExpoPushService로 보낸다.
//  앱이 토큰을 등록해 두지 않으면 보낼 곳이 없어 그냥 지나간다.
//
//  주의: Expo Go는 SDK 53부터 원격 푸시를 지원하지 않는다.
//        실제로 알림을 받으려면 development build가 필요하다.
//        (개발 중에는 조용히 건너뛰고 앱 동작을 막지 않는다)
// ─────────────────────────────────────────────
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { pushTokenApi } from '../api/Client';

/** 알림이 오면 앱이 떠 있어도 배너를 띄운다 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** EAS 프로젝트 id — getExpoPushTokenAsync가 요구한다 */
function getProjectId(): string | undefined {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId
  );
}

async function registerForPush(): Promise<string | null> {
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

  // 거절했으면 여기서 멈춘다. 다음에 앱을 열면 다시 묻지 않는다
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
