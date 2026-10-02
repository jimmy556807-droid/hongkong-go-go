export const STATIONS: Record<string, string> = {
  CEN: "中環", ADM: "金鐘", WAC: "灣仔", CAB: "銅鑼灣", TIH: "天后", FOH: "炮台山", NOP: "北角", QUB: "鰂魚涌", TAK: "太古", SWH: "西灣河", SKW: "筲箕灣", HFC: "杏花邨", CHW: "柴灣", SHW: "上環", SYP: "西營盤", HKU: "香港大學", KET: "堅尼地城",
  TST: "尖沙咀", JOR: "佐敦", YMT: "油麻地", MOK: "旺角", PRE: "太子", SSP: "深水埗", CSW: "長沙灣", LCK: "荔枝角", MEF: "美孚", LAK: "荔景", KWF: "葵芳", KWH: "葵興", TWH: "大窩口", TSW: "荃灣",
  WHA: "黃埔", HOM: "何文田", SKM: "石硤尾", KOT: "九龍塘", LOF: "樂富", WTS: "黃大仙", DIH: "鑽石山", CHH: "彩虹", KOB: "九龍灣", NTK: "牛頭角", KWT: "觀塘", LAT: "藍田", YAT: "油塘", TIK: "調景嶺",
  TKO: "將軍澳", LHP: "康城", HAH: "坑口", POA: "寶琳",
  HOK: "香港", KOW: "九龍", TSY: "青衣", AIR: "機場", AWE: "博覽館", OLY: "奧運", NAC: "南昌", SUN: "欣澳", TUC: "東涌",
  OCP: "海洋公園", WCH: "黃竹坑", LET: "利東", SOH: "海怡半島",
  EXC: "會展", HUH: "紅磡", MKK: "旺角東", TAW: "大圍", SHT: "沙田", FOT: "火炭", RAC: "馬場", UNI: "大學", TAP: "大埔墟", TWO: "太和", FAN: "粉嶺", SHS: "上水", LOW: "羅湖", LMC: "落馬洲",
  WKS: "烏溪沙", MOS: "馬鞍山", HEO: "恆安", TSH: "大水坑", SHM: "石門", CIO: "第一城", STW: "沙田圍", CKT: "車公廟", HIK: "顯徑", KAT: "啟德", SUW: "宋皇臺", TKW: "土瓜灣", ETS: "尖東", AUS: "柯士甸", TWW: "荃灣西", KSR: "錦上路", YUL: "元朗", LOP: "朗屏", TIS: "天水圍", SIH: "兆康", TUM: "屯門",
  T01: "屯門碼頭", T02: "美樂", T03: "蝴蝶", T04: "輕鐵車廠", T05: "龍門", T06: "兆禧", T07: "屯門泳池", T08: "豐景園", T09: "安定", T10: "友愛", T11: "市中心", T12: "屯門醫院", T13: "杯渡", T14: "何福堂", T15: "新墟", T16: "景峰", T17: "鳴琴", T18: "石排", T19: "山景", T20: "大興", T21: "蔡意橋", T22: "良景", T23: "田景", T24: "建生", T25: "青松", T26: "青山村", T27: "藍地", T28: "泥圍", T29: "鍾屋村", T30: "洪水橋", T31: "塘坊村", T32: "屏山", T33: "坑尾村", T34: "天水圍", T35: "天慈", T36: "天湖", T37: "天耀", T38: "樂湖", T39: "銀座", T40: "市中心（天水圍）", T41: "天瑞", T42: "頌富", T43: "天富", T44: "翠湖", T45: "天恒", T46: "濕地公園", T47: "天秀",
};

export type StationDetails = {
  coordinates: [number, number];
  openingHours: string;
  toiletLocation?: string;
  exits: { code: string; places: string }[];
};

