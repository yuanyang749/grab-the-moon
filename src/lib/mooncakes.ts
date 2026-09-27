export const MOONCAKES = [
  {
    id: "classic",
    name: "金月莲蓉",
    english: "GOLDEN LOTUS",
    flavor: "经典莲蓉 · 醇厚团圆",
    wish: "愿今夜的好事，都如满月。",
    texture: "/textures/mooncake/top-nobug.jpg",
    side: "/textures/mooncake/side.jpg",
    bottom: "/textures/mooncake/bottom-baked.png",
    surface: "#e8a245",
    glow: "#ff9e24",
  },
  {
    id: "matcha",
    name: "抹茶红豆",
    english: "MATCHA & BEAN",
    flavor: "清茶微苦 · 红豆回甘",
    wish: "愿想念的人，恰好也在想你。",
    texture: "/textures/mooncake/top-matcha.jpg",
    side: "/textures/mooncake/side-matcha.jpg",
    bottom: "/textures/mooncake/bottom-matcha.jpg",
    surface: "#b5c883",
    glow: "#d4c17b",
  },
  {
    id: "sesame",
    name: "黑芝麻流心",
    english: "BLACK SESAME",
    flavor: "浓香芝麻 · 暖心流心",
    wish: "愿藏在心里的甜，都有回响。",
    texture: "/textures/mooncake/top-sesame.jpg",
    side: "/textures/mooncake/side-sesame.jpg",
    bottom: "/textures/mooncake/bottom-sesame.jpg",
    surface: "#b4a59b",
    glow: "#d6a177",
  },
  {
    id: "rose",
    name: "玫瑰荔枝",
    english: "ROSE & LYCHEE",
    flavor: "清甜荔枝 · 淡淡花香",
    wish: "愿每一次相见，都带着花香。",
    texture: "/textures/mooncake/top-rose.jpg",
    side: "/textures/mooncake/side-rose.jpg",
    bottom: "/textures/mooncake/bottom-rose.jpg",
    surface: "#edc2c9",
    glow: "#e8a9ab",
  },
  {
    id: "osmanthus",
    name: "桂花乌龙",
    english: "OSMANTHUS OOLONG",
    flavor: "桂花清香 · 乌龙回甘",
    wish: "愿月光照见的路，都有花香。",
    texture: "/textures/mooncake/top-osmanthus.jpg",
    side: "/textures/mooncake/side-osmanthus.jpg",
    bottom: "/textures/mooncake/bottom-osmanthus.jpg",
    surface: "#e8c37d",
    glow: "#f3bd67",
  },
  {
    id: "taro",
    name: "紫薯芋泥",
    english: "PURPLE YAM & TARO",
    flavor: "绵密紫薯 · 软糯芋香",
    wish: "愿温柔的心意，都有归处。",
    texture: "/textures/mooncake/top-taro.jpg",
    side: "/textures/mooncake/side-taro.jpg",
    bottom: "/textures/mooncake/bottom-taro.jpg",
    surface: "#bea1c3",
    glow: "#d9a8cf",
  },
] as const;

export type MooncakeId = (typeof MOONCAKES)[number]["id"];

export function isMooncakeId(value: unknown): value is MooncakeId {
  return MOONCAKES.some((cake) => cake.id === value);
}

export function drawMooncake(bag: MooncakeId[], previous: MooncakeId | null): {
  id: MooncakeId;
  remaining: MooncakeId[];
} {
  const available = bag.length ? [...bag] : MOONCAKES.map((cake) => cake.id);
  const candidates = bag.length || !previous ? available : available.filter((id) => id !== previous);
  const id = candidates[Math.floor(Math.random() * candidates.length)];
  return { id, remaining: available.filter((candidate) => candidate !== id) };
}
