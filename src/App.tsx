import { createClient } from "@supabase/supabase-js"
import { useEffect, useMemo, useRef, useState } from "react"

type Measurement = {
  value: number
  time: string
  timestamp: number
}

type SerialPortLike = {
  readable: ReadableStream<Uint8Array> | null
  open(options: { baudRate: number }): Promise<void>
  close(): Promise<void>
}

type SerialApi = {
  requestPort(): Promise<SerialPortLike>
}

const SENSOR_MAX = 1023
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null

type MaterialStage = "Rest" | "Soft" | "Pressed" | "Compressed"

function clamp(value: number, min = 0, max = 1) {
  return Math.min(Math.max(value, min), max)
}

function getStage(pressure: number): MaterialStage {
  if (pressure < 0.12) return "Rest"
  if (pressure < 0.45) return "Soft"
  if (pressure < 0.78) return "Pressed"
  return "Compressed"
}

function useSpringValue(target: number) {
  const [value, setValue] = useState(target)
  const current = useRef(target)
  const velocity = useRef(0)
  const frame = useRef<number | null>(null)

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches

    if (reduceMotion) {
      current.current = target
      velocity.current = 0
      setValue(target)
      return
    }

    const animate = () => {
      const displacement = target - current.current
      velocity.current = (velocity.current + displacement * 0.085) * 0.78
      current.current += velocity.current

      if (
        Math.abs(displacement) < 0.0005 &&
        Math.abs(velocity.current) < 0.0005
      ) {
        current.current = target
        velocity.current = 0
        setValue(target)
        frame.current = null
        return
      }

      setValue(current.current)
      frame.current = requestAnimationFrame(animate)
    }

    if (frame.current !== null) cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(animate)

    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current)
    }
  }, [target])

  return clamp(value)
}

function ConnectionMark({ connected }: { connected: boolean }) {
  return (
    <span
      className={`connection-mark ${connected ? "is-connected" : "is-preview"}`}
      aria-hidden="true"
    >
      <span />
    </span>
  )
}

