# 素材与设计记录

## 设计提取

先通过内置 `image_gen` 生成 `first-screen.png`，再搭建 UI；参考图不作为整屏图片铺在页面上。

单屏月亮互动玩具，非营销落地页。设计参数：DESIGN_VARIANCE 5、MOTION_INTENSITY 6、VISUAL_DENSITY 2。原生 CSS，不套组件库。

- 深蓝黑 `#080c13` 为底，暖白 `#efe8d9` 标题，灰色 `#aaa79f` 辅助文字，金色 `#d7b87d` 仅用于完成态。
- 左上角约 4% 边距；标题轻字重、宽字距、两行。参考文字完整保留。
- 月亮是唯一视觉重心，水平中心略偏右到 54%；手机恢复 50% 居中。
- 下方提示短小，无主按钮抢焦点；完成后才出现重玩按钮。
- 参考图里星点较多，实现减少其数量与亮度，避免干扰真实月面。
- 不引入导航、功能卡片、统计标签或装饰性面板。
- 动效服务于抓取、回弹、转换反馈；系统减少动态效果时移除漂浮、震动和粒子。

## 中秋夜景背景（后续更新）

- 初版背景已清理；以下两张为当前使用的版本。
- 当前桌面图：`public/images/mid-autumn-night-v2.png`，1672×941 PNG；增加桥头、兔子、灯笼和湖面月光。
- 当前竖屏图：`public/images/mid-autumn-night-portrait.png`，1086×1448 PNG；为窄屏重新构图，避免兔子被 `cover` 裁掉。
- 工具：Codex 内置 `image_gen`。用户提供的节日场景图仅作为氛围参考；生成图不包含月亮、设备、文字或界面，月亮仍由实时 3D 场景渲染。
- 网页以渐层叠加背景图，保留标题可读性；纵向屏幕切换到独立竖屏图。

### 背景完整生成提示词

```text
Use case: stylized-concept
Asset type: full-bleed 16:9 website background raster for an interactive Mid-Autumn moon-to-mooncake experience.
Primary request: create one poetic night landscape: a deep navy starry sky over distant dark mountain silhouettes and a calm lake. Sparse, tiny warm lantern lights and their restrained reflections recede along the far shoreline; a few subtle lanterns sit at the far left and right edges. Delicate flowering branches appear only in the extreme outer corners.
Style/medium: cinematic painterly realism with refined atmospheric depth, elegant East Asian festival mood, natural landscape rather than a product mockup.
Composition/framing: wide uninterrupted scenic vista. The upper-center sky must remain clean, dark, and spacious for a separate glowing 3D moon that will be overlaid later. The upper-left must stay especially dark and visually quiet for an existing heading. Keep mountains low across the lower half, with calm water below. Edge details must stay peripheral and never intrude into the center.
Lighting/mood: tranquil midnight blues, a few tiny stars, restrained amber accents at the horizon and water; no dominant light source.
Color palette: near-black indigo, midnight navy, muted slate blue, very sparse warm amber.
Constraints: absolutely no moon, crescent, planet, eclipse, halo, circular glow, or bright center-sky feature. No device frames, website UI, typography, logos, watermarks, people, hands, food, or mooncakes. No foreground table or architectural facade. The image must work as an unobstructed full-bleed background behind live interface elements.
```

### 桌面背景增补完整提示词

```text
Use case: precise-object-edit
Asset type: wide 16:9 full-bleed website background.
Input images: Image 1 is the edit target and its landscape, framing, sky, mountains, lake, shoreline lights, and edge blossoms must be preserved. Image 2 is mood and composition reference only; do not copy its devices, text, giant moon, crescent, hands, mooncake, or UI.
Primary request: edit Image 1 to add three small scene details. At the lower-left foreground, add a short rustic wooden bridgehead or dock projecting slightly onto the lake. On its end, add one small charming white rabbit sitting still, viewed from behind or three-quarter back, gazing across the lake; make it part of the landscape rather than a dominant character. Place one warm glowing lantern on the dock beside the rabbit. Add a luminous but restrained golden moonlight reflection in the lake: a naturally broken vertical path of warm glints aligned at approximately 54% of the image width, stretching from the far shore toward the lower foreground. The light comes from an off-image source to be overlaid later; show only the reflected light on water.
Invariants: preserve Image 1's deep navy starry sky, its dark clean upper center and quiet upper-left heading space, distant mountain silhouettes, calm lake, sparse far-shore lights, delicate blossoms at outer corners, overall painterly realism and original 16:9 composition. Keep the rabbit and lantern low and left so they do not clash with website copy. Keep the center sky completely clean.
Critical exclusions: absolutely no moon, crescent, planet, circular glow, orb, halo, or other bright light source anywhere in the sky. No sky beam. No text, UI, device frames, people, food, mooncakes, logos, or watermark.
```

