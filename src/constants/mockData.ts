import {
  MedicationSchedule,
  User
} from '../navigation';

export const MOCK_USER: User = {
  id: 'user_001',
  name: '김철수',
  email: 'kimcs@scample.com',
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
export const MOCK_PERSCRIPTIONS: Prescription[] = [
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
]

// OCR 인식 샘플 결과
export const MOCK_OCR_RESULT: OcrResult = {
  patientName: '김철수',
  date: '2024-11-20',
  hospital: '강남세브란스병원',
  Medications: '아물로디핀 5mg, 메트포르민 500mg, 아스피린 100mg',
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

// 달 이름
export const MONTH_NAMES = [
  '1월', '2월', '3월', '4월', '5월', '6월',
  '7월', '8월', '9월', '10월', '11월', '12월',
];

export const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
