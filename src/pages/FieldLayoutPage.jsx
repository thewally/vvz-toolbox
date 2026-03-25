export default function FieldLayoutPage() {
  return (
    <div className="max-w-5xl mx-auto p-4">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Veldindeling VVZ'49</h2>

      <div className="bg-green-100 border-2 border-green-300 rounded-2xl p-6 relative" style={{ minHeight: 500 }}>
        {/* Parking / entrance indicator */}
        <div className="absolute top-2 left-4 text-xs text-gray-500 italic">Clubhuis / ingang</div>

        <div className="grid grid-cols-4 gap-3 mt-8">
          {/* Veld 1 quadrants */}
          <FieldBox name="1A" row={1} />
          <FieldBox name="1B" row={1} />
          <FieldBox name="6A" row={1} />
          <FieldBox name="6B" row={1} />
          <FieldBox name="1C" row={2} />
          <FieldBox name="1D" row={2} />
          <FieldBox name="6C" row={2} />
          <FieldBox name="6D" row={2} />
        </div>

        <div className="mt-4 grid grid-cols-4 gap-3">
          <FieldBox name="Veld 2" size="lg" />
          <FieldBox name="3A" />
          <FieldBox name="3B" />
          <FieldBox name="Veld 4" />
        </div>

        <div className="mt-4 flex gap-3">
          <FieldBox name="Veld 5" size="lg" />
        </div>

        {/* Labels */}
        <div className="mt-6 flex flex-wrap gap-2 text-xs text-gray-500">
          <span className="bg-white/70 px-2 py-1 rounded">Veld 1 = 1A + 1B + 1C + 1D</span>
          <span className="bg-white/70 px-2 py-1 rounded">Veld 6 = 6A + 6B + 6C + 6D</span>
          <span className="bg-white/70 px-2 py-1 rounded">Veld 3 = 3A + 3B</span>
        </div>
      </div>
    </div>
  )
}

function FieldBox({ name, size }) {
  const sizeClass = size === 'lg' ? 'col-span-2' : ''
  return (
    <div className={`bg-green-600 text-white rounded-lg flex items-center justify-center font-bold text-sm py-8 shadow-inner ${sizeClass}`}>
      {name}
    </div>
  )
}
