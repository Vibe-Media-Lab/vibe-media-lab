/**
 * 출생지 도시 DB — 한국 주요 도시 + 세계 주요 도시
 *
 * 클라이언트에서 Combobox 검색에 사용.
 * ~200개 도시, lat/lon/timezone 포함.
 */

export interface CityEntry {
  id: string
  name: string
  nameEn: string
  country: string
  countryEn: string
  timezone: string
  lat: number
  lon: number
}

// ============================================================
// 한국 (~80개)
// ============================================================

const KOREA_CITIES: CityEntry[] = [
  // 특별시/광역시
  { id: 'kr-seoul', name: '서울특별시', nameEn: 'Seoul', country: '대한민국', countryEn: 'KR', timezone: 'Asia/Seoul', lat: 37.5665, lon: 126.978 },
  { id: 'kr-busan', name: '부산광역시', nameEn: 'Busan', country: '대한민국', countryEn: 'KR', timezone: 'Asia/Seoul', lat: 35.1796, lon: 129.0756 },
  { id: 'kr-daegu', name: '대구광역시', nameEn: 'Daegu', country: '대한민국', countryEn: 'KR', timezone: 'Asia/Seoul', lat: 35.8714, lon: 128.6014 },
  { id: 'kr-incheon', name: '인천광역시', nameEn: 'Incheon', country: '대한민국', countryEn: 'KR', timezone: 'Asia/Seoul', lat: 37.4563, lon: 126.7052 },
  { id: 'kr-gwangju', name: '광주광역시', nameEn: 'Gwangju', country: '대한민국', countryEn: 'KR', timezone: 'Asia/Seoul', lat: 35.1595, lon: 126.8526 },
  { id: 'kr-daejeon', name: '대전광역시', nameEn: 'Daejeon', country: '대한민국', countryEn: 'KR', timezone: 'Asia/Seoul', lat: 36.3504, lon: 127.3845 },
  { id: 'kr-ulsan', name: '울산광역시', nameEn: 'Ulsan', country: '대한민국', countryEn: 'KR', timezone: 'Asia/Seoul', lat: 35.5384, lon: 129.3114 },
  { id: 'kr-sejong', name: '세종특별자치시', nameEn: 'Sejong', country: '대한민국', countryEn: 'KR', timezone: 'Asia/Seoul', lat: 36.48, lon: 127.2589 },

  // 경기도
  { id: 'kr-suwon', name: '수원시', nameEn: 'Suwon', country: '대한민국', countryEn: 'KR', timezone: 'Asia/Seoul', lat: 37.2636, lon: 127.0286 },
  { id: 'kr-yongin', name: '용인시', nameEn: 'Yongin', country: '대한민국', countryEn: 'KR', timezone: 'Asia/Seoul', lat: 37.2411, lon: 127.1776 },
  { id: 'kr-seongnam', name: '성남시', nameEn: 'Seongnam', country: '대한민국', countryEn: 'KR', timezone: 'Asia/Seoul', lat: 37.4201, lon: 127.1265 },
  { id: 'kr-goyang', name: '고양시', nameEn: 'Goyang', country: '대한민국', countryEn: 'KR', timezone: 'Asia/Seoul', lat: 37.6584, lon: 126.832 },
  { id: 'kr-bucheon', name: '부천시', nameEn: 'Bucheon', country: '대한민국', countryEn: 'KR', timezone: 'Asia/Seoul', lat: 37.4989, lon: 126.7831 },
  { id: 'kr-hwaseong', name: '화성시', nameEn: 'Hwaseong', country: '대한민국', countryEn: 'KR', timezone: 'Asia/Seoul', lat: 37.1996, lon: 126.8312 },
  { id: 'kr-namyangju', name: '남양주시', nameEn: 'Namyangju', country: '대한민국', countryEn: 'KR', timezone: 'Asia/Seoul', lat: 37.636, lon: 127.2165 },
  { id: 'kr-ansan', name: '안산시', nameEn: 'Ansan', country: '대한민국', countryEn: 'KR', timezone: 'Asia/Seoul', lat: 37.3219, lon: 126.8309 },
  { id: 'kr-anyang', name: '안양시', nameEn: 'Anyang', country: '대한민국', countryEn: 'KR', timezone: 'Asia/Seoul', lat: 37.3943, lon: 126.9568 },
  { id: 'kr-pyeongtaek', name: '평택시', nameEn: 'Pyeongtaek', country: '대한민국', countryEn: 'KR', timezone: 'Asia/Seoul', lat: 36.9921, lon: 127.1129 },
  { id: 'kr-siheung', name: '시흥시', nameEn: 'Siheung', country: '대한민국', countryEn: 'KR', timezone: 'Asia/Seoul', lat: 37.38, lon: 126.8034 },
  { id: 'kr-gimpo', name: '김포시', nameEn: 'Gimpo', country: '대한민국', countryEn: 'KR', timezone: 'Asia/Seoul', lat: 37.6153, lon: 126.7156 },
  { id: 'kr-gwangmyeong', name: '광명시', nameEn: 'Gwangmyeong', country: '대한민국', countryEn: 'KR', timezone: 'Asia/Seoul', lat: 37.4786, lon: 126.8645 },
  { id: 'kr-paju', name: '파주시', nameEn: 'Paju', country: '대한민국', countryEn: 'KR', timezone: 'Asia/Seoul', lat: 37.7593, lon: 126.7802 },
  { id: 'kr-gunpo', name: '군포시', nameEn: 'Gunpo', country: '대한민국', countryEn: 'KR', timezone: 'Asia/Seoul', lat: 37.3616, lon: 126.9352 },
  { id: 'kr-uijeongbu', name: '의정부시', nameEn: 'Uijeongbu', country: '대한민국', countryEn: 'KR', timezone: 'Asia/Seoul', lat: 37.7381, lon: 127.0337 },
  { id: 'kr-hanam', name: '하남시', nameEn: 'Hanam', country: '대한민국', countryEn: 'KR', timezone: 'Asia/Seoul', lat: 37.539, lon: 127.2141 },
  { id: 'kr-icheon', name: '이천시', nameEn: 'Icheon', country: '대한민국', countryEn: 'KR', timezone: 'Asia/Seoul', lat: 37.2722, lon: 127.4349 },
  { id: 'kr-gwacheon', name: '과천시', nameEn: 'Gwacheon', country: '대한민국', countryEn: 'KR', timezone: 'Asia/Seoul', lat: 37.4292, lon: 126.9876 },
  { id: 'kr-osan', name: '오산시', nameEn: 'Osan', country: '대한민국', countryEn: 'KR', timezone: 'Asia/Seoul', lat: 37.1498, lon: 127.0773 },
  { id: 'kr-yangju', name: '양주시', nameEn: 'Yangju', country: '대한민국', countryEn: 'KR', timezone: 'Asia/Seoul', lat: 37.785, lon: 127.0459 },
  { id: 'kr-pocheon', name: '포천시', nameEn: 'Pocheon', country: '대한민국', countryEn: 'KR', timezone: 'Asia/Seoul', lat: 37.8949, lon: 127.2003 },
  { id: 'kr-guri', name: '구리시', nameEn: 'Guri', country: '대한민국', countryEn: 'KR', timezone: 'Asia/Seoul', lat: 37.5943, lon: 127.1297 },
  { id: 'kr-yeoju', name: '여주시', nameEn: 'Yeoju', country: '대한민국', countryEn: 'KR', timezone: 'Asia/Seoul', lat: 37.2983, lon: 127.6374 },
  { id: 'kr-yangpyeong', name: '양평군', nameEn: 'Yangpyeong', country: '대한민국', countryEn: 'KR', timezone: 'Asia/Seoul', lat: 37.4917, lon: 127.4875 },

  // 강원도
  { id: 'kr-chuncheon', name: '춘천시', nameEn: 'Chuncheon', country: '대한민국', countryEn: 'KR', timezone: 'Asia/Seoul', lat: 37.8813, lon: 127.7298 },
  { id: 'kr-wonju', name: '원주시', nameEn: 'Wonju', country: '대한민국', countryEn: 'KR', timezone: 'Asia/Seoul', lat: 37.3422, lon: 127.9202 },
  { id: 'kr-gangneung', name: '강릉시', nameEn: 'Gangneung', country: '대한민국', countryEn: 'KR', timezone: 'Asia/Seoul', lat: 37.7519, lon: 128.8761 },
  { id: 'kr-sokcho', name: '속초시', nameEn: 'Sokcho', country: '대한민국', countryEn: 'KR', timezone: 'Asia/Seoul', lat: 38.207, lon: 128.5918 },

  // 충청북도
  { id: 'kr-cheongju', name: '청주시', nameEn: 'Cheongju', country: '대한민국', countryEn: 'KR', timezone: 'Asia/Seoul', lat: 36.6424, lon: 127.489 },
  { id: 'kr-chungju', name: '충주시', nameEn: 'Chungju', country: '대한민국', countryEn: 'KR', timezone: 'Asia/Seoul', lat: 36.991, lon: 127.9259 },
  { id: 'kr-jecheon', name: '제천시', nameEn: 'Jecheon', country: '대한민국', countryEn: 'KR', timezone: 'Asia/Seoul', lat: 37.1326, lon: 128.191 },

  // 충청남도
  { id: 'kr-cheonan', name: '천안시', nameEn: 'Cheonan', country: '대한민국', countryEn: 'KR', timezone: 'Asia/Seoul', lat: 36.8151, lon: 127.1139 },
  { id: 'kr-asan', name: '아산시', nameEn: 'Asan', country: '대한민국', countryEn: 'KR', timezone: 'Asia/Seoul', lat: 36.7898, lon: 127.0018 },
  { id: 'kr-seosan', name: '서산시', nameEn: 'Seosan', country: '대한민국', countryEn: 'KR', timezone: 'Asia/Seoul', lat: 36.7849, lon: 126.4502 },
  { id: 'kr-dangjin', name: '당진시', nameEn: 'Dangjin', country: '대한민국', countryEn: 'KR', timezone: 'Asia/Seoul', lat: 36.8896, lon: 126.6457 },
  { id: 'kr-hongseong', name: '홍성군', nameEn: 'Hongseong', country: '대한민국', countryEn: 'KR', timezone: 'Asia/Seoul', lat: 36.6011, lon: 126.6603 },

  // 전라북도
  { id: 'kr-jeonju', name: '전주시', nameEn: 'Jeonju', country: '대한민국', countryEn: 'KR', timezone: 'Asia/Seoul', lat: 35.8242, lon: 127.148 },
  { id: 'kr-gunsan', name: '군산시', nameEn: 'Gunsan', country: '대한민국', countryEn: 'KR', timezone: 'Asia/Seoul', lat: 35.9676, lon: 126.7369 },
  { id: 'kr-iksan', name: '익산시', nameEn: 'Iksan', country: '대한민국', countryEn: 'KR', timezone: 'Asia/Seoul', lat: 35.9483, lon: 126.9577 },
  { id: 'kr-namwon', name: '남원시', nameEn: 'Namwon', country: '대한민국', countryEn: 'KR', timezone: 'Asia/Seoul', lat: 35.4164, lon: 127.3903 },

  // 전라남도
  { id: 'kr-mokpo', name: '목포시', nameEn: 'Mokpo', country: '대한민국', countryEn: 'KR', timezone: 'Asia/Seoul', lat: 34.8118, lon: 126.3922 },
  { id: 'kr-yeosu', name: '여수시', nameEn: 'Yeosu', country: '대한민국', countryEn: 'KR', timezone: 'Asia/Seoul', lat: 34.7604, lon: 127.6622 },
  { id: 'kr-suncheon', name: '순천시', nameEn: 'Suncheon', country: '대한민국', countryEn: 'KR', timezone: 'Asia/Seoul', lat: 34.9506, lon: 127.4872 },
  { id: 'kr-naju', name: '나주시', nameEn: 'Naju', country: '대한민국', countryEn: 'KR', timezone: 'Asia/Seoul', lat: 35.0155, lon: 126.7113 },
  { id: 'kr-muan', name: '무안군', nameEn: 'Muan', country: '대한민국', countryEn: 'KR', timezone: 'Asia/Seoul', lat: 34.99, lon: 126.4815 },

  // 경상북도
  { id: 'kr-pohang', name: '포항시', nameEn: 'Pohang', country: '대한민국', countryEn: 'KR', timezone: 'Asia/Seoul', lat: 36.019, lon: 129.3435 },
  { id: 'kr-gyeongju', name: '경주시', nameEn: 'Gyeongju', country: '대한민국', countryEn: 'KR', timezone: 'Asia/Seoul', lat: 35.8562, lon: 129.2247 },
  { id: 'kr-gumi', name: '구미시', nameEn: 'Gumi', country: '대한민국', countryEn: 'KR', timezone: 'Asia/Seoul', lat: 36.1197, lon: 128.3441 },
  { id: 'kr-andong', name: '안동시', nameEn: 'Andong', country: '대한민국', countryEn: 'KR', timezone: 'Asia/Seoul', lat: 36.5684, lon: 128.7294 },
  { id: 'kr-gimcheon', name: '김천시', nameEn: 'Gimcheon', country: '대한민국', countryEn: 'KR', timezone: 'Asia/Seoul', lat: 36.1198, lon: 128.1136 },
  { id: 'kr-sangju', name: '상주시', nameEn: 'Sangju', country: '대한민국', countryEn: 'KR', timezone: 'Asia/Seoul', lat: 36.4109, lon: 128.1593 },
  { id: 'kr-yeongju', name: '영주시', nameEn: 'Yeongju', country: '대한민국', countryEn: 'KR', timezone: 'Asia/Seoul', lat: 36.8057, lon: 128.624 },

  // 경상남도
  { id: 'kr-changwon', name: '창원시', nameEn: 'Changwon', country: '대한민국', countryEn: 'KR', timezone: 'Asia/Seoul', lat: 35.2281, lon: 128.6811 },
  { id: 'kr-gimhae', name: '김해시', nameEn: 'Gimhae', country: '대한민국', countryEn: 'KR', timezone: 'Asia/Seoul', lat: 35.2285, lon: 128.8894 },
  { id: 'kr-jinju', name: '진주시', nameEn: 'Jinju', country: '대한민국', countryEn: 'KR', timezone: 'Asia/Seoul', lat: 35.1798, lon: 128.1076 },
  { id: 'kr-geoje', name: '거제시', nameEn: 'Geoje', country: '대한민국', countryEn: 'KR', timezone: 'Asia/Seoul', lat: 34.8806, lon: 128.6213 },
  { id: 'kr-tongyeong', name: '통영시', nameEn: 'Tongyeong', country: '대한민국', countryEn: 'KR', timezone: 'Asia/Seoul', lat: 34.8544, lon: 128.4332 },
  { id: 'kr-yangsan', name: '양산시', nameEn: 'Yangsan', country: '대한민국', countryEn: 'KR', timezone: 'Asia/Seoul', lat: 35.335, lon: 129.0374 },
  { id: 'kr-sacheon', name: '사천시', nameEn: 'Sacheon', country: '대한민국', countryEn: 'KR', timezone: 'Asia/Seoul', lat: 35.0037, lon: 128.0642 },

  // 제주
  { id: 'kr-jeju', name: '제주시', nameEn: 'Jeju', country: '대한민국', countryEn: 'KR', timezone: 'Asia/Seoul', lat: 33.4996, lon: 126.5312 },
  { id: 'kr-seogwipo', name: '서귀포시', nameEn: 'Seogwipo', country: '대한민국', countryEn: 'KR', timezone: 'Asia/Seoul', lat: 33.2541, lon: 126.5601 },
]

