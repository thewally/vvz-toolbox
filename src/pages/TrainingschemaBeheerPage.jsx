import { useParams, Link } from 'react-router-dom'
import SchedulePage from './SchedulePage'

export default function TrainingschemaBeheerPage() {
  const { scheduleId } = useParams()
  return (
    <div>
      <div className="max-w-5xl mx-auto px-4 pt-4">
        <Link to="/beheer/trainingsschema/instellingen" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-4">&#8249; Terug naar Instellingen</Link>
      </div>
      <SchedulePage isAdmin scheduleId={scheduleId} />
    </div>
  )
}