### 竖屏背景完整提示词

```text
Use case: stylized-concept
Asset type: distinct portrait-responsive 3:4 website background raster, composed natively for a portrait canvas, not a crop or stretch of a landscape.
Reference role: use the supplied Mid-Autumn lake image as style and content inspiration only: cinematic painterly realism, deep navy night palette, sparse stars, layered dark mountains, calm water, delicate flowering branches, small rabbit and lantern on a rustic dock, restrained amber reflections. Recompose all elements for portrait.
Scene: tranquil Mid-Autumn night lake beneath a broad dark starry navy sky. Layered distant mountain silhouettes meet the lake at around 65% of total canvas height. Water fills the lower third, with sparse tiny warm shoreline lights.
Composition: leave the upper center clear, dark, and spacious for a live 3D moon overlaid later. Keep the upper-left sky quiet and dark for a heading. In the lower-left foreground, place a short wooden bridgehead/dock carrying one small charming white rabbit seen from behind or three-quarter back and one glowing warm lantern. Position the rabbit and lantern around 30% of canvas width, well inside the sides so they remain visible in a narrower phone center crop. Place a naturally broken, luminous yet restrained golden moonlight reflection on the water near 55% of canvas width, extending from the far shore toward the foreground. Delicate blossoms appear only at the extreme upper corners; keep them peripheral.
Lighting and palette: deep midnight indigo and navy, muted blue mountains, a very small amount of warm golden light. Natural atmospheric depth. The water reflection is from the future overlaid moon, with no visible source in this image.
Critical constraints: no moon, crescent, orb, planet, circular glow, halo, or bright light source in the sky; no sky beam. No text, typography, UI, device frames, humans, hands, food, mooncakes, logos, or watermark. No dominant architecture. Preserve a clean center sky and a usable dark upper-left copy area.
Output: one complete 3:4 portrait scene.
```

## 月亮贴图

- 文件：`public/textures/moon/albedo.jpg`
- 尺寸：2048×1024，JPEG
- 作者/来源：Solar System Scope / INOVE
- 来源页：https://www.solarsystemscope.com/textures/
- 原始下载：https://www.solarsystemscope.com/textures/download/2k_moon.jpg
- 许可：Creative Commons Attribution 4.0 International，https://creativecommons.org/licenses/by/4.0/
- 下载日期：2026-09-25
- 原文件未编辑。运行时用于 albedo 和低强度 bump 近似。未声称 bump 是真实地形数据。
- 页面 How to play 内也保留可见署名与许可链接。

## 月饼透明素材

- 文件：`public/images/mooncake.png`
- 工具：Codex 内置 `image_gen`，没有切换 CLI 或其他 API。
- 实际输出：1254×1254，RGBA PNG。
- 背景抠取：生成时直接要求真实透明背景，保留原始 alpha；不是白底或棋盘格背景。
- 透明通道检查：存在 alpha，最小值 0，最大值 255。
- 已检查素材内容：完整金黄月饼、花纹与清晰 MOON 浮雕、无盘子或外部背景。
- 原始输出保留在 Codex generated_images，项目内包含独立副本，不依赖工作区外路径。

### 月饼完整生成提示词

```text
Use case: product-mockup. Asset type: transparent PNG game sprite for a Mid-Autumn Moon to Mooncake interactive website. Generate a single whole golden-brown Cantonese mooncake, sumptuous photoreal studio product photography, scalloped circular perimeter, finely embossed concentric floral lunar pattern and perfectly readable embossed uppercase text 'MOON' in center. Slight overhead three-quarter view (camera 65 degrees above horizontal) so top is near circular and front fluted pastry wall visible. Honey-gold toasted baked pastry with tiny pores, handcrafted but premium. Soft upper-left illumination, no strong white specular highlight. Centered complete object fills 84% canvas, square 1024x1024 image. Isolated on a GENUINELY TRANSPARENT alpha background, clean cutout, no plate, no table, no props, no cast shadow outside object, no checkerboard baked into pixels, no surrounding text, no watermark. This cutout will be used directly as a sprite over deep midnight background.
```

