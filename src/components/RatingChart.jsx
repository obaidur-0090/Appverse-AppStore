import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatNumber } from '../data/apps'

const RatingChart = ({ ratings }) => (
  <ResponsiveContainer width="100%" height={220}>
    <BarChart data={[...ratings].reverse()} layout="vertical" margin={{ top: 2, right: 28, bottom: 2, left: 4 }} barCategoryGap={9}>
      <CartesianGrid horizontal={false} stroke="#f0edf5" />
      <XAxis type="number" hide />
      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={52} tick={{ fill: '#777481', fontSize: 12 }} />
      <Tooltip cursor={{ fill: '#f7f5fb' }} formatter={(value) => [formatNumber(value), 'Reviews']} />
      <Bar dataKey="count" fill="#7654df" radius={[0, 6, 6, 0]} maxBarSize={20} />
    </BarChart>
  </ResponsiveContainer>
)

export default RatingChart