function MaterialObject({ pressure }: { pressure: number }) {
  const p = clamp(pressure)
  const deformation = clamp((p - 0.42) / 0.58)
  const halfWidth = 130 + p * 82
  const halfHeight = 130 - p * 76
  const bottom = 326
  const centerX = 300
  const centerY = bottom - halfHeight
  const top = bottom - halfHeight * 2
  const sideRipple = deformation * 12
  const topDent = deformation * 12

  const shape = [
    `M ${centerX} ${top + topDent}`,
    `C ${centerX + halfWidth * 0.28} ${top - topDent * 0.2}`,
    `${centerX + halfWidth * 0.72} ${top + halfHeight * 0.09 + topDent * 0.35}`,
    `${centerX + halfWidth} ${centerY - halfHeight * 0.08}`,
    `C ${centerX + halfWidth + sideRipple} ${centerY + halfHeight * 0.38}`,
    `${centerX + halfWidth * 0.65} ${bottom - sideRipple * 0.15}`,
    `${centerX} ${bottom}`,
    `C ${centerX - halfWidth * 0.63} ${bottom + sideRipple * 0.08}`,
    `${centerX - halfWidth - sideRipple} ${centerY + halfHeight * 0.36}`,
    `${centerX - halfWidth} ${centerY - halfHeight * 0.06}`,
    `C ${centerX - halfWidth * 0.7} ${top + halfHeight * 0.08 + topDent * 0.45}`,
    `${centerX - halfWidth * 0.27} ${top + topDent * 0.05}`,
    `${centerX} ${top + topDent}`,
    "Z",
  ].join(" ")

  return (
    <div className="material-stage" aria-hidden="true">
      <div
        className="material-aura"
        style={{
          transform: `translate(-50%, -50%) scale(${1 + p * 0.12}, ${1 - p * 0.18})`,
        }}
      />
      <svg
        viewBox="0 0 600 410"
        className="material-object"
        role="presentation"
      >
        <defs>
          <linearGradient
            id="matter-body"
            x1="0.14"
            x2="0.88"
            y1="0.04"
            y2="0.96"
          >
            <stop offset="0%" stopColor="var(--matter-highlight)" />
            <stop offset="38%" stopColor="var(--matter-mid)" />
            <stop offset="78%" stopColor="var(--matter-base)" />
            <stop offset="100%" stopColor="var(--matter-shadow)" />
          </linearGradient>
          <radialGradient id="matter-light" cx="0.32" cy="0.2" r="0.68">
            <stop offset="0%" stopColor="white" stopOpacity="0.86" />
            <stop offset="38%" stopColor="white" stopOpacity="0.22" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="matter-edge" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="white" stopOpacity="0.72" />
            <stop offset="54%" stopColor="white" stopOpacity="0.08" />
            <stop offset="100%" stopColor="var(--navy)" stopOpacity="0.18" />
          </linearGradient>
          <filter
            id="object-shadow"
            x="-40%"
            y="-40%"
            width="180%"
            height="200%"
          >
            <feDropShadow
              dx="0"
              dy={12 - p * 4}
              stdDeviation={15 - p * 5}
              floodColor="var(--shadow-blue)"
              floodOpacity={0.2 + p * 0.1}
            />
          </filter>
          <filter id="soft-blur">
            <feGaussianBlur stdDeviation="7" />
          </filter>
          <clipPath id="matter-clip">
            <path d={shape} />
          </clipPath>
        </defs>

        <ellipse
          cx="300"
          cy="347"
          rx={92 + p * 82}
          ry={12 - p * 3}
          fill="var(--shadow-blue)"
          opacity={0.09 + p * 0.08}
          filter="url(#soft-blur)"
        />

        <path
          d={shape}
          fill="url(#matter-body)"
          stroke="url(#matter-edge)"
          strokeWidth="1.5"
          filter="url(#object-shadow)"
        />

        <g clipPath="url(#matter-clip)">
          <ellipse
            cx={245 - p * 12}
            cy={centerY - halfHeight * 0.34}
            rx={halfWidth * 0.6}
            ry={halfHeight * 0.52}
            fill="url(#matter-light)"
            opacity={0.78 - p * 0.12}
            transform={`rotate(-18 245 ${centerY - halfHeight * 0.34})`}
          />
          <path
            d={`M ${centerX - halfWidth * 0.7} ${centerY + halfHeight * 0.05}
                C ${centerX - halfWidth * 0.22} ${centerY - halfHeight * 0.18 + deformation * 10},
                  ${centerX + halfWidth * 0.12} ${centerY + halfHeight * 0.2 - deformation * 14},
                  ${centerX + halfWidth * 0.75} ${centerY - halfHeight * 0.02}`}
            fill="none"
            stroke="white"
            strokeLinecap="round"
            strokeWidth={1.5 + deformation * 1.5}
            opacity={0.08 + deformation * 0.2}
          />
          <path
            d={`M ${centerX - halfWidth * 0.5} ${centerY + halfHeight * 0.35}
                C ${centerX - halfWidth * 0.04} ${centerY + halfHeight * 0.14},
                  ${centerX + halfWidth * 0.26} ${centerY + halfHeight * 0.5},
                  ${centerX + halfWidth * 0.66} ${centerY + halfHeight * 0.25}`}
            fill="none"
            stroke="var(--navy)"
            strokeLinecap="round"
            strokeWidth="2"
            opacity={deformation * 0.09}
          />
        </g>
      </svg>
    </div>
  )
}

