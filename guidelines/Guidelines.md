# SOFT MATTER Design System

SOFT MATTER는 보이지 않는 압력을 부드러운 디지털 물성으로 번역하는 인터랙티브 전시형 인터페이스입니다. 이 문서는 `src/App.tsx`와 `src/index.css`에 구현된 규칙을 기준으로 합니다.

## Design Principles

1. **Pressure becomes form.** 수치보다 물체의 변형이 압력의 첫 번째 표현이어야 합니다.
2. **Material, not dashboard.** 카드 중심의 관리 화면 대신 넓은 여백과 단일 오브제를 중심으로 구성합니다.
3. **Quiet precision.** 정보는 작고 정교하게 배치하며, 데이터 시각화가 오브제와 경쟁하지 않게 합니다.
4. **Source honesty.** 실제 센서 데이터와 Preview 입력을 색, 라벨, 선 스타일로 명확히 분리합니다.
5. **Responsive tactility.** 입력은 즉시 반응하되 스프링 보간으로 탄성과 관성을 느낄 수 있어야 합니다.

## Color Tokens

모든 색상은 `src/index.css`의 CSS 변수로 정의하고 구현에서 재사용합니다.

| Token | Value | Role |
| --- | --- | --- |
| `--canvas` | `#F4F7F9` | 오프화이트 쿨그레이 배경 |
| `--surface` | `#FBFCFD` | 정보 영역 배경 |
| `--surface-strong` | `#FFFFFF` | 고대비 표면 |
| `--ink` | `#10233C` | 기본 딥 네이비 텍스트 |
| `--ink-soft` | `#52657A` | 설명 및 보조 정보 |
| `--ink-faint` | `#8C9BAA` | 캡션, 축, eyebrow |
| `--line` | `#DCE5EB` | 기본 구분선 |
| `--blue` | `#729FEA` | 인터랙션 및 그래프 |
| `--blue-soft` | `#D9E9FB` | 소프트 블루 보조색 |
| `--blue-pale` | `#EDF5FD` | 페일 블루 표면 |
| `--navy` | `#102F56` | 포커스, 슬라이더 핸들 |
| `--preview` | `#9A6A21` | Preview Mode 상태 |
| `--live` | `#24755A` | 실제 센서 연결 상태 |
| `--error` | `#A43F3F` | 센서 및 데이터 연결 오류 |
| `--matter-*` | 다중 블루 토큰 | 젤 오브제의 하이라이트와 음영 |

## Typography

