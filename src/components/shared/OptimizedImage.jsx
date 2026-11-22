import imageWidths from '../../data/optimizedImages.json'

// Responsive copies share the original photo's aspect ratio and crop.
export default function OptimizedImage({ name, sizes = '100vw', loading = 'lazy', fetchPriority = 'auto', ...props }) {
  const widths = imageWidths[name]
  const stem = name.replace(/\.[^.]+$/, '')
  return <img {...props}
    src={'/images/optimized/' + stem + '-960.webp'}
    srcSet={'/images/optimized/' + stem + '-960.webp ' + widths[0] + 'w, /images/optimized/' + stem + '-1920.webp ' + widths[1] + 'w'}
    sizes={sizes} loading={loading} fetchPriority={fetchPriority} decoding="async" />
}