## 首屏参考完整生成提示词

```text
Use case: ui-mockup. Create ONE wide 1536x1024 desktop website reference for a minimalist interactive Mid-Autumn toy named Grab the Moon. Single screen, NOT a marketing landing page, no navigation no cards. Deep blue-black #080c13 background with extremely sparse stars. Top-left at 60px margins a small restrained label MID-AUTUMN EXPERIMENT. Just below, a two-line uppercase clean grotesk heading 'THE MOON IS TOO FAR.' and 'SO I MADE ONE.' in warm off-white, roughly 42px, restrained not gigantic. Main focal point a huge beautifully realistic silvery full moon 520px diameter floating centered, slightly right of center, no hard glow. Bottom center below moon small warm white text 'GRAB THE MOON', beneath smaller muted 'drag, pinch, or hold a little longer'. Bottom-left small Chinese '今晚的月亮，可以吃。'. Quiet generous negative space, museum-like cinematic real lunar surface. No mockup device frame. This is a UI reference not the actual asset.
```

该参考图中的月亮是生成图；网页实际使用上文署名的非 AI 月面贴图。页面视觉验收由用户完成，未执行浏览器自动化。

## 可旋转月饼模型（后续更新）

- 模型：`public/models/mooncake.glb`，由 `scripts/build_mooncake.py` 在 Blender 5.2 中生成。
- 顶部纹理：模型直接使用 `public/images/mooncake.png` 中已有的 `NoBug` 图案。UV 只取图片中的顶部区域，排除图片里拍到的侧壁。
- 早期无字顶部纹理草稿已清理，生成提示词仍记录于下文。
- 侧面纹理：沿用项目已有 `public/textures/mooncake/side.jpg`。
- 底面纹理：`public/textures/mooncake/bottom-baked.png`，通过 Codex 内置 `image_gen` 生成，参考侧壁的烘烤色调。底面去掉了原先的两道实体圆环；旧草稿已清理。
- 中心 `NoBug` 由原图本身呈现，不再叠加独立的 3D 字体网格。
- WebGL 静态回退仍使用 `public/images/mooncake.png` 中的 NoBug 透明图。

### 顶部无字纹理完整生成提示词

```text
Use case: precise-object-edit. Input image 1 is the edit target: top-down golden Cantonese mooncake texture with concentric ornate pastry relief and central word MOON. Create an orthographic, directly overhead square texture for the TOP FACE of a real 3D mooncake model. Keep the original baked golden-brown colors, crisp floral/scroll patterns, concentric ornamental rings, fine pastry pores and physical raised pastry relief. Change only the center medallion: REMOVE the word MOON entirely and replace that area with a clean, gently textured flat baked-pastry field large enough for a separate real 3D 'NoBug' mesh to sit on top. Do not render any letters or words at all. Reframe the mooncake pastry so the ornamented top surface fills the entire square image edge-to-edge, with NO white background and NO plate/table. True top-down view, no perspective, no visible vertical sidewall. Symmetric circular alignment; preserve relief dimensionality and natural studio lighting. No text, no watermark.
```

### 底面烘烤纹理完整生成提示词

```text
Use case: product-mockup. Asset type: square albedo texture for the UNDERSIDE face of a realistic 3D Cantonese mooncake. Input image 1 is a color-and-material reference ONLY: its baked amber pastry hue and tiny pores should match the side texture. Generate a NEW directly overhead, orthographic, full-bleed pastry underside surface that fills the square image edge to edge. A natural baked bottom: warm honey-ochre dough, uneven caramelized patches and toasted freckles, fine porous crumb, tiny hand-made imperfections, subtle off-center concentric baking marks pressed into the pastry, and a few faint flour traces. Rich material variation across the whole face, visibly darker toasted patches near the perimeter but not a uniform border. Realistic food photography texture with diffuse even light, no cast shadow, no specular glare. This must work as a UV texture on a circular 3D mesh: no circular product cutout, no white or gray background, no plate, no external scene, no words, no letters, no logo, no decorative floral pattern, no perfect computer-drawn rings, no watermark.
```
