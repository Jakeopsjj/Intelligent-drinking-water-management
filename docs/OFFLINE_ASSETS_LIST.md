# 离线素材下载关键词清单

> 用于离线模式打包本地主题资源，无需网络即可显示天气背景。
> 完整覆盖 9 种天气 × 4 时段 = 36 张静态图 + 16 个循环视频。

## 一、命名规则

离线素材放在 `android/app/src/main/assets/weather_theme/offline/` 目录下：

```
offline/
├── clear-dawn.jpg
├── clear-day.jpg
├── clear-dusk.jpg
├── clear-night.jpg
├── cloudy-dawn.jpg
├── cloudy-day.jpg
├── ...
├── thunderstorm-night.jpg
└── (可选视频)
    ├── clear-day.mp4
    ├── rain-night.mp4
    └── ...
```

**命名格式**：`{weatherType}-{period}.{ext}`

- `weatherType` ∈ `clear` | `cloudy` | `overcast` | `fog` | `drizzle` | `rain` | `heavy-rain` | `snow` | `thunderstorm`
- `period` ∈ `dawn` | `day` | `dusk` | `night`
- 静态图用 `.jpg`（体积小，约 200-500KB/张）
- 视频用 `.mp4`（H.264，720p 横版，循环播放，约 2-5MB/个）

## 二、静态图完整清单（36 张）

| 文件名 | Pexels 搜索关键词（英文） | 中文描述 |
|--------|---------------------------|----------|
| clear-dawn.jpg | `sunrise mountain landscape` | 日出 山景 |
| clear-day.jpg | `clear blue sky landscape` | 晴天 蓝天 风景 |
| clear-dusk.jpg | `sunset golden hour landscape` | 日落 黄昏 风景 |
| clear-night.jpg | `starry night sky landscape` | 星空 夜景 |
| cloudy-dawn.jpg | `cloudy sunrise landscape` | 多云 日出 |
| cloudy-day.jpg | `partly cloudy sky landscape` | 多云 风景 |
| cloudy-dusk.jpg | `cloudy sunset landscape` | 多云 日落 |
| cloudy-night.jpg | `cloudy night sky landscape` | 多云 夜景 |
| overcast-dawn.jpg | `overcast sky morning landscape` | 阴天 早晨 |
| overcast-day.jpg | `overcast sky landscape` | 阴天 风景 |
| overcast-dusk.jpg | `overcast sunset landscape` | 阴天 黄昏 |
| overcast-night.jpg | `overcast night landscape` | 阴天 夜景 |
| fog-dawn.jpg | `foggy morning forest landscape` | 雾 早晨 森林 |
| fog-day.jpg | `foggy landscape mountains` | 雾 风景 山 |
| fog-dusk.jpg | `foggy sunset landscape` | 雾 黄昏 |
| fog-night.jpg | `foggy night landscape` | 雾 夜景 |
| drizzle-dawn.jpg | `light rain morning landscape` | 小雨 早晨 |
| drizzle-day.jpg | `light rain landscape` | 小雨 风景 |
| drizzle-dusk.jpg | `light rain sunset landscape` | 小雨 日落 |
| drizzle-night.jpg | `light rain night landscape` | 小雨 夜景 |
| rain-dawn.jpg | `rainy morning landscape` | 雨 早晨 |
| rain-day.jpg | `rainy day landscape` | 雨 风景 |
| rain-dusk.jpg | `rainy sunset landscape` | 雨 日落 |
| rain-night.jpg | `rainy night street landscape` | 雨 夜景 |
| heavy-rain-dawn.jpg | `heavy rain storm landscape` | 大雨 暴雨 |
| heavy-rain-day.jpg | `heavy rain storm landscape` | 大雨 暴雨 |
| heavy-rain-dusk.jpg | `heavy rain storm sunset` | 大雨 暴雨 日落 |
| heavy-rain-night.jpg | `heavy rain night storm` | 大雨 夜景 |
| snow-dawn.jpg | `snowy morning landscape` | 雪 早晨 |
| snow-day.jpg | `snowy landscape mountains` | 雪 风景 |
| snow-dusk.jpg | `snowy sunset landscape` | 雪 日落 |
| snow-night.jpg | `snowy night landscape` | 雪 夜景 |
| thunderstorm-dawn.jpg | `thunderstorm lightning landscape` | 雷雨 闪电 |
| thunderstorm-day.jpg | `thunderstorm lightning landscape` | 雷雨 闪电 |
| thunderstorm-dusk.jpg | `thunderstorm sunset lightning` | 雷雨 日落 |
| thunderstorm-night.jpg | `thunderstorm night lightning` | 雷雨 夜景 |

## 三、循环视频清单（16 个，可选）