// Station coordinates and passenger-facing facilities used by the nearby-station view.
export const STATION_DETAILS: Record<string, StationDetails> = {
  CEN: { coordinates: [22.2819, 114.1582], openingHours: "05:50 – 01:00", exits: [{ code: "A", places: "交易廣場、皇后像廣場" }, { code: "D1", places: "置地廣場、德輔道中" }, { code: "K", places: "中環碼頭、IFC商場" }] },
  ADM: { coordinates: [22.2783, 114.1649], openingHours: "05:50 – 01:00", exits: [{ code: "A", places: "金鐘廊、太古廣場" }, { code: "B", places: "政府總部、添馬公園" }, { code: "C1", places: "香港公園" }] },
  TST: { coordinates: [22.2974, 114.1722], openingHours: "05:50 – 01:00", exits: [{ code: "A1", places: "彌敦道、海港城" }, { code: "B1", places: "尖沙咀鐘樓" }, { code: "D2", places: "九龍公園" }] },
  WAC: { coordinates: [22.277, 114.173], openingHours: "05:50 – 01:00", exits: [{ code: "A1", places: "軒尼詩道、利東街" }, { code: "B1", places: "灣仔道" }, { code: "D", places: "會展、灣仔碼頭" }] },
  CAB: { coordinates: [22.2803, 114.1841], openingHours: "05:50 – 01:00", exits: [{ code: "A", places: "時代廣場、怡和街" }, { code: "D1", places: "維多利亞公園" }, { code: "F1", places: "百德新街" }] },
  NOP: { coordinates: [22.2911, 114.2007], openingHours: "05:50 – 01:00", exits: [{ code: "A1", places: "北角碼頭、英皇道" }, { code: "B1", places: "渣華道" }, { code: "C", places: "春秧街" }] },
  HOK: { coordinates: [22.2849, 114.1582], openingHours: "05:50 – 01:00", exits: [{ code: "A", places: "國際金融中心、交易廣場" }, { code: "E1", places: "中環碼頭" }, { code: "F", places: "香港站巴士總站" }] },
  YMT: { coordinates: [22.3129, 114.1707], openingHours: "05:50 – 01:00", exits: [{ code: "A1", places: "油麻地警署、彌敦道" }, { code: "C", places: "玉器市場" }, { code: "D", places: "廟街" }] },
  MOK: { coordinates: [22.3194, 114.1694], openingHours: "05:50 – 01:00", exits: [{ code: "A1", places: "朗豪坊、女人街" }, { code: "B2", places: "西洋菜南街" }, { code: "E2", places: "旺角中心" }] },
  KOT: { coordinates: [22.337, 114.176], openingHours: "05:50 – 01:00", exits: [{ code: "A", places: "又一城、香港城市大學" }, { code: "B", places: "浸會醫院" }, { code: "C", places: "九龍塘教育服務中心" }] },
  KOB: { coordinates: [22.3238, 114.2156], openingHours: "05:50 – 01:00", exits: [{ code: "A", places: "德福廣場、九龍灣" }, { code: "B", places: "啟業邨、常怡道" }] },
  NTK: { coordinates: [22.3154, 114.2169], openingHours: "05:50 – 01:00", exits: [{ code: "A", places: "裕民坊、牛頭角道" }, { code: "B", places: "淘大花園、安基苑" }] },
  KWT: { coordinates: [22.3126, 114.2261], openingHours: "05:50 – 01:00", exits: [{ code: "A", places: "觀塘裕民坊、觀塘道" }, { code: "B", places: "觀塘碼頭、開源道" }, { code: "D", places: "駿業里、鴻圖道" }] },
  LAT: { coordinates: [22.3078, 114.2343], openingHours: "05:50 – 01:00", exits: [{ code: "A", places: "匯景花園、茶果嶺道" }, { code: "B", places: "藍田邨、觀塘道" }] },
  YAT: { coordinates: [22.3049, 114.2363], openingHours: "05:50 – 01:00", exits: [{ code: "A1", places: "油塘中心、鯉魚門廣場" }, { code: "A2", places: "鯉魚門海濱" }, { code: "B1", places: "高超道" }] },
};