- 기본 서체: `Inter, Pretendard, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
- Brand: 13–14px, Bold, `0.15em` 자간
- Hero headline: 38–77px, Medium, `-0.06em` 자간, 0.96 행간
- Pressure readout: 46–77px, Regular/Medium, `-0.075em` 자간
- Section heading: 24–38px, Medium
- Body: 12–13px, 1.6 행간
- Eyebrow/caption: 9–11px, Bold, uppercase, 넓은 자간

정보 계층은 크기뿐 아니라 자간, 색 농도, 위치를 함께 사용해 만듭니다.

## Spacing & Grid

- 페이지 수평 여백은 `--space-page: clamp(20px, 4vw, 72px)`을 사용합니다.
- 데스크톱 hero는 `intro / object / controls`의 3열 구조입니다.
- 메인 오브제는 전체 hero 중앙축에 놓고 주변 정보와 충분한 간격을 둡니다.
- 정보 섹션은 그래프와 통계가 약 `1.8 : 0.7` 비율을 갖습니다.
- 주요 섹션 사이에는 64–88px의 넓은 호흡을 사용합니다.
- 관련 정보 내부 간격은 8–24px 범위에서 사용합니다.

## Shape & Material

- 메인 오브제는 SVG cubic Bézier 경로로 구성합니다.
- 압력이 증가하면 높이는 감소하고 너비는 증가해야 하며, 45% 이후에는 측면과 표면 곡률 변형이 추가됩니다.
- 오브제는 4단계 그라디언트, 방사형 하이라이트, 미세한 외곽선, 확산 그림자로 반투명 실리콘 질감을 표현합니다.
- 단순한 원형 scale만으로 압력 변형을 구현하지 않습니다.
- UI 모서리는 작은 요소에만 사용하며, 불필요한 카드 컨테이너는 만들지 않습니다.

## Motion

- 센서값 또는 Preview 값을 0–1로 정규화한 후 프레임 단위 스프링 보간을 적용합니다.
- 현재 구현의 스프링은 target displacement, velocity, damping을 누적해 급격한 입력에도 연속성을 유지합니다.
- 압력이 줄어들면 현재 속도를 유지한 채 원래 구형으로 복원됩니다.
- 오브제 후광은 약 5.5초 주기로 매우 약하게 호흡합니다.
- `prefers-reduced-motion: reduce`에서는 스프링을 즉시 반영하고 반복 애니메이션을 중지합니다.
- 장식 모션은 메인 압력 반응보다 강하거나 빠르면 안 됩니다.

## Components

### Material Object

- 화면의 가장 높은 시각적 위계를 갖습니다.
- 압력 0%에서 구형, 100%에서 넓고 압축된 형태가 됩니다.
- 표면 선은 높은 압력 단계에서만 서서히 나타납니다.

### Preview Control

- 실제 센서 데이터가 없을 때만 표시합니다.
- 0–100% 범위 슬라이더, 현재 비율, Rest/Compressed 끝점 레이블을 포함합니다.
- Preview 데이터는 실제 ADC 값으로 환산하지 않습니다.

### Connection Status

- 실제 연결은 green, Preview는 amber를 사용합니다.
- 상태 색만 사용하지 않고 텍스트와 원형 마커를 함께 제공합니다.
- Web Serial 연결 버튼은 보조 위계로 제공하고 Supabase Realtime 상태를 함께 표시합니다.
- 유효한 센서 데이터가 수신되기 전에는 Preview 상태와 실제 ADC 값을 혼동하지 않습니다.

### Graph & Metrics

- 실제 데이터는 실선, Preview 세션은 점선입니다.
- Preview 통계 단위는 `%`, 실제 센서 통계 단위는 `ADC`입니다.
- 그래프와 통계는 메인 오브제보다 낮은 대비와 크기를 사용합니다.

### Stage Scale

- `Rest / Soft / Pressed / Compressed` 네 단계로 구성합니다.
- 활성 단계는 blue line, filled marker, navy text로 표시합니다.

## Interaction States

| State | Object input | Status | ADC display | Graph |
| --- | --- | --- | --- | --- |
| Sensor connected | FSR402 normalized value | Green / Connected | 실제 수신값 | 실선 |
| Serial waiting | No valid reading yet | Neutral / Waiting | `ADC —` | Preview 점선 |
| Preview Mode | Slider value | Amber / Preview mode | `ADC —` | 점선 |
| Rest | 0–11% | Rest | 소스에 따름 | 소스에 따름 |
| Soft | 12–44% | Soft | 소스에 따름 | 소스에 따름 |
| Pressed | 45–77% | Pressed | 소스에 따름 | 소스에 따름 |
| Compressed | 78–100% | Compressed | 소스에 따름 | 소스에 따름 |

## Responsive Rules

- 960px 초과: 3열 hero, 중앙 대형 오브제, 우측 컨트롤
- 681–960px: 단일 열 hero, 오브제 아래 설명과 컨트롤을 2열 배치
- 680px 이하: 모든 콘텐츠를 단일 열로 배치하고 오브제를 화면 폭에 맞게 확장
- 모바일에서는 헤더의 마지막 수신 텍스트를 숨기되 상태 마커는 유지합니다.
- 데이터 그래프와 통계, 센서 상태와 단계 표시를 각각 세로로 쌓습니다.
- 슬라이더는 모바일에서도 전체 사용 가능 너비를 확보합니다.

## Do / Don't

### Do

- 오브제가 화면의 시각적 중심이 되게 합니다.
- 실제/Preview 소스를 모든 데이터 영역에서 일관되게 구분합니다.
- 압력을 너비, 높이, 표면 곡률의 복합 변화로 표현합니다.
- 장식보다 물성, 여백, 타이포그래피의 정밀도를 우선합니다.
- 키보드 포커스와 reduced motion 환경을 지원합니다.

### Don't

- Preview 값을 실제 ADC 측정값처럼 표시하지 않습니다.
- 센서 데이터가 없을 때 Connected 또는 Live로 표시하지 않습니다.
- 오브제를 단순 확대/축소하거나 장난감처럼 과도하게 튕기지 않습니다.
- 메인 경험을 방해하는 카드, 버튼, 배지, 장식 요소를 추가하지 않습니다.
- 그래프나 수치가 오브제보다 높은 대비와 크기를 갖게 하지 않습니다.
