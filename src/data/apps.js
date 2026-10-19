export const formatDownloads = (downloads) => {
  if (downloads >= 1_000_000) {
    return `${(downloads / 1_000_000).toFixed(downloads % 1_000_000 === 0 ? 0 : 1)}M`
  }

  if (downloads >= 1_000) {
    return `${(downloads / 1_000).toFixed(downloads % 1_000 === 0 ? 0 : 1)}K`
  }

  return String(downloads)
}

export const formatNumber = (number) => new Intl.NumberFormat('en').format(number)
