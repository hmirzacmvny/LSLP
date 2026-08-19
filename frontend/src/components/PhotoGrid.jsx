import { useState, useEffect, useCallback, useRef } from 'react'
import api from '../lib/api'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { ChevronLeft, ChevronRight } from 'lucide-react'

function AuthImage({ path, alt, className }) {
  const [src, setSrc] = useState(null)
  const revoke = useRef(null)

  useEffect(() => {
    let cancelled = false
    api.get(`/api/uploads/${path}`, { responseType: 'blob' })
      .then((res) => {
        if (cancelled) return
        const url = URL.createObjectURL(res.data)
        revoke.current = url
        setSrc(url)
      })
      .catch(() => {})
    return () => {
      cancelled = true
      if (revoke.current) URL.revokeObjectURL(revoke.current)
    }
  }, [path])

  if (!src) return <div className={`${className} bg-slate-100`} />
  return <img src={src} alt={alt} className={className} />
}

export default function PhotoGrid({ urls, alt = 'Photo' }) {
  const [lightboxIdx, setLightboxIdx] = useState(-1)

  const handleKeyDown = useCallback((e) => {
    if (lightboxIdx < 0) return
    if (e.key === 'ArrowRight') setLightboxIdx((i) => Math.min(i + 1, urls.length - 1))
    else if (e.key === 'ArrowLeft') setLightboxIdx((i) => Math.max(i - 1, 0))
    else if (e.key === 'Escape') setLightboxIdx(-1)
  }, [lightboxIdx, urls.length])

  useEffect(() => {
    if (lightboxIdx >= 0) {
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }
  }, [lightboxIdx, handleKeyDown])

  if (!urls || urls.length === 0) return null

  return (
    <>
      <div className="flex gap-2 flex-wrap mt-2">
        {urls.map((url, idx) => (
          <button
            key={idx}
            onClick={() => setLightboxIdx(idx)}
            className="w-16 h-16 rounded-lg overflow-hidden border border-border hover:ring-2 hover:ring-[#1A56A0]/30 transition-shadow shrink-0"
          >
            <AuthImage
              path={url}
              alt={`${alt} ${idx + 1}`}
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>

      <Dialog open={lightboxIdx >= 0} onOpenChange={(open) => { if (!open) setLightboxIdx(-1) }}>
        <DialogContent className="sm:max-w-3xl p-2" showCloseButton={false}>
          {lightboxIdx >= 0 && urls[lightboxIdx] && (
            <div className="relative">
              <AuthImage
                path={urls[lightboxIdx]}
                alt={`${alt} ${lightboxIdx + 1} of ${urls.length}`}
                className="w-full max-h-[70vh] object-contain rounded-lg"
              />
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1 rounded-full tabular-nums">
                {lightboxIdx + 1} / {urls.length}
              </div>
              {lightboxIdx > 0 && (
                <button
                  onClick={() => setLightboxIdx(lightboxIdx - 1)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors"
                >
                  <ChevronLeft className="size-5" />
                </button>
              )}
              {lightboxIdx < urls.length - 1 && (
                <button
                  onClick={() => setLightboxIdx(lightboxIdx + 1)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors"
                >
                  <ChevronRight className="size-5" />
                </button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
