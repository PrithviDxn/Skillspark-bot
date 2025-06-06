import React from 'react';

const techStacks = [
  { id: 'frontend', name: 'Frontend Development', 
    skills: ['React', 'JavaScript', 'HTML/CSS', 'TypeScript', 'Redux'] },
  { id: 'backend', name: 'Backend Development',
    skills: ['Node.js', 'Python', 'Java', 'SQL', 'API Design'] },
  { id: 'fullstack', name: 'Full Stack Development',
    skills: ['MERN Stack', 'MEAN Stack', 'Python/Django', 'Java/Spring'] },
  { id: 'devops', name: 'DevOps',
    skills: ['Docker', 'Kubernetes', 'AWS', 'CI/CD', 'Linux'] },
  { id: 'mobile', name: 'Mobile Development',
    skills: ['React Native', 'Flutter', 'iOS', 'Android', 'Mobile UI/UX'] }
];

const TechStackSelector = ({ selectedStack, onStackChange }) => {
  return (
    <div className="w-full max-w-md mx-auto p-4">
      <label htmlFor="techStack" className="block text-sm font-medium text-gray-700 mb-2">
        Select Technology Stack
      </label>
      <select
        id="techStack"
        value={selectedStack}
        onChange={(e) => onStackChange(e.target.value)}
        className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
      >
        <option value="">Select a tech stack...</option>
        {techStacks.map((stack) => (
          <option key={stack.id} value={stack.id}>
            {stack.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default TechStackSelector; 