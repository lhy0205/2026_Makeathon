// ─────────────────────────────────────────────
//  Medi-Link Mock Data
// ─────────────────────────────────────────────

import type {
  CalendarDayInfo,
  MedicationSchedule,
  OcrResult,
  Prescription,
  User,
} from '../types';

export const MOCK_USER: User = {
  id: 'user_001',
  name: '김철수',
  email: 'kimcs@example.com',
};

// 이번 달 복약 일정 (11월 기준)
export const MOCK_SCHEDULES: MedicationSchedule[] = [
  {
    id: 'sch_001',
    date: '2024-11-04',
    label: '감기약 처방',
    medications: ['타이레놀 500mg', '아목시실린 250mg'],
    taken: true,
  },
  {
    id: 'sch_002',
    date: '2024-11-05',
    label: '감기약 처방',
    medications: ['타이레놀 500mg', '아목시실린 250mg'],
    taken: true,
  },
  {
    id: 'sch_003',
    date: '2024-11-11',
    label: '고혈압 정기 처방',
    medications: ['아물로디핀 5mg', '로사르탄 50mg'],
    taken: true,
  },
  {
    id: 'sch_004',
    date: '2024-11-12',
    label: '고혈압 정기 처방',
    medications: ['아물로디핀 5mg', '로사르탄 50mg'],
    taken: false,
  },
  {
    id: 'sch_005',
    date: '2024-11-25',
    label: '피부과 처방',
    medications: ['세티리진 10mg'],
    taken: false,
  },
  {
    id: 'sch_006',
    date: '2024-11-26',
    label: '피부과 처방',
    medications: ['세티리진 10mg'],
    taken: false,
  },
];

// 처방전 목록
export const MOCK_PRESCRIPTIONS: Prescription[] = [
  {
    id: 'rx_001',
    patientName: '김철수',
    date: '2024-11-11',
    hospital: '서울내과의원',
    medications: [
      { name: '아물로디핀', dosage: '5mg', frequency: '1일 1회', days: 30 },
      { name: '로사르탄', dosage: '50mg', frequency: '1일 1회', days: 30 },
    ],
    imageUri: null,
  },
  {
    id: 'rx_002',
    patientName: '김철수',
    date: '2024-11-01',
    hospital: '강남이비인후과',
    medications: [
      { name: '타이레놀', dosage: '500mg', frequency: '1일 3회', days: 5 },
      { name: '아목시실린', dosage: '250mg', frequency: '1일 3회', days: 5 },
    ],
    imageUri: null,
  },
];

// OCR 인식 샘플 결과
export const MOCK_OCR_RESULT: OcrResult = {
  patientName: '김철수',
  date: '2024-11-20',
  hospital: '강남세브란스병원',
  medications: '아물로디핀 5mg, 메트포르민 500mg, 아스피린 100mg',
};

// 캘린더 날짜별 이벤트 맵
export const MOCK_CALENDAR_EVENTS: Record<string, CalendarDayInfo> = {
  '2024-11-04': { hasMed: true, taken: true },
  '2024-11-05': { hasMed: true, taken: true },
  '2024-11-11': { hasMed: true, taken: true },
  '2024-11-12': { hasMed: true, taken: false },
  '2024-11-25': { hasMed: true, taken: false },
  '2024-11-26': { hasMed: true, taken: false },
};

// 병원 방문 / 예약 일정 (형광펜 표시용)
export const MOCK_HOSPITAL_EVENTS: Record<string, { label: string; type: 'visit' | 'appointment' }> = {
  '2024-11-09': { label: '성형외과 방문', type: 'visit' },
  '2024-11-10': { label: '성형외과 방문', type: 'visit' },
  '2024-11-11': { label: '성형외과 방문', type: 'visit' },
  '2024-11-12': { label: '성형외과 방문', type: 'visit' },
  '2024-11-13': { label: '성형외과 방문', type: 'visit' },
  '2024-11-22': { label: '음식내과 예약', type: 'appointment' },
  '2024-11-23': { label: '음식내과 예약', type: 'appointment' },
  '2024-11-24': { label: '음식내과 예약', type: 'appointment' },
  '2024-11-25': { label: '음식내과 예약', type: 'appointment' },
};

// ── 채팅 mock ─────────────────────────────────
import type { ChatMessage, MedCheckGroup, SideEffectItem } from '../types';

export const MOCK_CHAT_MESSAGES: ChatMessage[] = [
  {
    id: 'msg_001',
    role: 'bot',
    text: '안녕하세요! 저는 Medi-Self입니다 :)\nMedi-Self앱에 가입하신 것을 환영합니다!\n\n복약 관리를 도와드릴게요. 현재 복용 중인 약이 있으신가요?',
    time: '오전 9:00',
  },
  {
    id: 'msg_002',
    role: 'user',
    text: '네, 혈압약을 먹고 있어요.',
    time: '오전 9:01',
  },
  {
    id: 'msg_003',
    role: 'bot',
    text: '알겠습니다! 혈압약은 매일 규칙적으로 복용하는 것이 중요해요.\n\n복약 시간을 설정해 드릴까요?',
    time: '오전 9:01',
  },
];

export const MOCK_BOT_NAME = 'Medi-Self';

// ── 복약 체크 mock ────────────────────────────
export const MOCK_MED_CHECK: MedCheckGroup[] = [
  {
    period: '아침',
    items: [
      { id: 'mc_001', name: 'A 약', dosage: '10mg', time: '오전 8:00', taken: true },
      { id: 'mc_002', name: 'B 약', dosage: '100mg', time: '오전 8:00', taken: true },
    ],
  },
  {
    period: '저녁',
    items: [
      { id: 'mc_003', name: 'A 약', dosage: '10mg', time: '오후 7:00', taken: false },
      { id: 'mc_004', name: 'C 약', dosage: '100mg', time: '오후 8:00', taken: false },
    ],
  },
];

export const MOCK_RECOVERY_PERCENT = 70;

// ── 부작용 체크 mock ──────────────────────────
export const MOCK_SIDE_EFFECTS: SideEffectItem[] = [
  { id: 'se_001', label: '구역감',   enabled: true,  score: 50 },
  { id: 'se_002', label: '두통',     enabled: true,  score: 70 },
  { id: 'se_003', label: '속쓰림',   enabled: false, score: 50 },
  { id: 'se_004', label: '어지러움', enabled: true,  score: 30 },
  { id: 'se_005', label: '발진',     enabled: false, score: 50 },
  { id: 'se_006', label: '직접 입력', enabled: false, score: 50, customValue: '' },
];

// 달 이름
export const MONTH_NAMES = [
  '1월', '2월', '3월', '4월', '5월', '6월',
  '7월', '8월', '9월', '10월', '11월', '12월',
];

export const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
