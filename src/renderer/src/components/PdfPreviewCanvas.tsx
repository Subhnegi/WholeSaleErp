import { useEffect, useRef, useState } from 'react'
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import type { PDFDocumentLoadingTask } from 'pdfjs-dist'

const workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.js', import.meta.url).toString()
GlobalWorkerOptions.workerSrc = workerSrc

const dataUriToUint8Array = (dataUri: string) => {
  const base64Index = dataUri.indexOf('base64,')
  const base64 = base64Index >= 0 ? dataUri.substring(base64Index + 7) : ''
  const binaryString = atob(base64)
  const len = binaryString.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i += 1) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes
}

interface PdfPreviewCanvasProps {
  dataUri: string
}

export function PdfPreviewCanvas({ dataUri }: PdfPreviewCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [renderState, setRenderState] = useState<'idle' | 'rendering' | 'ready' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string>('')

  useEffect(() => {
    const container = containerRef.current
    if (!container) return () => undefined

    container.innerHTML = ''
    setRenderState('rendering')
    setErrorMessage('')

    let isCancelled = false
    let loadingTask: PDFDocumentLoadingTask | null = null

    const renderPdf = async () => {
      try {
        const pdfData = dataUriToUint8Array(dataUri)
        loadingTask = getDocument({ data: pdfData })
        const pdf = await loadingTask.promise

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          if (isCancelled) break
          const page = await pdf.getPage(pageNumber)
          const viewport = page.getViewport({ scale: 1.2 })
          const canvas = document.createElement('canvas')
          const context = canvas.getContext('2d')
          if (!context) continue

          canvas.width = viewport.width
          canvas.height = viewport.height
          canvas.style.display = 'block'
          canvas.style.margin = '0 auto 1rem'
          canvas.style.boxShadow = '0 2px 8px rgba(15, 23, 42, 0.15)'
          canvas.style.background = '#fff'

          container.appendChild(canvas)
          await page.render({ canvas, canvasContext: context, viewport }).promise
        }

        if (!isCancelled) {
          setRenderState('ready')
        }
      } catch (error: any) {
        if (!isCancelled) {
          setRenderState('error')
          setErrorMessage(error?.message || 'Failed to render preview')
        }
      }
    }

    renderPdf()

    return () => {
      isCancelled = true
      if (loadingTask) {
        loadingTask.destroy()
      }
    }
  }, [dataUri])

  return (
    <div className="relative h-full w-full overflow-auto rounded-md bg-background">
      {renderState === 'rendering' && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
          Rendering preview…
        </div>
      )}
      {renderState === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center text-sm text-destructive">
          <span>Unable to display preview.</span>
          {errorMessage && <span className="text-xs text-muted-foreground">{errorMessage}</span>}
        </div>
      )}
      <div
        ref={containerRef}
        className={`h-full w-full px-4 py-6 ${renderState === 'rendering' || renderState === 'error' ? 'invisible' : 'visible'}`}
      />
    </div>
  )
}
