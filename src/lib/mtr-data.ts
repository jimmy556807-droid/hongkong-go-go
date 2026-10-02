export const STATIONS: Record<string, string> = {
  CEN: "中環", ADM: "金鐘", WAC: "灣仔", CAB: "銅鑼灣", TIH: "天后", FOH: "炮台山", NOP: "北角", QUB: "鰂魚涌", TAK: "太古", SWH: "西灣河", SKW: "筲箕灣", HFC: "杏花邨", CHW: "柴灣", SHW: "上環", SYP: "西營盤", HKU: "香港大學", KET: "堅尼地城",
  TST: "尖沙咀", JOR: "佐敦", YMT: "油麻地", MOK: "旺角", PRE: "太子", SSP: "深水埗", CSW: "長沙灣", LCK: "荔枝角", MEF: "美孚", LAK: "荔景", KWF: "葵芳", KWH: "葵興", TWH: "大窩口", TSW: "荃灣",
  WHA: "黃埔", HOM: "何文田", SKM: "石硤尾", KOT: "九龍塘", LOF: "樂富", WTS: "黃大仙", DIH: "鑽石山", CHH: "彩虹", KOB: "九龍灣", NTK: "牛頭角", KWT: "觀塘", LAT: "藍田", YAT: "油塘", TIK: "調景嶺",
  TKO: "將軍澳", LHP: "康城", HAH: "坑口", POA: "寶琳",
  HOK: "香港", KOW: "九龍", TSY: "青衣", AIR: "機場", AWE: "博覽館", OLY: "奧運", NAC: "南昌", SUN: "欣澳", TUC: "東涌",
  OCP: "海洋公園", WCH: "黃竹坑", LET: "利東", SOH: "海怡半島",
  EXC: "會展", HUH: "紅磡", MKK: "旺角東", TAW: "大圍", SHT: "沙田", FOT: "火炭", RAC: "馬場", UNI: "大學", TAP: "大埔墟", TWO: "太和", FAN: "粉嶺", SHS: "上水", LOW: "羅湖", LMC: "落馬洲",
  WKS: "烏溪沙", MOS: "馬鞍山", HEO: "恆安", TSH: "大水坑", SHM: "石門", CIO: "第一城", STW: "沙田圍", CKT: "車公廟", HIK: "顯徑", KAT: "啟德", SUW: "宋皇臺", TKW: "土瓜灣", ETS: "尖東", AUS: "柯士甸", TWW: "荃灣西", KSR: "錦上路", YUL: "元朗", LOP: "朗屏", TIS: "天水圍", SIH: "兆康", TUM: "屯門",
};

export type StationDetails = {
  coordinates: [number, number];
  openingHours: string;
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
};

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
];