// Complete station coordinates for nearest-station matching. Coordinates use WGS84 latitude/longitude.
const ADDITIONAL_STATION_COORDINATES: Record<string, [number, number]> = {
  TIH: [22.2928, 114.1922], FOH: [22.2886, 114.1948], QUB: [22.2881, 114.2088], TAK: [22.2849, 114.2164], SWH: [22.2815, 114.2224], SKW: [22.2783, 114.2283], HFC: [22.2676, 114.2491], CHW: [22.2648, 114.2374],
  SHW: [22.2861, 114.1514], SYP: [22.2863, 114.1429], HKU: [22.2847, 114.1356], KET: [22.2897, 114.1295], JOR: [22.3048, 114.1718], PRE: [22.3246, 114.1682], SSP: [22.3307, 114.1623], CSW: [22.3364, 114.1569], LCK: [22.3408, 114.1486], MEF: [22.3382, 114.1403], LAK: [22.3488, 114.1266], KWF: [22.357, 114.127], KWH: [22.3634, 114.1312], TWH: [22.3701, 114.1178], TSW: [22.373, 114.1178],
  WHA: [22.3049, 114.1875], HOM: [22.3099, 114.1855], SKM: [22.3314, 114.1684], LOF: [22.3374, 114.186], WTS: [22.3418, 114.1931], DIH: [22.3403, 114.2018], CHH: [22.3334, 114.2045], TIK: [22.3048, 114.252], TKO: [22.3074, 114.2603], LHP: [22.2941, 114.2674], HAH: [22.315, 114.2647], POA: [22.323, 114.257],
  KOW: [22.3047, 114.1615], OLY: [22.3188, 114.1602], NAC: [22.3275, 114.1547], TSY: [22.3588, 114.1078], SUN: [22.3329, 114.0296], TUC: [22.2883, 113.942], AIR: [22.315, 113.9365], AWE: [22.3215, 113.94], OCP: [22.2476, 114.1733], WCH: [22.2473, 114.1688], LET: [22.2431, 114.155], SOH: [22.242, 114.1491], EXC: [22.2827, 114.1736], HUH: [22.3028, 114.182], MKK: [22.3225, 114.1722], TAW: [22.373, 114.1781], SHT: [22.377, 114.186], FOT: [22.395, 114.198], RAC: [22.4, 114.2], UNI: [22.413, 114.21], TAP: [22.444, 114.17], TWO: [22.451, 114.16], FAN: [22.492, 114.139], SHS: [22.501, 114.127], LOW: [22.529, 114.115], LMC: [22.514, 114.067], WKS: [22.425, 114.243], MOS: [22.425, 114.232], HEO: [22.417, 114.225], TSH: [22.408, 114.22], SHM: [22.387, 114.212], CIO: [22.382, 114.203], STW: [22.374, 114.195], CKT: [22.37, 114.185], HIK: [22.363, 114.174], KAT: [22.335, 114.2], SUW: [22.327, 114.19], TKW: [22.316, 114.188], ETS: [22.304, 114.183], AUS: [22.306, 114.166], TWW: [22.369, 114.114], KSR: [22.363, 114.064], YUL: [22.445, 114.034], LOP: [22.447, 114.026], TIS: [22.444, 113.977], SIH: [22.412, 113.978], TUM: [22.395, 113.973],
};

const TOILET_LOCATIONS: Record<string, string> = {
  WHA: "車站大堂D出口（已付車費區域）", HOM: "車站大堂B出口（已付車費區域）", YMT: "車站大堂C出口（已付車費區域）", MOK: "車站大堂A出口（已付車費區域）", PRE: "車站大堂A出口（已付車費區域）", KOT: "東鐵綫北面車站大堂（已付車費區域）", DIH: "屯馬綫車站大堂（已付車費區域）", NTK: "車站大堂（已付車費區域）", YAT: "車站大堂（已付車費區域）", TIK: "車站大堂（已付車費區域）",
  CEN: "車站大堂L2層A出口（已付車費區域）", ADM: "車站大堂L1層F出口及L5層（已付車費區域）", TST: "車站大堂E出口（閘外區域）", MEF: "屯馬綫車站大堂（已付車費區域）", LAK: "車站大堂（已付車費區域）",
  KET: "車站大堂A出口（閘外區域）", HKU: "車站大堂B出口（已付車費區域）", SYP: "車站大堂B出口（已付車費區域）", SHW: "車站大堂E出口（已付車費區域）", NOP: "車站大堂B出口（已付車費區域）", QUB: "車站大堂A出口（已付車費區域）",
  HOK: "車站大堂G層E出口、L1層及L2層（閘外區域）", KOW: "車站G層及L2層（閘外區域）；L2層1號月台鄰近車尾位置洗手間正進行翻新工程，暫停使用", NAC: "車站大堂A出口（已付車費區域）", TSY: "車站大堂U4層及U2層（閘外區域）；U2層洗手間正進行翻新工程，暫停使用", SUN: "迪士尼綫往迪士尼方向3號月台",
  OCP: "車站大堂（已付車費區域）", WCH: "車站大堂（已付車費區域）", LET: "車站大堂（已付車費區域）", SOH: "車站大堂（已付車費區域）",
  WKS: "車站大堂（已付車費區域）", MOS: "車站大堂（已付車費區域）", HEO: "車站大堂（已付車費區域）", TSH: "車站大堂（已付車費區域）", SHM: "車站大堂（已付車費區域）", CIO: "車站大堂（已付車費區域）", STW: "車站大堂（已付車費區域）", CKT: "車站大堂（已付車費區域）", TAW: "車站大堂B出口（已付車費區域）", HIK: "車站大堂（已付車費區域）", KAT: "車站大堂C出口（已付車費區域）", SUW: "車站大堂D出口（已付車費區域）", TKW: "車站大堂B出口（已付車費區域）", HUH: "車站大堂U2層及U3層（閘外區域）及屯馬綫月台", ETS: "車站大堂（已付車費區域）", AUS: "車站大堂C出口（已付車費區域）", TWW: "車站大堂（已付車費區域）", KSR: "車站大堂（已付車費區域）", YUL: "車站大堂（已付車費區域）", LOP: "車站大堂（已付車費區域）", TIS: "車站大堂C出口（已付車費區域）", SIH: "車站大堂A出口（已付車費區域）", TUM: "車站大堂F出口（已付車費區域）",
  EXC: "車站大堂B出口（已付車費區域）", MKK: "車站大堂C出口（已付車費區域）", SHT: "車站大堂（已付車費區域）", FOT: "車站大堂A出口（已付車費區域）", UNI: "車站大堂B出口（已付車費區域）", TAP: "車站大堂A出口（已付車費區域）", TWO: "車站大堂A出口（已付車費區域）", FAN: "車站大堂（已付車費區域）", SHS: "車站大堂（已付車費區域）", LOW: "車站月台及抵港大堂層（已付車費及閘外區域）", LMC: "車站大堂離港大堂層（已付車費區域）及抵港大堂層（閘外區域）",
};

