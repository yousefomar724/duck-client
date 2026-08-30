"use client"

import { useCallback, useEffect, useState } from "react"
import * as opsApi from "@/lib/api/ops"
import type { OpsCalendarDay, OpsHourBooking, OpsHourRow } from "@/lib/api/ops"

export function useOpsCalendar(month: string, supplierId?: string | null) {
  const [days, setDays] = useState<OpsCalendarDay[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await opsApi.getOpsCalendar(month, supplierId)
    setLoading(false)
    if (err || !data) {
      setError(err ?? "فشل التحميل")
      return
    }
    setDays(data.days)
  }, [month, supplierId])

  useEffect(() => {
    const id = window.setTimeout(() => {
      void reload()
    }, 0)
    return () => window.clearTimeout(id)
  }, [reload])

  return { days, loading, error, reload }
}

export function useOpsDay(date: string | undefined, supplierId?: string | null) {
  const [hours, setHours] = useState<OpsHourRow[]>([])
  const [summary, setSummary] = useState<{
    bookings: number
    guests: number
    units: number
    revenue: number
  } | null>(null)
  const [capacity, setCapacity] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!date) return
    setLoading(true)
    setError(null)
    const { data, error: err } = await opsApi.getOpsDay(date, supplierId)
    setLoading(false)
    if (err || !data) {
      setError(err ?? "فشل التحميل")
      return
    }
    setHours(data.hours)
    setSummary(data.summary)
    setCapacity(data.capacity.total)
  }, [date, supplierId])

  useEffect(() => {
    const id = window.setTimeout(() => {
      void reload()
    }, 0)
    return () => window.clearTimeout(id)
  }, [reload])

  return { hours, summary, capacity, loading, error, reload }
}

export function useOpsHour(
  date: string | undefined,
  time: string | undefined,
  supplierId?: string | null,
) {
  const [bookings, setBookings] = useState<OpsHourBooking[]>([])
  const [units, setUnits] = useState(0)
  const [capacity, setCapacity] = useState(0)
  const [pct, setPct] = useState(0)
  const [band, setBand] = useState<OpsHourRow["band"]>("available")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!date || !time) return
    setLoading(true)
    setError(null)
    const { data, error: err } = await opsApi.getOpsHour(date, time, supplierId)
    setLoading(false)
    if (err || !data) {
      setError(err ?? "فشل التحميل")
      return
    }
    setBookings(data.bookings)
    setUnits(data.units)
    setCapacity(data.capacity.total)
    setPct(data.pct)
    setBand(data.band)
  }, [date, time, supplierId])

  useEffect(() => {
    const id = window.setTimeout(() => {
      void reload()
    }, 0)
    return () => window.clearTimeout(id)
  }, [reload])

  return { bookings, units, capacity, pct, band, loading, error, reload }
}
