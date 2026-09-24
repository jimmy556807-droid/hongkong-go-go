export const STATIONS: Record<string, string> = {
  CEN: "中環", ADM: "金鐘", WAC: "灣仔", CAB: "銅鑼灣", TIH: "天后", FOH: "炮台山", NOP: "北角", QUB: "鰂魚涌", TAK: "太古", SWH: "西灣河", SKW: "筲箕灣", HFC: "杏花邨", CHW: "柴灣", SHW: "上環", SYP: "西營盤", HKU: "香港大學", KET: "堅尼地城",
  TST: "尖沙咀", JOR: "佐敦", YMT: "油麻地", MOK: "旺角", PRE: "太子", SSP: "深水埗", CSW: "長沙灣", LCK: "荔枝角", MEF: "美孚", LAK: "荔景", KWF: "葵芳", KWH: "葵興", TWH: "大窩口", TSW: "荃灣",
  WHA: "黃埔", HOM: "何文田", SKM: "石硤尾", KOT: "九龍塘", LOF: "樂富", WTS: "黃大仙", DIH: "鑽石山", CHH: "彩虹", KOB: "九龍灣", NTK: "牛頭角", KWT: "觀塘", LAT: "藍田", YAT: "油塘", TIK: "調景嶺",
  TKO: "將軍澳", LHP: "康城", HAH: "坑口", POA: "寶琳",
  HOK: "香港", KOW: "九龍", TSY: "青衣", AIR: "機場", AWE: "博覽館", OLY: "奧運", NAC: "南昌", SUN: "欣澳", TUC: "東涌",
  OCP: "海洋公園", WCH: "黃竹坑", LET: "利東", SOH: "海怡半島",
  EXC: "會展", HUH: "紅磡", MKK: "旺角東", TAW: "大圍", SHT: "沙田", FOT: "火炭", RAC: "馬場", UNI: "大學", TAP: "大埔墟", TWO: "太和", FAN: "粉嶺", SHS: "上水", LOW: "羅湖", LMC: "落馬洲",
};

export const LINES: { code: string; name: string; color: string; stations: string[] }[] = [
  { code: "ISL", name: "港島綫", color: "#0075C2", stations: ["KET", "HKU", "SYP", "SHW", "CEN", "ADM", "WAC", "CAB", "TIH", "FOH", "NOP", "QUB", "TAK", "SWH", "SKW", "HFC", "CHW"] },
  { code: "TWL", name: "荃灣綫", color: "#E2231A", stations: ["CEN", "ADM", "TST", "JOR", "YMT", "MOK", "PRE", "SSP", "CSW", "LCK", "MEF", "LAK", "KWF", "KWH", "TWH", "TSW"] },
  { code: "KTL", name: "觀塘綫", color: "#00A040", stations: ["WHA", "HOM", "YMT", "MOK", "PRE", "SKM", "KOT", "LOF", "WTS", "DIH", "CHH", "KOB", "NTK", "KWT", "LAT", "YAT", "TIK"] },
  { code: "TKL", name: "將軍澳綫", color: "#7D499D", stations: ["NOP", "QUB", "YAT", "TIK", "TKO", "LHP", "HAH", "POA"] },
  { code: "EAL", name: "東鐵綫", color: "#53B7E8", stations: ["ADM", "EXC", "HUH", "MKK", "KOT", "TAW", "SHT", "FOT", "RAC", "UNI", "TAP", "TWO", "FAN", "SHS", "LOW", "LMC"] },
  { code: "TCL", name: "東涌綫", color: "#F7943E", stations: ["HOK", "KOW", "OLY", "NAC", "LAK", "TSY", "SUN", "TUC"] },
  { code: "AEL", name: "機場快綫", color: "#00888A", stations: ["HOK", "KOW", "TSY", "AIR", "AWE"] },
  { code: "SIL", name: "南港島綫", color: "#BAC429", stations: ["ADM", "OCP", "WCH", "LET", "SOH"] },
];
