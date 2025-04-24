import React from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts';

interface CriteriaData {
  subject: string;
  score: number;
}

interface RadarChartDisplayProps {
  data: CriteriaData[];
}

const RadarChartDisplay: React.FC<RadarChartDisplayProps> = ({ data }) => {
  // Ensure data is properly formatted with numeric values
  const formattedData = data.map(item => ({
    subject: item.subject,
    score: typeof item.score === 'number' ? Math.round(item.score * 10) / 10 : 0
  }));

  return (
    <div className="w-full h-full flex flex-col">
      <h3 className="text-sm font-medium text-center mb-2">Performance by Criteria</h3>
      <div className="flex-grow" style={{ minHeight: '160px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart 
            cx="50%" 
            cy="50%" 
            outerRadius="65%" 
            data={formattedData}
            margin={{ top: 5, right: 5, bottom: 15, left: 5 }}
          >
            <PolarGrid />
            <PolarAngleAxis 
              dataKey="subject" 
              tick={{ fontSize: 10 }} 
            />
            <PolarRadiusAxis angle={30} domain={[0, 10]} tick={{ fontSize: 10 }} />
            <Radar
              name="Score"
              dataKey="score"
              stroke="#6366f1"
              fill="#6366f1"
              fillOpacity={0.5}
            />
            <Tooltip formatter={(value) => [`${value}/10`, 'Score']} />
            <Legend wrapperStyle={{ fontSize: '10px', bottom: 0 }} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default RadarChartDisplay;