| 文件名 | Pexels Video 搜索关键词 | 中文描述 |
|--------|------------------------|----------|
| clear-dawn.mp4 | `sunrise time lapse` | 日出 延时 |
| clear-day.mp4 | `blue sky clouds time lapse` | 蓝天 云 延时 |
| clear-dusk.mp4 | `sunset time lapse` | 日落 延时 |
| clear-night.mp4 | `starry night sky time lapse` | 星空 延时 |
| cloudy-day.mp4 | `clouds moving time lapse` | 云 流动 延时 |
| cloudy-night.mp4 | `night clouds time lapse` | 夜晚 云 延时 |
| overcast-day.mp4 | `overcast sky time lapse` | 阴天 延时 |
| fog-day.mp4 | `foggy forest video` | 雾 森林 视频 |
| rain-day.mp4 | `rain falling video` | 下雨 视频 |
| rain-night.mp4 | `rain night window video` | 雨夜 窗户 |
| heavy-rain-day.mp4 | `heavy rain storm video` | 暴雨 视频 |
| snow-day.mp4 | `snow falling video` | 雪 延时 |
| snow-night.mp4 | `snow night video` | 雪夜 视频 |
| thunderstorm-day.mp4 | `thunderstorm lightning video` | 雷雨 闪电 视频 |
| thunderstorm-night.mp4 | `thunderstorm night video` | 雷雨 夜景 |

## 四、批量下载脚本

使用 Pexels API 批量下载（需 Pexels API Key，免费申请：https://www.pexels.com/api/）：

```bash
# 在仓库根目录执行
PEXELS_KEY="你的Pexels_API_Key"
OUT_DIR="android/app/src/main/assets/weather_theme/offline"
mkdir -p "$OUT_DIR"

# 静态图批量下载（36 张）
declare -A KEYWORDS=(
  ["clear-dawn"]="sunrise mountain landscape"
  ["clear-day"]="clear blue sky landscape"
  ["clear-dusk"]="sunset golden hour landscape"
  ["clear-night"]="starry night sky landscape"
  ["cloudy-dawn"]="cloudy sunrise landscape"
  ["cloudy-day"]="partly cloudy sky landscape"
  ["cloudy-dusk"]="cloudy sunset landscape"
  ["cloudy-night"]="cloudy night sky landscape"
  ["overcast-dawn"]="overcast sky morning landscape"
  ["overcast-day"]="overcast sky landscape"
  ["overcast-dusk"]="overcast sunset landscape"
  ["overcast-night"]="overcast night landscape"
  ["fog-dawn"]="foggy morning forest landscape"
  ["fog-day"]="foggy landscape mountains"
  ["fog-dusk"]="foggy sunset landscape"
  ["fog-night"]="foggy night landscape"
  ["drizzle-dawn"]="light rain morning landscape"
  ["drizzle-day"]="light rain landscape"
  ["drizzle-dusk"]="light rain sunset landscape"
  ["drizzle-night"]="light rain night landscape"
  ["rain-dawn"]="rainy morning landscape"
  ["rain-day"]="rainy day landscape"
  ["rain-dusk"]="rainy sunset landscape"
  ["rain-night"]="rainy night street landscape"
  ["heavy-rain-dawn"]="heavy rain storm landscape"
  ["heavy-rain-day"]="heavy rain storm landscape"
  ["heavy-rain-dusk"]="heavy rain storm sunset"
  ["heavy-rain-night"]="heavy rain night storm"
  ["snow-dawn"]="snowy morning landscape"
  ["snow-day"]="snowy landscape mountains"
  ["snow-dusk"]="snowy sunset landscape"
  ["snow-night"]="snowy night landscape"
  ["thunderstorm-dawn"]="thunderstorm lightning landscape"
  ["thunderstorm-day"]="thunderstorm lightning landscape"
  ["thunderstorm-dusk"]="thunderstorm sunset lightning"
  ["thunderstorm-night"]="thunderstorm night lightning"
)

for key in "${!KEYWORDS[@]}"; do
  kw="${KEYWORDS[$key]}"
  echo "下载 $key.jpg ← $kw"
  # Pexels Photo Search API
  url=$(curl -sS -H "Authorization: $PEXELS_KEY" \
    "https://api.pexels.com/v1/search?query=$(python3 -c "import urllib.parse;print(urllib.parse.quote('$kw'))")&orientation=landscape&size=large&per_page=1" \
    | python3 -c "import sys,json;print(json.load(sys.stdin)['photos'][0]['src']['large'])")
  curl -sS -o "$OUT_DIR/$key.jpg" "$url"
  sleep 1  # 避免 API 限流
done

echo "✅ 静态图下载完成，共 $(ls $OUT_DIR/*.jpg | wc -l) 张"
```

## 五、素材规格建议

| 类型 | 分辨率 | 格式 | 体积 | 数量 |
|------|--------|------|------|------|
| 静态图 | 1280×720 横版（手机竖屏 cover 裁切） | JPG (质量 85) | 200-500 KB | 36 张 |
| 视频 | 720p 横版 H.264 | MP4 | 2-5 MB | 16 个 |

**总体积估算**：
- 仅静态图：约 10-18 MB
- 静态图 + 视频：约 40-80 MB

## 六、备用图源（Pexels 不可用时）

1. **Unsplash API**：https://unsplash.com/developers （免费 50 次/小时）
2. **Pixabay API**：https://pixabay.com/api/ （免费，无配额限制）
3. **手动下载**：从 Pexels/Unsplash 网站搜索关键词手动下载
4. **AI 生成**：用 SDXL/Midjourney 按关键词生成主题图
