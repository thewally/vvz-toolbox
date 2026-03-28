export default function PlaceholderPage({ title }) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 text-center">
      <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
      <p className="text-gray-500 mt-4">
        Deze pagina is nog in ontwikkeling. Kom binnenkort terug!
      </p>
    </div>
  )
}
