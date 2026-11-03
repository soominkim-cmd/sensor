import { createClient } from "@supabase/supabase-js"
import { useEffect, useRef, useState } from "react"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

interface Measurement {
  time: string
  value: number
  timestamp: number
}

interface SerialPortLike {
  readable: ReadableStream<Uint8Array> | null
  open(options: { baudRate: number }): Promise<void>
  close(): Promise<void>
}

interface SerialApi {
  requestPort(): Promise<SerialPortLike>
}

const pressureData = [
  { time: "10:00", value: 312 },
  { time: "10:05", value: 346 },
  { time: "10:10", value: 331 },
  { time: "10:15", value: 388 },
  { time: "10:20", value: 402 },
  { time: "10:25", value: 435 },
  { time: "10:30", value: 412 },
  { time: "10:35", value: 468 },
  { time: "10:40", value: 452 },
  { time: "10:45", value: 497 },
  { time: "10:50", value: 521 },
  { time: "10:55", value: 486 },
  { time: "11:00", value: 512 },
]

function SensorIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5">
      <path
        d="M8 3.75h8M9.5 3.75v4.5m5-4.5v4.5M7.25 8.25h9.5v8.5h-9.5zM9 16.75v3.5m6-3.5v3.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <circle cx="12" cy="12.5" r="1.5" fill="currentColor" />
    </svg>
  )
}

function TrendIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
      <path
        d="m4 15.5 4.2-4.2 3.2 3.2L18.5 7.5M14.5 7.5h4v4"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function Chart({ data }: { data: Measurement[] }) {
  const width = 1000
  const height = 300
  const max = 1023
  const xDenominator = Math.max(data.length - 1, 1)
  const labelInterval = Math.max(1, Math.ceil(data.length / 5))
  const points = data
    .map((item, index) => {
      const x = (index / xDenominator) * width
      const y = height - (item.value / max) * height
      return `${x},${y}`
    })
    .join(" ")

  return (
    <div className="mt-7">
      <div className="flex h-[300px] sm:h-[340px]">
        <div className="mr-4 flex w-9 shrink-0 flex-col justify-between pb-7 text-right text-[11px] font-medium text-slate-400 sm:mr-5">
          <span>1023</span>
          <span>768</span>
          <span>512</span>
          <span>256</span>
          <span>0</span>
        </div>
        <div className="relative min-w-0 flex-1 pb-7">
          <div className="absolute inset-x-0 top-0 bottom-7 flex flex-col justify-between">
            {[0, 1, 2, 3, 4].map((line) => (
              <div
                key={line}
                className="border-t border-dashed border-slate-200"
              />
            ))}
          </div>

          <svg
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="none"
            className="absolute inset-x-0 top-0 h-[calc(100%-1.75rem)] w-full overflow-visible"
            role="img"
            aria-label="최근 압력 센서 측정값 변화 추이"
          >
            <defs>
              <linearGradient id="chartArea" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#4f7cff" stopOpacity=".22" />
                <stop offset="100%" stopColor="#4f7cff" stopOpacity="0" />
              </linearGradient>
            </defs>
            <polygon
              points={`0,${height} ${points} ${width},${height}`}
              fill="url(#chartArea)"
            />
            <polyline
              points={points}
              fill="none"
              stroke="#4f7cff"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="5"
              vectorEffect="non-scaling-stroke"
            />
            {data.map((item, index) => {
              const x = (index / xDenominator) * width
              const y = height - (item.value / max) * height
              const isCurrent = index === data.length - 1

              return isCurrent ? (
                <g key={`${item.time}-${index}`}>
                  <circle cx={x} cy={y} r="15" fill="#4f7cff" opacity=".14" />
                  <circle
                    cx={x}
                    cy={y}
                    r="7"
                    fill="white"
                    stroke="#4f7cff"
                    strokeWidth="4"
                  />
                </g>
              ) : null
            })}
          </svg>

          <div className="absolute inset-x-0 bottom-0 flex justify-between text-[11px] font-medium text-slate-400">
            {data
              .filter((_, index) => index % labelInterval === 0 || index === data.length - 1)
              .map((item, index) => (
                <span key={`${item.time}-${index}`}>{item.time}</span>
              ))}
          </div>
        </div>
      </div>
      <div className="ml-14 mt-3 flex items-center gap-5 border-t border-slate-100 pt-4 text-xs text-slate-500 sm:ml-[3.75rem]">
        <span className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-[#4f7cff]" />
          압력값
        </span>
        <span className="text-slate-400">단위: ADC</span>
      </div>
    </div>
  )
}

export default function App() {
  const [serialMeasurements, setSerialMeasurements] = useState<Measurement[]>([])
  const [supabaseMeasurements, setSupabaseMeasurements] = useState<Measurement[]>([])
  const [supabaseStatus, setSupabaseStatus] = useState("연결 중")
  const [supabaseError, setSupabaseError] = useState("")
  const [connected, setConnected] = useState(false)
  const [serialError, setSerialError] = useState("")
  const portRef = useRef<SerialPortLike | null>(null)
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null)
  const readTaskRef = useRef<Promise<void> | null>(null)
  const disconnectRequestedRef = useRef(false)

  useEffect(() => {
    if (!supabase) {
      setSupabaseStatus("설정 필요")
      setSupabaseError(".env에 Supabase URL과 anon key를 설정한 뒤 개발 서버를 다시 시작해 주세요.")
      return
    }

    let active = true
    setSupabaseStatus("연결 중")
    setSupabaseError("")

    async function loadRecentReadings() {
      const { data, error } = await supabase!
        .from("readings")
        .select("value, created_at")
        .order("created_at", { ascending: false })
        .limit(100)

      if (!active) return
      if (error) {
        setSupabaseError(error.message)
        return
      }

      const readings = (data ?? [])
        .map((row) => {
          const timestamp = Date.parse(row.created_at)
          const value = Number(row.value)
          return Number.isFinite(timestamp) && Number.isFinite(value) && value >= 0 && value <= 1023
            ? { time: new Date(timestamp).toLocaleTimeString(), value, timestamp }
            : null
        })
        .filter((reading): reading is Measurement => reading !== null)
        .reverse()
      setSupabaseMeasurements(readings)
    }

    void loadRecentReadings()

    const channel = supabase
      .channel("readings-insert-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "readings" },
        (payload) => {
          const row = payload.new as { value?: unknown; created_at?: unknown }
          const value = Number(row.value)
          const timestamp = typeof row.created_at === "string"
            ? Date.parse(row.created_at)
            : Date.now()
          if (!Number.isFinite(value) || value < 0 || value > 1023 || !Number.isFinite(timestamp)) return

          setSupabaseMeasurements((current) => [
            ...current,
            { time: new Date(timestamp).toLocaleTimeString(), value, timestamp },
          ].sort((a, b) => a.timestamp - b.timestamp).slice(-100))
        },
      )
      .subscribe((status, error) => {
        if (!active) return
        if (status === "SUBSCRIBED") {
          setSupabaseStatus("연결됨")
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setSupabaseStatus("오류")
          setSupabaseError(error?.message ?? "Realtime 채널에 연결하지 못했습니다.")
        } else if (status === "CLOSED") {
          setSupabaseStatus("연결 끊김")
        }
      })

    return () => {
      active = false
      void supabase.removeChannel(channel)
    }
  }, [])

  const activeMeasurements = connected && serialMeasurements.length > 0
    ? serialMeasurements
    : supabaseMeasurements
  const displayData = activeMeasurements.length > 0 ? activeMeasurements : pressureData.map((item, index) => ({
    ...item,
    timestamp: index,
  }))
  const currentValue = activeMeasurements.at(-1)?.value ?? 512
  const previousValue = activeMeasurements.at(-2)?.value
  const trend = previousValue
    ? ((currentValue - previousValue) / previousValue) * 100
    : 5.3
  const liveStats = activeMeasurements.length > 0
    ? {
        min: Math.min(...activeMeasurements.map((item) => item.value)),
        average: Math.round(
          activeMeasurements.reduce((total, item) => total + item.value, 0) / activeMeasurements.length,
        ),
        max: Math.max(...activeMeasurements.map((item) => item.value)),
      }
    : { min: 312, average: 428, max: 521 }

  async function readSerialData(
    port: SerialPortLike,
    reader: ReadableStreamDefaultReader<Uint8Array>,
  ) {
    const decoder = new TextDecoder()
    let buffer = ""

    try {
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        if (!value) continue

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split(/\r?\n/)
        buffer = lines.pop() ?? ""

        for (const line of lines) {
          const trimmed = line.trim()
          if (!/^\d+$/.test(trimmed)) continue

          const value = Number(trimmed)
          if (value < 0 || value > 1023) continue

          setSerialMeasurements((current) => [
            ...current,
            { time: new Date().toLocaleTimeString(), value, timestamp: Date.now() },
          ].slice(-100))
        }
      }
    } catch (error) {
      if (!disconnectRequestedRef.current) {
        setSerialError(error instanceof Error ? error.message : "센서 데이터를 읽지 못했습니다.")
      }
    } finally {
      reader.releaseLock()
      if (readerRef.current === reader) readerRef.current = null
      if (portRef.current === port) {
        portRef.current = null
        try {
          await port.close()
        } catch {
          // The port may already have been closed by the browser.
        }
        setConnected(false)
      }
    }
  }

  async function connectSerial() {
    const serial = (navigator as Navigator & { serial?: SerialApi }).serial
    if (!serial) {
      setSerialError("Web Serial을 지원하는 Chrome에서 localhost 또는 HTTPS로 접속해 주세요.")
      return
    }

    setSerialError("")
    disconnectRequestedRef.current = false

    try {
      const port = await serial.requestPort()
      portRef.current = port
      await port.open({ baudRate: 115200 })
      if (!port.readable) throw new Error("시리얼 포트를 읽을 수 없습니다.")

      const reader = port.readable.getReader()
      readerRef.current = reader
      setConnected(true)
      readTaskRef.current = readSerialData(port, reader)
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "NotFoundError")) {
        setSerialError(error instanceof Error ? error.message : "시리얼 포트에 연결하지 못했습니다.")
      }
      const port = portRef.current
      portRef.current = null
      if (port) {
        try {
          await port.close()
        } catch {
          // The port may not have opened successfully.
        }
      }
      setConnected(false)
    }
  }

  async function disconnectSerial() {
    disconnectRequestedRef.current = true
    const reader = readerRef.current
    const port = portRef.current

    if (reader) {
      try {
        await reader.cancel()
      } catch {
        // The reader may already be closed.
      }
    }

    if (readTaskRef.current) {
      await readTaskRef.current
      readTaskRef.current = null
    } else if (port) {
      portRef.current = null
      try {
        await port.close()
      } catch {
        // The port may already be closed.
      }
      setConnected(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <header className="border-b border-slate-200/80 bg-white/90">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-4 sm:px-8 lg:px-12">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-[#315edd] text-white shadow-sm shadow-blue-200">
              <SensorIcon />
            </div>
            <div>
              <p className="text-[15px] font-bold tracking-tight">
                Sensor Monitor
              </p>
              <p className="text-[11px] font-medium text-slate-400">
                FSR402 DASHBOARD
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <div className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${supabaseStatus === "연결됨" ? "border-emerald-100 bg-emerald-50 text-emerald-700" : supabaseStatus === "오류" || supabaseStatus === "설정 필요" ? "border-rose-100 bg-rose-50 text-rose-700" : "border-slate-200 bg-slate-100 text-slate-500"}`}>
              <span className={`inline-flex size-2 rounded-full ${supabaseStatus === "연결됨" ? "bg-emerald-500" : supabaseStatus === "오류" || supabaseStatus === "설정 필요" ? "bg-rose-500" : "bg-slate-400"}`} />
              Supabase {supabaseStatus}
            </div>
            <div className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${connected ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-500"}`}>
              <span className={`inline-flex size-2 rounded-full ${connected ? "bg-emerald-500" : "bg-slate-400"}`} />
              Serial {connected ? "연결됨" : "연결 안 됨"}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-12">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[#4f7cff]">
              Overview
            </p>
            <h1 className="text-2xl font-bold tracking-[-0.03em] text-slate-950 sm:text-[32px]">
              압력 센서 모니터링
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              FSR402 센서의 압력 변화를 실시간으로 확인하세요.
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <button
              type="button"
              onClick={connected ? disconnectSerial : connectSerial}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${connected ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50" : "bg-[#315edd] text-white shadow-sm hover:bg-[#284fc5]"}`}
            >
              {connected ? "연결 해제" : "시리얼 연결"}
            </button>
            {serialError && <p role="alert" className="max-w-xs text-right text-xs text-rose-600">{serialError}</p>}
            {supabaseError && <p role="alert" className="max-w-xs text-right text-xs text-rose-600">Supabase: {supabaseError}</p>}
          <p className="flex items-center gap-2 text-xs font-medium text-slate-400">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
              <path
                d="M12 6.5V12l3.5 2M21 12a9 9 0 1 1-9-9 9 9 0 0 1 9 9Z"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="1.8"
              />
            </svg>
            {activeMeasurements.length > 0 ? `마지막 업데이트: ${activeMeasurements.at(-1)?.time}` : "Arduino Uno · 115200 baud"}
          </p>
          </div>
        </div>

        <section className="grid gap-5 lg:grid-cols-[minmax(290px,0.72fr)_minmax(0,2fr)]">
          <article className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#315edd] via-[#416de9] to-[#7193f4] p-7 text-white shadow-[0_18px_45px_rgba(49,94,221,0.2)] sm:p-8">
            <div className="absolute -right-16 -top-16 size-52 rounded-full border-[34px] border-white/5" />
            <div className="relative flex h-full min-h-[308px] flex-col">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-blue-100">
                  현재 압력값
                </span>
                <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold backdrop-blur-sm">
                  LIVE
                </span>
              </div>

              <div className="my-auto py-8">
                <div className="flex items-end gap-2">
                  <strong className="text-[68px] font-semibold leading-none tracking-[-0.07em] sm:text-[76px]">
                    {currentValue}
                  </strong>
                  <span className="mb-2.5 text-lg font-medium text-blue-100">
                    ADC
                  </span>
                </div>
                <div className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-slate-950/10 px-2.5 py-1.5 text-xs font-semibold text-white">
                  <TrendIcon />
                  <span>{trend >= 0 ? "+" : ""}{trend.toFixed(1)}%</span>
                  <span className="font-normal text-blue-100">
                    이전 측정 대비
                  </span>
                </div>
              </div>

              <div className="border-t border-white/15 pt-5">
                <div className="mb-2 flex justify-between text-[11px] font-medium text-blue-100">
                  <span>LOW</span>
                  <span>현재 강도 {Math.round((currentValue / 1023) * 100)}%</span>
                  <span>HIGH</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-950/15">
                  <div className="h-full rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.5)]" style={{ width: `${(currentValue / 1023) * 100}%` }} />
                </div>
              </div>
            </div>
          </article>

          <article className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_12px_40px_rgba(32,51,92,0.06)] sm:p-8">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-slate-900">
                  압력 변화 추이
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  최근 {activeMeasurements.length > 0 ? `${activeMeasurements.length}회 측정값` : "측정 샘플"}
                </p>
              </div>
              <div className="flex w-fit items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-500">
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="size-3.5"
                >
                  <path
                    d="M12 6.5V12l3.5 2M21 12a9 9 0 1 1-9-9 9 9 0 0 1 9 9Z"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeWidth="1.8"
                  />
                </svg>
                최근 100회
              </div>
            </div>
            <Chart data={displayData} />
          </article>
        </section>

        <section className="mt-5 grid gap-4 sm:grid-cols-3">
          {[
            {
              label: "최솟값",
              value: String(liveStats.min),
              unit: "ADC",
              color: "bg-cyan-400",
            },
            {
              label: "평균값",
              value: String(liveStats.average),
              unit: "ADC",
              color: "bg-violet-400",
            },
            {
              label: "최댓값",
              value: String(liveStats.max),
              unit: "ADC",
              color: "bg-amber-400",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white px-5 py-4 shadow-[0_8px_25px_rgba(32,51,92,0.04)]"
            >
              <div className="flex items-center gap-3">
                <span className={`size-2.5 rounded-full ${item.color}`} />
                <span className="text-sm font-medium text-slate-500">
                  {item.label}
                </span>
              </div>
              <p className="text-lg font-bold tracking-tight">
                {item.value}{" "}
                <span className="text-xs font-medium text-slate-400">
                  {item.unit}
                </span>
              </p>
            </div>
          ))}
        </section>
      </main>
    </div>
  )
}
