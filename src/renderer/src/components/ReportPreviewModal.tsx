import { useEffect, useMemo, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Document, Page, pdfjs } from 'react-pdf'
import { ZoomIn, ZoomOut, RotateCw } from 'lucide-react'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker

const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3]
const DEFAULT_ZOOM_INDEX = 3 // 1.25x default

const PAGE_SIZES = [
  { label: 'Auto', width: 0 },
  { label: 'A4', width: 595 },
  { label: 'Letter', width: 612 },
  { label: 'Legal', width: 612 },
  { label: 'Fit Width', width: -1 }
] as const

interface ReportPreviewModalProps {
  open: boolean
  title?: string
  pdfData: string | null
  filename?: string
  onClose: () => void
  onDownload?: () => void
  isLoading?: boolean
}

export function ReportPreviewModal({
  open,
  title = 'Preview',
  pdfData,
  filename,
  onClose,
  onDownload,
  isLoading = false
}: ReportPreviewModalProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [numPages, setNumPages] = useState(0)
  const [renderError, setRenderError] = useState<string>('')
  const [zoomIndex, setZoomIndex] = useState(DEFAULT_ZOOM_INDEX)
  const [rotation, setRotation] = useState(0)
  const [pageSize, setPageSize] = useState<string>('Auto')
  const [containerWidth, setContainerWidth] = useState(800)

  const scale = ZOOM_LEVELS[zoomIndex]
  const selectedPageSize = PAGE_SIZES.find((p) => p.label === pageSize) || PAGE_SIZES[0]

  useEffect(() => {
    if (!open) {
      setNumPages(0)
      setRenderError('')
      setZoomIndex(DEFAULT_ZOOM_INDEX)
      setRotation(0)
      setPageSize('Auto')
    }
  }, [open])

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width)
      }
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [open])

  const handleZoomIn = () => {
    setZoomIndex((prev) => Math.min(prev + 1, ZOOM_LEVELS.length - 1))
  }

  const handleZoomOut = () => {
    setZoomIndex((prev) => Math.max(prev - 1, 0))
  }

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360)
  }

  const handleLoadSuccess = (doc: { numPages: number }) => {
    setNumPages(doc.numPages)
    setRenderError('')
  }

  const getPageWidth = () => {
    if (selectedPageSize.width === -1) {
      // Fit Width - use container width minus padding
      return Math.max(300, containerWidth - 48)
    }
    if (selectedPageSize.width === 0) {
      // Auto - no width constraint, use scale only
      return undefined
    }
    return selectedPageSize.width
  }

  const handleLoadError = (error: Error) => {
    setRenderError(error.message || 'Failed to render preview')
  }

  const toUint8Array = (dataUri: string) => {
    const base64Index = dataUri.indexOf('base64,')
    if (base64Index === -1) return new Uint8Array()
    const base64 = dataUri.substring(base64Index + 7)
    const binaryString = atob(base64)
    const len = binaryString.length
    const bytes = new Uint8Array(len)
    for (let i = 0; i < len; i += 1) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    return bytes
  }

  const memoizedFileData = useMemo(() => {
    if (!pdfData) return null
    return { data: toUint8Array(pdfData) }
  }, [pdfData])

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-6xl max-h-[95vh]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{filename || 'PDF Preview'}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 overflow-hidden justify-center">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handleZoomOut}
                disabled={zoomIndex === 0}
                title="Zoom Out"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium w-16 text-center">{Math.round(scale * 100)}%</span>
              <Button
                variant="outline"
                size="icon"
                onClick={handleZoomIn}
                disabled={zoomIndex === ZOOM_LEVELS.length - 1}
                title="Zoom In"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={handleRotate} title="Rotate">
                <RotateCw className="h-4 w-4" />
              </Button>
              <Select value={pageSize} onValueChange={setPageSize}>
                <SelectTrigger className="w-24 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZES.map((size) => (
                    <SelectItem key={size.label} value={size.label}>
                      {size.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {numPages > 0 && (
                <span className="text-sm text-muted-foreground ml-2">{numPages} page(s)</span>
              )}
            </div>
            <div className="flex gap-2">
              {onDownload && (
                <Button variant="outline" size="sm" onClick={onDownload} disabled={isLoading}>
                  Download PDF
                </Button>
              )}
            </div>
          </div>
          <div ref={scrollContainerRef} className="h-[75vh] border rounded-md bg-muted/40 overflow-auto">
            {isLoading && (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Preparing preview…
              </div>
            )}
            {!isLoading && pdfData && memoizedFileData && (
              <div ref={containerRef} className="inline-block min-w-full px-4 py-6">
                <Document
                  file={memoizedFileData}
                  loading={null}
                  error={null}
                  onLoadSuccess={handleLoadSuccess}
                  onLoadError={handleLoadError}
                >
                  {renderError && (
                    <div className="flex h-full items-center justify-center text-sm text-destructive">
                      {renderError}
                    </div>
                  )}
                  {!renderError &&
                    numPages > 0 &&
                    Array.from({ length: numPages }, (_, index) => (
                      <div key={`page_${index + 1}`} className="mb-6 flex justify-center">
                        <Page
                          pageNumber={index + 1}
                          scale={scale}
                          rotate={rotation}
                          width={getPageWidth()}
                          loading={null}
                          className="shadow-lg"
                        />
                      </div>
                    ))}
                </Document>
                {!renderError && numPages === 0 && (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    Loading preview…
                  </div>
                )}
              </div>
            )}
            {!isLoading && !pdfData && (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Preview not available
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
