# Grab the Moon

一个可以拖、捏、压，最后变成月饼的中秋互动小作品。独立项目，不修改上层需求文档或其他示例。

## 本地运行

需要 Node.js 20.9+，建议 Node.js 22。

```sh
cd grab-the-moon
npm install
npm run dev
```

打开 http://localhost:3000。开发服务器绑定 `0.0.0.0`，同一局域网手机可使用电脑的局域网 IP 与端口访问。若 3000 被占用，使用终端打印的实际端口。

```sh
npm run typecheck
npm run build
```

`npm run build` 输出纯静态站点到 `out/`。Vercel 可选择本目录作为项目根目录，或将 `out/` 交给静态托管服务。未实际部署。素材 URL 使用根路径，默认部署在域名根目录，不支持直接双击 HTML 或不加配置地部署到子路径。

## 玩法

- 拖动：按住月亮拉伸，松手弹性回弹。
- 捏合：双指距离缩小至开始时的 58% 以下，触发月饼转换。
- 旋转：双指转动调整月亮方向。
- 长按：700ms 开始蓄力，3s 转换；移动超过 10px 取消长按。
- 点击：5 次短点击转换，拖拽、双指操作和取消事件不计入点击。
- 下甩：单指或鼠标快速向下移动，位移超过 65px 且速度超过 1.25px/ms 时转换。
- 滚轮：向上压缩，向下膨胀；压缩达到阈值时转换。
- 月饼阶段滚轮：向上滚放大，向下滚缩小，缩放范围为初始大小的 65% 至 175%。
- 键盘：Tab 聚焦月亮，Enter / Space 转换。
- 转换后：拖动月饼可连续旋转，查看顶部、花边侧壁和背面；松手后有轻微惯性。键盘方向键也可旋转。
- 完成后选择 `One more moon` 重玩。

提示在加载完成 3s 后或开始交互后淡出，`How to play` 可重新查看说明。`touch-action: none` 仅用于月亮区域，不锁整个页面。

## 技术与范围调整

- Next.js 16 App Router + React + TypeScript + Three.js / React Three Fiber；提交的 lockfile 固定本次安装结果。
- 月亮采用 96×64 球面几何体和 2048×1024 实际月面贴图。
- 为控制 MVP 素材体积，使用同一贴图做低强度 bump 近似，不声称它是科学准确的高度图；没有伪造独立 normal / displacement 文件。
- 月饼使用 Blender 脚本生成的 GLB 模型，具有花边侧壁和烘烤纹理底面，可从各个方向观察。顶部直接映射现有的 `NoBug` 透明月饼图，不另加实体文字；同一图片也用于 WebGL 回退。Mac 上运行 `/Applications/Blender.app/Contents/MacOS/Blender --factory-startup -b --python scripts/build_mooncake.py` 可重新导出模型。
- 1.25s 转换通过压缩、交叉淡化、回弹、64 个粒子和 250ms 轻微相机震动完成。
- 逐帧动画使用 R3F `useFrame`，UI 使用 CSS。此规模不额外引入 GSAP、Drei 或 Zustand。
- 连续输入保存在 ref，不在每次 PointerMove 中触发 React 渲染；DPR 上限 1.8。
- 支持减少动态效果偏好、加载提示、WebGL2 不可用 / 上下文丢失 / 场景加载错误的静态月饼回退。
- 暂不做音效、月兔、随机馅料、分享截图、后端、账号或排行榜。

## 文件结构

```text
src/app/                       页面、元数据、样式
src/components/MoonExperience  UI、场景错误边界、可访问操作
src/components/MoonScene       月亮、月饼、粒子、转换动画
src/hooks/useMoonInteraction   Pointer Events、双指、长按与状态机
src/lib/interaction            交互类型、数学、弹簧计算
public/images/mooncake.png     透明月饼素材
public/images/mid-autumn-night-v2.png  含兔子、桥头与月光的桌面背景
public/images/mid-autumn-night-portrait.png  竖屏背景
public/models/mooncake.glb      可旋转的真实月饼模型
public/textures/mooncake/bottom-baked.png  月饼底面烘烤纹理
public/textures/moon/albedo.jpg 真实月面经纬贴图
scripts/build_mooncake.py       Blender 建模与导出脚本
design/first-screen.png        生成的首屏设计参考，不作为网页背景
design/ASSETS.md               素材来源、完整生成提示词与设计记录
```

## 验证边界

已运行 TypeScript 检查与生产静态构建，并检查 PNG 的实际透明通道。还检查了角度跨界、弹簧收敛、状态锁定和独立初始状态。升级 Next.js 16.3.6 后 npm 安全审计报告 0 个漏洞。未使用浏览器自动化，未进行页面截图或视觉验收，也未测量手机真实帧率。

请人工验收桌面拖拽、手机双指操作、下甩阈值、转换节奏、窄屏布局、触摸区域外的正常页面行为，以及多轮重玩。加载失败可使用浏览器开发工具屏蔽贴图请求验证回退。

素材署名请保留，详见 `design/ASSETS.md`。
