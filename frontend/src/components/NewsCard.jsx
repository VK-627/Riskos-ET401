export function NewsCard({ title, summary, source, time, imageUrl }) {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {imageUrl && (
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-48 object-cover"
        />
      )}
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-4">{summary}</p>
        <div className="flex items-center text-xs text-gray-500">
          <span>{source}</span>
          <span className="mx-2">•</span>
          <span>{time}</span>
        </div>
      </div>
    </div>
  );
}