// ============================================================
// 세계 (~120개)
// ============================================================

const WORLD_CITIES: CityEntry[] = [
  // 동아시아
  { id: 'jp-tokyo', name: '도쿄', nameEn: 'Tokyo', country: '일본', countryEn: 'JP', timezone: 'Asia/Tokyo', lat: 35.6762, lon: 139.6503 },
  { id: 'jp-osaka', name: '오사카', nameEn: 'Osaka', country: '일본', countryEn: 'JP', timezone: 'Asia/Tokyo', lat: 34.6937, lon: 135.5023 },
  { id: 'jp-kyoto', name: '교토', nameEn: 'Kyoto', country: '일본', countryEn: 'JP', timezone: 'Asia/Tokyo', lat: 35.0116, lon: 135.7681 },
  { id: 'jp-fukuoka', name: '후쿠오카', nameEn: 'Fukuoka', country: '일본', countryEn: 'JP', timezone: 'Asia/Tokyo', lat: 33.5904, lon: 130.4017 },
  { id: 'jp-sapporo', name: '삿포로', nameEn: 'Sapporo', country: '일본', countryEn: 'JP', timezone: 'Asia/Tokyo', lat: 43.0618, lon: 141.3545 },
  { id: 'cn-beijing', name: '베이징', nameEn: 'Beijing', country: '중국', countryEn: 'CN', timezone: 'Asia/Shanghai', lat: 39.9042, lon: 116.4074 },
  { id: 'cn-shanghai', name: '상하이', nameEn: 'Shanghai', country: '중국', countryEn: 'CN', timezone: 'Asia/Shanghai', lat: 31.2304, lon: 121.4737 },
  { id: 'cn-guangzhou', name: '광저우', nameEn: 'Guangzhou', country: '중국', countryEn: 'CN', timezone: 'Asia/Shanghai', lat: 23.1291, lon: 113.2644 },
  { id: 'cn-shenzhen', name: '선전', nameEn: 'Shenzhen', country: '중국', countryEn: 'CN', timezone: 'Asia/Shanghai', lat: 22.5431, lon: 114.0579 },
  { id: 'cn-chengdu', name: '청두', nameEn: 'Chengdu', country: '중국', countryEn: 'CN', timezone: 'Asia/Shanghai', lat: 30.5728, lon: 104.0668 },
  { id: 'hk-hongkong', name: '홍콩', nameEn: 'Hong Kong', country: '홍콩', countryEn: 'HK', timezone: 'Asia/Hong_Kong', lat: 22.3193, lon: 114.1694 },
  { id: 'tw-taipei', name: '타이베이', nameEn: 'Taipei', country: '대만', countryEn: 'TW', timezone: 'Asia/Taipei', lat: 25.033, lon: 121.5654 },
  { id: 'mn-ulaanbaatar', name: '울란바토르', nameEn: 'Ulaanbaatar', country: '몽골', countryEn: 'MN', timezone: 'Asia/Ulaanbaatar', lat: 47.8864, lon: 106.9057 },

  // 동남아시아
  { id: 'sg-singapore', name: '싱가포르', nameEn: 'Singapore', country: '싱가포르', countryEn: 'SG', timezone: 'Asia/Singapore', lat: 1.3521, lon: 103.8198 },
  { id: 'th-bangkok', name: '방콕', nameEn: 'Bangkok', country: '태국', countryEn: 'TH', timezone: 'Asia/Bangkok', lat: 13.7563, lon: 100.5018 },
  { id: 'vn-hanoi', name: '하노이', nameEn: 'Hanoi', country: '베트남', countryEn: 'VN', timezone: 'Asia/Ho_Chi_Minh', lat: 21.0285, lon: 105.8542 },
  { id: 'vn-hochiminh', name: '호치민', nameEn: 'Ho Chi Minh City', country: '베트남', countryEn: 'VN', timezone: 'Asia/Ho_Chi_Minh', lat: 10.8231, lon: 106.6297 },
  { id: 'ph-manila', name: '마닐라', nameEn: 'Manila', country: '필리핀', countryEn: 'PH', timezone: 'Asia/Manila', lat: 14.5995, lon: 120.9842 },
  { id: 'id-jakarta', name: '자카르타', nameEn: 'Jakarta', country: '인도네시아', countryEn: 'ID', timezone: 'Asia/Jakarta', lat: -6.2088, lon: 106.8456 },
  { id: 'my-kualalumpur', name: '쿠알라룸푸르', nameEn: 'Kuala Lumpur', country: '말레이시아', countryEn: 'MY', timezone: 'Asia/Kuala_Lumpur', lat: 3.139, lon: 101.6869 },
  { id: 'kh-phnompenh', name: '프놈펜', nameEn: 'Phnom Penh', country: '캄보디아', countryEn: 'KH', timezone: 'Asia/Phnom_Penh', lat: 11.5564, lon: 104.9282 },
  { id: 'mm-yangon', name: '양곤', nameEn: 'Yangon', country: '미얀마', countryEn: 'MM', timezone: 'Asia/Yangon', lat: 16.8661, lon: 96.1951 },

  // 남아시아
  { id: 'in-newdelhi', name: '뉴델리', nameEn: 'New Delhi', country: '인도', countryEn: 'IN', timezone: 'Asia/Kolkata', lat: 28.6139, lon: 77.209 },
  { id: 'in-mumbai', name: '뭄바이', nameEn: 'Mumbai', country: '인도', countryEn: 'IN', timezone: 'Asia/Kolkata', lat: 19.076, lon: 72.8777 },
  { id: 'in-bangalore', name: '방갈로르', nameEn: 'Bangalore', country: '인도', countryEn: 'IN', timezone: 'Asia/Kolkata', lat: 12.9716, lon: 77.5946 },
  { id: 'lk-colombo', name: '콜롬보', nameEn: 'Colombo', country: '스리랑카', countryEn: 'LK', timezone: 'Asia/Colombo', lat: 6.9271, lon: 79.8612 },
  { id: 'np-kathmandu', name: '카트만두', nameEn: 'Kathmandu', country: '네팔', countryEn: 'NP', timezone: 'Asia/Kathmandu', lat: 27.7172, lon: 85.324 },

  // 중앙/서아시아
  { id: 'ae-dubai', name: '두바이', nameEn: 'Dubai', country: 'UAE', countryEn: 'AE', timezone: 'Asia/Dubai', lat: 25.2048, lon: 55.2708 },
  { id: 'tr-istanbul', name: '이스탄불', nameEn: 'Istanbul', country: '튀르키예', countryEn: 'TR', timezone: 'Europe/Istanbul', lat: 41.0082, lon: 28.9784 },
  { id: 'il-jerusalem', name: '예루살렘', nameEn: 'Jerusalem', country: '이스라엘', countryEn: 'IL', timezone: 'Asia/Jerusalem', lat: 31.7683, lon: 35.2137 },
  { id: 'sa-riyadh', name: '리야드', nameEn: 'Riyadh', country: '사우디', countryEn: 'SA', timezone: 'Asia/Riyadh', lat: 24.7136, lon: 46.6753 },
  { id: 'kz-almaty', name: '알마티', nameEn: 'Almaty', country: '카자흐스탄', countryEn: 'KZ', timezone: 'Asia/Almaty', lat: 43.2551, lon: 76.9126 },
  { id: 'uz-tashkent', name: '타슈켄트', nameEn: 'Tashkent', country: '우즈베키스탄', countryEn: 'UZ', timezone: 'Asia/Tashkent', lat: 41.2995, lon: 69.2401 },

  // 유럽 — 서유럽
  { id: 'gb-london', name: '런던', nameEn: 'London', country: '영국', countryEn: 'GB', timezone: 'Europe/London', lat: 51.5074, lon: -0.1278 },
  { id: 'fr-paris', name: '파리', nameEn: 'Paris', country: '프랑스', countryEn: 'FR', timezone: 'Europe/Paris', lat: 48.8566, lon: 2.3522 },
  { id: 'de-berlin', name: '베를린', nameEn: 'Berlin', country: '독일', countryEn: 'DE', timezone: 'Europe/Berlin', lat: 52.52, lon: 13.405 },
  { id: 'de-munich', name: '뮌헨', nameEn: 'Munich', country: '독일', countryEn: 'DE', timezone: 'Europe/Berlin', lat: 48.1351, lon: 11.582 },
  { id: 'nl-amsterdam', name: '암스테르담', nameEn: 'Amsterdam', country: '네덜란드', countryEn: 'NL', timezone: 'Europe/Amsterdam', lat: 52.3676, lon: 4.9041 },
  { id: 'be-brussels', name: '브뤼셀', nameEn: 'Brussels', country: '벨기에', countryEn: 'BE', timezone: 'Europe/Brussels', lat: 50.8503, lon: 4.3517 },
  { id: 'ch-zurich', name: '취리히', nameEn: 'Zurich', country: '스위스', countryEn: 'CH', timezone: 'Europe/Zurich', lat: 47.3769, lon: 8.5417 },
  { id: 'at-vienna', name: '비엔나', nameEn: 'Vienna', country: '오스트리아', countryEn: 'AT', timezone: 'Europe/Vienna', lat: 48.2082, lon: 16.3738 },
  { id: 'ie-dublin', name: '더블린', nameEn: 'Dublin', country: '아일랜드', countryEn: 'IE', timezone: 'Europe/Dublin', lat: 53.3498, lon: -6.2603 },

  // 유럽 — 남유럽
  { id: 'it-rome', name: '로마', nameEn: 'Rome', country: '이탈리아', countryEn: 'IT', timezone: 'Europe/Rome', lat: 41.9028, lon: 12.4964 },
  { id: 'it-milan', name: '밀라노', nameEn: 'Milan', country: '이탈리아', countryEn: 'IT', timezone: 'Europe/Rome', lat: 45.4642, lon: 9.19 },
  { id: 'es-madrid', name: '마드리드', nameEn: 'Madrid', country: '스페인', countryEn: 'ES', timezone: 'Europe/Madrid', lat: 40.4168, lon: -3.7038 },
  { id: 'es-barcelona', name: '바르셀로나', nameEn: 'Barcelona', country: '스페인', countryEn: 'ES', timezone: 'Europe/Madrid', lat: 41.3851, lon: 2.1734 },
  { id: 'pt-lisbon', name: '리스본', nameEn: 'Lisbon', country: '포르투갈', countryEn: 'PT', timezone: 'Europe/Lisbon', lat: 38.7223, lon: -9.1393 },
  { id: 'gr-athens', name: '아테네', nameEn: 'Athens', country: '그리스', countryEn: 'GR', timezone: 'Europe/Athens', lat: 37.9838, lon: 23.7275 },

  // 유럽 — 북유럽
  { id: 'se-stockholm', name: '스톡홀름', nameEn: 'Stockholm', country: '스웨덴', countryEn: 'SE', timezone: 'Europe/Stockholm', lat: 59.3293, lon: 18.0686 },
  { id: 'no-oslo', name: '오슬로', nameEn: 'Oslo', country: '노르웨이', countryEn: 'NO', timezone: 'Europe/Oslo', lat: 59.9139, lon: 10.7522 },
  { id: 'dk-copenhagen', name: '코펜하겐', nameEn: 'Copenhagen', country: '덴마크', countryEn: 'DK', timezone: 'Europe/Copenhagen', lat: 55.6761, lon: 12.5683 },
  { id: 'fi-helsinki', name: '헬싱키', nameEn: 'Helsinki', country: '핀란드', countryEn: 'FI', timezone: 'Europe/Helsinki', lat: 60.1699, lon: 24.9384 },

  // 유럽 — 동유럽
  { id: 'pl-warsaw', name: '바르샤바', nameEn: 'Warsaw', country: '폴란드', countryEn: 'PL', timezone: 'Europe/Warsaw', lat: 52.2297, lon: 21.0122 },
  { id: 'cz-prague', name: '프라하', nameEn: 'Prague', country: '체코', countryEn: 'CZ', timezone: 'Europe/Prague', lat: 50.0755, lon: 14.4378 },
  { id: 'hu-budapest', name: '부다페스트', nameEn: 'Budapest', country: '헝가리', countryEn: 'HU', timezone: 'Europe/Budapest', lat: 47.4979, lon: 19.0402 },
  { id: 'ro-bucharest', name: '부쿠레슈티', nameEn: 'Bucharest', country: '루마니아', countryEn: 'RO', timezone: 'Europe/Bucharest', lat: 44.4268, lon: 26.1025 },
  { id: 'ru-moscow', name: '모스크바', nameEn: 'Moscow', country: '러시아', countryEn: 'RU', timezone: 'Europe/Moscow', lat: 55.7558, lon: 37.6173 },
  { id: 'ru-saintpetersburg', name: '상트페테르부르크', nameEn: 'Saint Petersburg', country: '러시아', countryEn: 'RU', timezone: 'Europe/Moscow', lat: 59.9343, lon: 30.3351 },
  { id: 'ua-kyiv', name: '키이우', nameEn: 'Kyiv', country: '우크라이나', countryEn: 'UA', timezone: 'Europe/Kyiv', lat: 50.4501, lon: 30.5234 },

  // 북미
  { id: 'us-newyork', name: '뉴욕', nameEn: 'New York', country: '미국', countryEn: 'US', timezone: 'America/New_York', lat: 40.7128, lon: -74.006 },
  { id: 'us-losangeles', name: '로스앤젤레스', nameEn: 'Los Angeles', country: '미국', countryEn: 'US', timezone: 'America/Los_Angeles', lat: 34.0522, lon: -118.2437 },
  { id: 'us-chicago', name: '시카고', nameEn: 'Chicago', country: '미국', countryEn: 'US', timezone: 'America/Chicago', lat: 41.8781, lon: -87.6298 },
  { id: 'us-houston', name: '휴스턴', nameEn: 'Houston', country: '미국', countryEn: 'US', timezone: 'America/Chicago', lat: 29.7604, lon: -95.3698 },
  { id: 'us-sanfrancisco', name: '샌프란시스코', nameEn: 'San Francisco', country: '미국', countryEn: 'US', timezone: 'America/Los_Angeles', lat: 37.7749, lon: -122.4194 },
  { id: 'us-seattle', name: '시애틀', nameEn: 'Seattle', country: '미국', countryEn: 'US', timezone: 'America/Los_Angeles', lat: 47.6062, lon: -122.3321 },
  { id: 'us-washington', name: '워싱턴 D.C.', nameEn: 'Washington D.C.', country: '미국', countryEn: 'US', timezone: 'America/New_York', lat: 38.9072, lon: -77.0369 },
  { id: 'us-boston', name: '보스턴', nameEn: 'Boston', country: '미국', countryEn: 'US', timezone: 'America/New_York', lat: 42.3601, lon: -71.0589 },
  { id: 'us-atlanta', name: '애틀랜타', nameEn: 'Atlanta', country: '미국', countryEn: 'US', timezone: 'America/New_York', lat: 33.749, lon: -84.388 },
  { id: 'us-denver', name: '덴버', nameEn: 'Denver', country: '미국', countryEn: 'US', timezone: 'America/Denver', lat: 39.7392, lon: -104.9903 },
  { id: 'us-miami', name: '마이애미', nameEn: 'Miami', country: '미국', countryEn: 'US', timezone: 'America/New_York', lat: 25.7617, lon: -80.1918 },
  { id: 'us-honolulu', name: '호놀룰루', nameEn: 'Honolulu', country: '미국', countryEn: 'US', timezone: 'Pacific/Honolulu', lat: 21.3069, lon: -157.8583 },
  { id: 'ca-toronto', name: '토론토', nameEn: 'Toronto', country: '캐나다', countryEn: 'CA', timezone: 'America/Toronto', lat: 43.6532, lon: -79.3832 },
  { id: 'ca-vancouver', name: '밴쿠버', nameEn: 'Vancouver', country: '캐나다', countryEn: 'CA', timezone: 'America/Vancouver', lat: 49.2827, lon: -123.1207 },
  { id: 'ca-montreal', name: '몬트리올', nameEn: 'Montreal', country: '캐나다', countryEn: 'CA', timezone: 'America/Toronto', lat: 45.5017, lon: -73.5673 },
  { id: 'mx-mexicocity', name: '멕시코시티', nameEn: 'Mexico City', country: '멕시코', countryEn: 'MX', timezone: 'America/Mexico_City', lat: 19.4326, lon: -99.1332 },

  // 남미
  { id: 'br-saopaulo', name: '상파울루', nameEn: 'São Paulo', country: '브라질', countryEn: 'BR', timezone: 'America/Sao_Paulo', lat: -23.5505, lon: -46.6333 },
  { id: 'br-riodejaneiro', name: '리우데자네이루', nameEn: 'Rio de Janeiro', country: '브라질', countryEn: 'BR', timezone: 'America/Sao_Paulo', lat: -22.9068, lon: -43.1729 },
  { id: 'ar-buenosaires', name: '부에노스아이레스', nameEn: 'Buenos Aires', country: '아르헨티나', countryEn: 'AR', timezone: 'America/Argentina/Buenos_Aires', lat: -34.6037, lon: -58.3816 },
  { id: 'cl-santiago', name: '산티아고', nameEn: 'Santiago', country: '칠레', countryEn: 'CL', timezone: 'America/Santiago', lat: -33.4489, lon: -70.6693 },
  { id: 'co-bogota', name: '보고타', nameEn: 'Bogotá', country: '콜롬비아', countryEn: 'CO', timezone: 'America/Bogota', lat: 4.711, lon: -74.0721 },
  { id: 'pe-lima', name: '리마', nameEn: 'Lima', country: '페루', countryEn: 'PE', timezone: 'America/Lima', lat: -12.0464, lon: -77.0428 },

  // 오세아니아
  { id: 'au-sydney', name: '시드니', nameEn: 'Sydney', country: '호주', countryEn: 'AU', timezone: 'Australia/Sydney', lat: -33.8688, lon: 151.2093 },
  { id: 'au-melbourne', name: '멜버른', nameEn: 'Melbourne', country: '호주', countryEn: 'AU', timezone: 'Australia/Melbourne', lat: -37.8136, lon: 144.9631 },
  { id: 'au-brisbane', name: '브리즈번', nameEn: 'Brisbane', country: '호주', countryEn: 'AU', timezone: 'Australia/Brisbane', lat: -27.4698, lon: 153.0251 },
  { id: 'nz-auckland', name: '오클랜드', nameEn: 'Auckland', country: '뉴질랜드', countryEn: 'NZ', timezone: 'Pacific/Auckland', lat: -36.8485, lon: 174.7633 },
  { id: 'nz-wellington', name: '웰링턴', nameEn: 'Wellington', country: '뉴질랜드', countryEn: 'NZ', timezone: 'Pacific/Auckland', lat: -41.2865, lon: 174.7762 },

  // 아프리카
  { id: 'za-johannesburg', name: '요하네스버그', nameEn: 'Johannesburg', country: '남아공', countryEn: 'ZA', timezone: 'Africa/Johannesburg', lat: -26.2041, lon: 28.0473 },
  { id: 'za-capetown', name: '케이프타운', nameEn: 'Cape Town', country: '남아공', countryEn: 'ZA', timezone: 'Africa/Johannesburg', lat: -33.9249, lon: 18.4241 },
  { id: 'eg-cairo', name: '카이로', nameEn: 'Cairo', country: '이집트', countryEn: 'EG', timezone: 'Africa/Cairo', lat: 30.0444, lon: 31.2357 },
  { id: 'ke-nairobi', name: '나이로비', nameEn: 'Nairobi', country: '케냐', countryEn: 'KE', timezone: 'Africa/Nairobi', lat: -1.2921, lon: 36.8219 },
  { id: 'ng-lagos', name: '라고스', nameEn: 'Lagos', country: '나이지리아', countryEn: 'NG', timezone: 'Africa/Lagos', lat: 6.5244, lon: 3.3792 },
  { id: 'ma-casablanca', name: '카사블랑카', nameEn: 'Casablanca', country: '모로코', countryEn: 'MA', timezone: 'Africa/Casablanca', lat: 33.5731, lon: -7.5898 },
  { id: 'et-addisababa', name: '아디스아바바', nameEn: 'Addis Ababa', country: '에티오피아', countryEn: 'ET', timezone: 'Africa/Addis_Ababa', lat: 9.0222, lon: 38.7468 },
]

// ============================================================
// 통합 + 유틸
// ============================================================

export const ALL_CITIES: CityEntry[] = [...KOREA_CITIES, ...WORLD_CITIES]

/**
 * 검색어로 도시 필터 (name, nameEn, country 매칭)
 */
export function searchCities(query: string): CityEntry[] {
  if (!query.trim()) return ALL_CITIES
  const q = query.toLowerCase()
  return ALL_CITIES.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.nameEn.toLowerCase().includes(q) ||
      c.country.toLowerCase().includes(q) ||
      c.countryEn.toLowerCase().includes(q)
  )
}

/**
 * 사용자 timezone으로 기본 도시 추정
 */
export function guessDefaultCity(): CityEntry {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    const match = ALL_CITIES.find((c) => c.timezone === tz)
    if (match) return match
  } catch {
    // ignore
  }
  // 기본값: 서울
  return KOREA_CITIES[0]!
}

/**
 * ID로 도시 찾기
 */
export function getCityById(id: string): CityEntry | undefined {
  return ALL_CITIES.find((c) => c.id === id)
}
