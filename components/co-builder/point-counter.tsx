'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Trophy } from 'lucide-react'
import { getUserPointCounter, getUnseenPointEvents, markPointEventsSeen } from '@/app/(main)/co-builder/actions'
import { useToast } from '@/hooks/use-toast'

export function PointCounter() {
  const router = useRouter()
  const { toast } = useToast()
  const [points, setPoints] = useState(0)
  const [rank, setRank] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const [animating, setAnimating] = useState(false)

  const checkUnseenEvents = useCallback(async () => {
    const events = await getUnseenPointEvents()
    if (events.length > 0) {
      // Show toast for each event (max 3)
      events.slice(0, 3).forEach((event, i) => {
        setTimeout(() => {
          toast({
            title: `+${event.points} poin!`,
            description: event.description,
          })
        }, i * 500)
      })

      if (events.length > 3) {
        setTimeout(() => {
          toast({
            title: `+${events.length - 3} notifikasi lainnya`,
            description: 'Lihat detail di halaman Co-Builder',
          })
        }, 1500)
      }

      // Mark as seen
      await markPointEventsSeen(events.map(e => e.id))
    }
  }, [toast])

  useEffect(() => {
    async function load() {
      const data = await getUserPointCounter()
      if (data) {
        if (loaded && data.points !== points) {
          setAnimating(true)
          setTimeout(() => setAnimating(false), 1000)
        }
        setPoints(data.points)
        setRank(data.rank)
        setLoaded(true)
      }
    }
    load()
    checkUnseenEvents()
    // Poll every 60 seconds
    const interval = setInterval(() => {
      load()
      checkUnseenEvents()
    }, 60000)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!loaded) return null

  return (
    <button
      onClick={() => router.push('/co-builder')}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-all hover:bg-muted ${
        animating ? 'ring-2 ring-orange-400 ring-offset-1 bg-orange-50' : ''
      }`}
      title="Lihat Leaderboard"
    >
      <Trophy className="h-4 w-4 text-orange-500" />
      <span className={`tabular-nums ${animating ? 'text-orange-600' : ''}`}>
        {points} pts
      </span>
      {rank > 0 && (
        <span className="text-muted-foreground text-xs">
          #{rank}
        </span>
      )}
    </button>
  )
}
