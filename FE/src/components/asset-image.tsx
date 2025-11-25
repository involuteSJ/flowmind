import { useEffect, useState } from "react"

interface AssetImageProps {
  assetId: string
  alt?: string
  className?: string
}

export function AssetImage({ assetId, alt, className }: AssetImageProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    const token = localStorage.getItem("accessToken")

    const loadImage = async () => {
      try {
        setError(null)

        const res = await fetch(
          `http://localhost:8080/api/datasets/assets/${assetId}/image`,
          {
            method: "GET",
            signal: controller.signal,
            headers: token
              ? {
                  Authorization: `Bearer ${token}`,
                }
              : {},
          },
        )

        if (!res.ok) {
          throw new Error(`이미지 로드 실패 (${res.status})`)
        }

        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        setImageUrl(url)
      } catch (err: any) {
        if (err.name === "AbortError") return
        console.error("이미지 로드 실패:", err)
        setError(err.message ?? "이미지를 불러오지 못했습니다.")
      }
    }

    loadImage()

    return () => {
      controller.abort()
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetId])

  if (error) {
    // 실패했을 때는 그냥 비워두거나, alt 텍스트만 보여줄 수도 있음
    return (
      <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
        이미지 로드 실패
      </div>
    )
  }

  if (!imageUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
        로딩 중...
      </div>
    )
  }

  return (
    <img
      src={imageUrl}
      alt={alt}
      className={className ?? "w-full h-full object-cover"}
    />
  )
}