function PressureGraph({
  values,
  isPreview,
}: {
  values: number[]
  isPreview: boolean
}) {
  const chartValues =
    values.length > 1 ? values : [values[0] ?? 0, values[0] ?? 0]
  const points = chartValues
    .map((value, index) => {
      const x = (index / (chartValues.length - 1)) * 720
      const y = 110 - clamp(value) * 94
      return `${x},${y}`
    })
    .join(" ")

  return (
    <div className="graph-wrap">
      <div className="graph-grid" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <svg
        viewBox="0 0 720 120"
        preserveAspectRatio="none"
        role="img"
        aria-label="최근 압력 변화"
      >
        <defs>
          <linearGradient id="graph-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--blue)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--blue)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={`0,120 ${points} 720,120`} fill="url(#graph-fill)" />
        <polyline
          points={points}
          fill="none"
          stroke="var(--blue)"
          strokeDasharray={isPreview ? "7 7" : undefined}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="graph-labels">
        <span>{isPreview ? "Preview start" : "1 hour ago"}</span>
        <span>Now</span>
      </div>
    </div>
  )
}

function StageScale({ activeStage }: { activeStage: MaterialStage }) {
  const stages: MaterialStage[] = ["Rest", "Soft", "Pressed", "Compressed"]

  return (
    <div className="stage-scale">
      {stages.map((stage, index) => (
        <div
          key={stage}
          className={`stage-step ${stage === activeStage ? "is-active" : ""}`}
        >
          <span>{String(index + 1).padStart(2, "0")}</span>
          <strong>{stage}</strong>
        </div>
      ))}
    </div>
  )
}

export default function App() {
  const [serialMeasurements, setSerialMeasurements] = useState<Measurement[]>(
    [],
  )
  const [supabaseMeasurements, setSupabaseMeasurements] =
    useState<Measurement[]>([])
  const [supabaseStatus, setSupabaseStatus] =
    useState<"Connecting" | "Connected" | "Not configured" | "Error" | "Disconnected">(
      "Connecting",
    )
  const [supabaseError, setSupabaseError] = useState("")
  const [serialConnected, setSerialConnected] = useState(false)
  const [serialError, setSerialError] = useState("")
  const [previewPressure, setPreviewPressure] = useState(0)
  const [previewHistory, setPreviewHistory] = useState<number[]>([0])
  const portRef = useRef<SerialPortLike | null>(null)
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null)
  const readTaskRef = useRef<Promise<void> | null>(null)
  const disconnectRequestedRef = useRef(false)

  useEffect(() => {
    if (!supabase) {
      setSupabaseStatus("Not configured")
      setSupabaseError("Supabase environment variables are not configured.")
      return
    }

    let active = true
    setSupabaseStatus("Connecting")
    setSupabaseError("")

    async function loadRecentReadings() {
      const { data, error } = await supabase!
        .from("readings")
        .select("value, created_at")
        .order("created_at", { ascending: false })
        .limit(100)

      if (!active) return
      if (error) {
        setSupabaseStatus("Error")
        setSupabaseError(error.message)
        return
      }

      const readings = (data ?? [])
        .map((row) => {
          const timestamp = Date.parse(row.created_at)
          const value = Number(row.value)
          return Number.isFinite(timestamp) &&
            Number.isFinite(value) &&
            value >= 0 &&
            value <= SENSOR_MAX
            ? {
                time: new Date(timestamp).toLocaleTimeString(),
                value,
                timestamp,
              }
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
          const row = payload.new as {
            value?: unknown
            created_at?: unknown
          }
          const value = Number(row.value)
          const timestamp =
            typeof row.created_at === "string"
              ? Date.parse(row.created_at)
              : Date.now()

          if (
            !Number.isFinite(value) ||
            value < 0 ||
            value > SENSOR_MAX ||
            !Number.isFinite(timestamp)
          )
            return

          setSupabaseMeasurements((current) =>
            [
              ...current,
              {
                time: new Date(timestamp).toLocaleTimeString(),
                value,
                timestamp,
              },
            ]
              .sort((a, b) => a.timestamp - b.timestamp)
              .slice(-100),
          )
        },
      )
      .subscribe((status, error) => {
        if (!active) return
        if (status === "SUBSCRIBED") {
          setSupabaseStatus("Connected")
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setSupabaseStatus("Error")
          setSupabaseError(
            error?.message ?? "Could not connect to the realtime channel.",
          )
        } else if (status === "CLOSED") {
          setSupabaseStatus("Disconnected")
        }
      })

    return () => {
      active = false
      void supabase.removeChannel(channel)
    }
  }, [])

  const activeMeasurements =
    serialConnected && serialMeasurements.length > 0
      ? serialMeasurements
      : supabaseMeasurements
  const hasSensorData = activeMeasurements.length > 0
  const latestMeasurement = hasSensorData ? activeMeasurements.at(-1)! : null
  const latestSensorValue = latestMeasurement?.value ?? null
  const dataSource =
    serialConnected && serialMeasurements.length > 0
      ? "Web Serial"
      : hasSensorData
        ? "Supabase"
        : "Preview"
  const targetPressure = hasSensorData
    ? clamp(latestSensorValue! / SENSOR_MAX)
    : previewPressure
  const smoothPressure = useSpringValue(targetPressure)
  const stage = getStage(smoothPressure)

  const normalizedSensorValues = useMemo(
    () =>
      activeMeasurements.map((reading) => clamp(reading.value / SENSOR_MAX)),
    [activeMeasurements],
  )
  const activeValues = hasSensorData ? normalizedSensorValues : previewHistory
  const statistics = useMemo(() => {
    if (activeValues.length === 0)
      return { min: null, average: null, max: null }
    return {
      min: Math.min(...activeValues),
      average:
        activeValues.reduce((sum, value) => sum + value, 0) /
        activeValues.length,
      max: Math.max(...activeValues),
    }
  }, [activeValues])

  const updatePreview = (nextValue: number) => {
    const normalized = clamp(nextValue / 100)
    setPreviewPressure(normalized)
    setPreviewHistory((history) => [...history.slice(-31), normalized])
  }

  const formatStatistic = (value: number | null) => {
    if (value === null) return "—"
    if (hasSensorData) return `${Math.round(value * SENSOR_MAX)} ADC`
    return `${Math.round(value * 100)}%`
  }

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

          const sensorValue = Number(trimmed)
          if (sensorValue < 0 || sensorValue > SENSOR_MAX) continue
          const timestamp = Date.now()

          setSerialMeasurements((current) =>
            [
              ...current,
              {
                time: new Date(timestamp).toLocaleTimeString(),
                value: sensorValue,
                timestamp,
              },
            ].slice(-100),
          )
        }
      }
    } catch (error) {
      if (!disconnectRequestedRef.current) {
        setSerialError(
          error instanceof Error
            ? error.message
            : "Could not read sensor data.",
        )
      }
    } finally {
      reader.releaseLock()
      if (readerRef.current === reader) readerRef.current = null
      if (portRef.current === port) {
        portRef.current = null
        try {
          await port.close()
        } catch {
          // The browser may already have closed the port.
        }
        setSerialConnected(false)
      }
    }
  }

  async function connectSerial() {
    const serial = (navigator as Navigator & { serial?: SerialApi }).serial
    if (!serial) {
      setSerialError(
        "Web Serial requires Chrome on localhost or a secure HTTPS connection.",
      )
      return
    }

    setSerialError("")
    disconnectRequestedRef.current = false

    try {
      const port = await serial.requestPort()
      portRef.current = port
      await port.open({ baudRate: 115200 })
      if (!port.readable) throw new Error("The serial port is not readable.")

      const reader = port.readable.getReader()
      readerRef.current = reader
      setSerialConnected(true)
      readTaskRef.current = readSerialData(port, reader)
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "NotFoundError")) {
        setSerialError(
          error instanceof Error
            ? error.message
            : "Could not connect the sensor.",
        )
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
      setSerialConnected(false)
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
      setSerialConnected(false)
    }
  }

  return (
    <div className="site-shell">
      <header className="site-header">
        <div className="brand-lockup">
          <strong>SOFT MATTER</strong>
          <span>Pressure-responsive digital material</span>
        </div>

        <div className="connection-summary">
          <div className="connection-copy">
            <span>Sensor status</span>
            <strong>
              {hasSensorData
                ? `${dataSource} active`
                : serialConnected
                  ? "Waiting for data"
                  : "Preview mode"}
            </strong>
          </div>
          <ConnectionMark connected={hasSensorData} />
          <div className="last-received">
            <span>Last data</span>
            <strong>{latestMeasurement?.time ?? "No sensor data"}</strong>
          </div>
        </div>
      </header>

      <main>
        <section className="experience-section">
          <div className="experience-intro">
            <span className="eyebrow">Digital material study / 01</span>
            <h1>
              Make pressure
              <br />
              visible.
            </h1>
          </div>

          <div className="object-column">
            {!hasSensorData && (
              <span className="preview-badge">
                <i />
                Preview Mode
              </span>
            )}

            <MaterialObject pressure={smoothPressure} />

            <div className="pressure-readout" aria-live="polite">
              <div>
                <strong>{Math.round(smoothPressure * 100)}</strong>
                <span>%</span>
              </div>
              <p>
                {hasSensorData
                  ? `${Math.round(latestSensorValue!)} ADC`
                  : "ADC —"}
                <span aria-hidden="true" />
                {stage}
              </p>
            </div>
          </div>

          <div className="interaction-column">
            <div className="interaction-copy">
              <p>Apply pressure to transform the material.</p>
              <div>
                <button
                  type="button"
                  className={`serial-button ${
                    serialConnected ? "is-connected" : ""
                  }`}
                  onClick={serialConnected ? disconnectSerial : connectSerial}
                >
                  <span />
                  {serialConnected ? "Disconnect FSR402" : "Connect FSR402"}
                </button>
                <p className="connection-detail">Supabase · {supabaseStatus}</p>
                {(serialError || supabaseError) && (
                  <p className="sensor-error" role="alert">
                    {serialError || supabaseError}
                  </p>
                )}
              </div>
            </div>
            {!hasSensorData && (
              <div className="preview-control">
                <div className="control-label">
                  <label htmlFor="pressure-preview">Preview pressure</label>
                  <output htmlFor="pressure-preview">
                    {Math.round(previewPressure * 100)}%
                  </output>
                </div>
                <input
                  id="pressure-preview"
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round(previewPressure * 100)}
                  onChange={(event) =>
                    updatePreview(Number(event.target.value))
                  }
                  style={
                    {
                      "--range-progress": `${previewPressure * 100}%`,
                    } as React.CSSProperties
                  }
                  aria-describedby="preview-note"
                />
                <div className="range-labels" aria-hidden="true">
                  <span>Rest</span>
                  <span>Compressed</span>
                </div>
                <p id="preview-note">
                  Sensor disconnected. This control affects the visual preview
                  only.
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="data-section" aria-label="Pressure information">
          <div className="data-heading">
            <div>
              <span className="eyebrow">Material response</span>
              <h2>Pressure over time</h2>
            </div>
            <span className={`source-label ${hasSensorData ? "is-live" : ""}`}>
              {hasSensorData ? "Live sensor data" : "Preview session data"}
            </span>
          </div>

          <div className="data-grid">
            <div className="graph-panel">
              <PressureGraph values={activeValues} isPreview={!hasSensorData} />
            </div>

            <div className="metric-list">
              {[
                ["Minimum", statistics.min],
                ["Average", statistics.average],
                ["Maximum", statistics.max],
              ].map(([label, value]) => (
                <div className="metric-row" key={label as string}>
                  <span>{label}</span>
                  <strong>{formatStatistic(value as number | null)}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="status-grid">
            <div className="sensor-state">
              <span className="eyebrow">Sensor state</span>
              <div>
                <ConnectionMark connected={hasSensorData} />
                <strong>
                  {hasSensorData ? "Receiving data" : "Not connected"}
                </strong>
              </div>
              <p>
                {hasSensorData
                  ? `${dataSource} input is controlling the material.`
                  : serialConnected
                    ? "Sensor connected. Waiting for the first valid reading."
                    : "Preview input is isolated from sensor readings."}
              </p>
            </div>
            <div className="stage-panel">
              <span className="eyebrow">Response stage</span>
              <StageScale activeStage={stage} />
            </div>
          </div>
        </section>
      </main>

      <footer>
        <span>SOFT MATTER © {new Date().getFullYear()}</span>
        <span>FSR402 material interface</span>
      </footer>
    </div>
  )
}
