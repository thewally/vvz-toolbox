import { useParams } from 'react-router-dom'
import SchedulePage from './SchedulePage'

export default function TrainingschemaBeheerPage() {
  const { scheduleId } = useParams()
  return <SchedulePage isAdmin scheduleId={scheduleId} />
}
