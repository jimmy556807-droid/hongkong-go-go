// 港鐵特惠站（來源：mtr.com.hk 港鐵特惠站列表；座標經地址查詢取得，約略位置）
export type FareSaver = { name: string; stations: string; lat: number; lng: number };

export const FARE_SAVERS: FareSaver[] = [
  {
    name: "中環至半山自動扶手電梯系統",
    stations: "中環／香港／上環",
    lat: 22.28429,
    lng: 114.15578,
  },
  { name: "和富中心", stations: "炮台山／北角", lat: 22.29242, lng: 114.19655 },
  { name: "偉利廣場", stations: "上環", lat: 22.28593, lng: 114.14907 },
  { name: "深灣辦公室大樓", stations: "黃竹坑", lat: 22.2462, lng: 114.1701 },
  { name: "海港城港威商場", stations: "柯士甸／尖沙咀", lat: 22.2978, lng: 114.1683 },
  { name: "彩雲商場", stations: "彩虹", lat: 22.33399, lng: 114.2145 },
  { name: "鳳德商場", stations: "鑽石山", lat: 22.3443, lng: 114.20066 },
  { name: "半島中心", stations: "尖東／尖沙咀", lat: 22.29903, lng: 114.17723 },
  { name: "何文田廣場", stations: "何文田", lat: 22.31621, lng: 114.18183 },
  { name: "愛民廣場", stations: "何文田", lat: 22.31238, lng: 114.17901 },
  { name: "家維商場", stations: "何文田／黃埔", lat: 22.3075, lng: 114.1869 },
  { name: "企業廣場", stations: "九龍灣", lat: 22.32203, lng: 114.20786 },
  { name: "平田商場", stations: "藍田", lat: 22.30585, lng: 114.2373 },
  { name: "盈暉薈", stations: "美孚", lat: 22.34158, lng: 114.13675 },
  { name: "大角咀市政大廈", stations: "旺角／奧運／太子", lat: 22.32188, lng: 114.16279 },
  { name: "海盈邨", stations: "南昌", lat: 22.3303, lng: 114.1543 },
  { name: "港灣豪庭廣場", stations: "南昌／奧運", lat: 22.32439, lng: 114.16008 },
  { name: "白田商場", stations: "石硤尾", lat: 22.33665, lng: 114.16884 },
  { name: "欣榮商場", stations: "宋皇臺／土瓜灣", lat: 22.32152, lng: 114.1892 },
  { name: "土瓜灣體育館", stations: "土瓜灣", lat: 22.3228, lng: 114.1918 },
  { name: "啟德花園購物商場", stations: "黃大仙", lat: 22.33802, lng: 114.19417 },
  { name: "駿發花園商場", stations: "油麻地", lat: 22.31079, lng: 114.16795 },
  { name: "置富第一城", stations: "第一城", lat: 22.3854, lng: 114.20466 },
  { name: "沙田商業中心", stations: "火炭", lat: 22.39721, lng: 114.1933 },
  { name: "穗禾商場", stations: "火炭", lat: 22.39387, lng: 114.19461 },
  { name: "富寧花園商場", stations: "坑口", lat: 22.31991, lng: 114.26763 },
  { name: "頌安商場", stations: "恆安／馬鞍山", lat: 22.42181, lng: 114.22661 },
  { name: "葵盛東商場", stations: "葵興", lat: 22.36417, lng: 114.1269 },
  { name: "葵星中心", stations: "葵興", lat: 22.36563, lng: 114.13556 },
  { name: "耀安商場", stations: "馬鞍山", lat: 22.42048, lng: 114.23044 },
  { name: "美林商場", stations: "大圍", lat: 22.37743, lng: 114.17486 },
  { name: "新翠商場", stations: "大圍", lat: 22.37014, lng: 114.1809 },
  { name: "葵涌商場", stations: "大窩口", lat: 22.37538, lng: 114.1331 },
  { name: "悅來坊", stations: "大窩口", lat: 22.36909, lng: 114.12067 },
  { name: "大窩口第二商場", stations: "大窩口", lat: 22.36836, lng: 114.12371 },
  { name: "TKO Spot", stations: "將軍澳", lat: 22.31101, lng: 114.25891 },
  { name: "長發街市", stations: "青衣", lat: 22.36312, lng: 114.10306 },
  { name: "青衣市政大廈", stations: "青衣", lat: 22.3541, lng: 114.10646 },
  { name: "荃新天地", stations: "荃灣／荃灣西", lat: 22.37, lng: 114.11433 },
  { name: "愉景新城", stations: "荃灣", lat: 22.37641, lng: 114.11244 },
  { name: "大鴻輝（荃灣）中心", stations: "荃灣", lat: 22.36999, lng: 114.1168 },
];

export function distKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const r = Math.PI / 180;
  const x =
    Math.sin(((b.lat - a.lat) * r) / 2) ** 2 +
    Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(((b.lng - a.lng) * r) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(x));
}

export function nearestFareSaver(p: { lat: number; lng: number }) {
  return FARE_SAVERS.map((f) => ({ ...f, km: distKm(p, f) })).sort((a, b) => a.km - b.km)[0]!;
}