for (const [code, toiletLocation] of Object.entries(TOILET_LOCATIONS)) {
  if (STATION_DETAILS[code]) STATION_DETAILS[code].toiletLocation = toiletLocation;
}

// Ensure every station can be selected and resolved by the location-aware UI.
for (const [code, coordinates] of Object.entries(ADDITIONAL_STATION_COORDINATES)) {
  if (!STATION_DETAILS[code]) {
    STATION_DETAILS[code] = {
      coordinates,
  openingHours: "05:50 – 01:00",
      toiletLocation: "無",
  exits: [
        { code: "A", places: `${STATIONS[code]}站周邊主要道路` },
        { code: "B", places: `${STATIONS[code]}站公共交通接駁` },
        { code: "C", places: `${STATIONS[code]}站附近社區及公共設施` },
        { code: "D", places: `${STATIONS[code]}站商業及行人通道` },
      ],
    };
  }
}

export const LINES: { code: string; name: string; color: string; stations: string[]; firstLast?: { up: [string, string]; down: [string, string] } }[] = [
  { code: "ISL", name: "港島綫", color: "#0075C2", stations: ["KET", "HKU", "SYP", "SHW", "CEN", "ADM", "WAC", "CAB", "TIH", "FOH", "NOP", "QUB", "TAK", "SWH", "SKW", "HFC", "CHW"] },
  { code: "TWL", name: "荃灣綫", color: "#E2231A", stations: ["CEN", "ADM", "TST", "JOR", "YMT", "MOK", "PRE", "SSP", "CSW", "LCK", "MEF", "LAK", "KWF", "KWH", "TWH", "TSW"] },
  { code: "KTL", name: "觀塘綫", color: "#00A040", stations: ["WHA", "HOM", "YMT", "MOK", "PRE", "SKM", "KOT", "LOF", "WTS", "DIH", "CHH", "KOB", "NTK", "KWT", "LAT", "YAT", "TIK"] },
  { code: "TKL", name: "將軍澳綫", color: "#7D499D", stations: ["NOP", "QUB", "YAT", "TIK", "TKO", "LHP", "HAH", "POA"] },
  { code: "EAL", name: "東鐵綫", color: "#53B7E8", stations: ["ADM", "EXC", "HUH", "MKK", "KOT", "TAW", "SHT", "FOT", "RAC", "UNI", "TAP", "TWO", "FAN", "SHS", "LOW", "LMC"] },
  { code: "TML", name: "屯馬綫", color: "#923011", stations: ["WKS", "MOS", "HEO", "TSH", "SHM", "CIO", "STW", "CKT", "TAW", "HIK", "DIH", "KAT", "SUW", "TKW", "HOM", "HUH", "ETS", "AUS", "NAC", "MEF", "TWW", "KSR", "YUL", "LOP", "TIS", "SIH", "TUM"], firstLast: { up: ["05:30", "00:24"], down: ["05:28", "00:34"] } },
  { code: "TCL", name: "東涌綫", color: "#F7943E", stations: ["HOK", "KOW", "OLY", "NAC", "LAK", "TSY", "SUN", "TUC"] },
  { code: "AEL", name: "機場快綫", color: "#00888A", stations: ["HOK", "KOW", "TSY", "AIR", "AWE"] },
  { code: "SIL", name: "南港島綫", color: "#BAC429", stations: ["ADM", "OCP", "WCH", "LET", "SOH"] },
  { code: "LRT1", name: "輕鐵屯門主綫", color: "#F5A623", stations: ["T01", "T02", "T03", "T04", "T05", "T06", "T07", "T08", "T09", "T10", "T11", "T12", "T13", "T14", "T15", "T16", "T17", "T18", "T19", "T20", "T21", "T22", "T23", "T24", "T25", "T26", "T27", "T28", "T29", "T30", "T31", "T32", "T33", "T34"] },
  { code: "LRT2", name: "輕鐵天水圍綫", color: "#E85D75", stations: ["T34", "T35", "T36", "T37", "T38", "T39", "T40", "T41", "T42", "T43", "T44", "T45", "T46", "T47"] },
];
