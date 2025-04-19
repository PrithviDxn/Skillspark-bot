/**
 * FreeEvaluationService.ts
 * 
 * A rule-based service that evaluates interview answers based on keyword matching
 * and pattern recognition. This is a free alternative to OpenAI's GPT-4 evaluation.
 */

interface EvaluationResult {
  score: number;
  feedback: string;
  criteria: {
    technicalAccuracy: number;
    completeness: number;
    clarity: number;
    examples: number;
  };
}

// Simple tech stack keyword dictionary
const techStackKeywords: Record<string, string[]> = {
  'React': [
    'component', 'jsx', 'virtual dom', 'state', 'props', 'hooks', 'useEffect', 
    'useState', 'useContext', 'lifecycle', 'render', 'functional component',
    'class component', 'redux', 'context api', 'react router'
  ],
  'Node.js': [
    'event loop', 'callback', 'async', 'await', 'promise', 'express', 'middleware',
    'npm', 'module', 'require', 'import', 'http', 'server', 'api', 'route',
    'controller', 'mongodb', 'mongoose', 'database', 'socket'
  ],
  'Python': [
    'list', 'tuple', 'dictionary', 'set', 'generator', 'iterator', 'decorator',
    'class', 'inheritance', 'polymorphism', 'comprehension', 'lambda', 'def',
    'function', 'flask', 'django', 'pandas', 'numpy', 'asyncio'
  ],
  'Java': [
    'class', 'interface', 'abstract', 'extends', 'implements', 'inheritance',
    'polymorphism', 'encapsulation', 'public', 'private', 'protected', 'static',
    'final', 'generics', 'collections', 'spring', 'jvm', 'garbage collection'
  ],
  'JavaScript': [
    'closure', 'prototype', 'this', 'bind', 'call', 'apply', 'arrow function',
    'var', 'let', 'const', 'hoisting', 'event', 'callback', 'promise',
    'async', 'await', 'dom', 'event loop', 'map', 'filter', 'reduce'
  ],
  'TypeScript': [
    'interface', 'type', 'enum', 'generic', 'union', 'intersection', 'tuple',
    'any', 'unknown', 'never', 'void', 'readonly', 'as', 'implements', 'extends',
    'declaration', 'optional', 'undefined', 'null', 'strict'
  ]
};

// Common technical terms that indicate good answers
const generalTechnicalTerms = [
  'algorithm', 'complexity', 'optimization', 'performance', 'scalability',
  'architecture', 'design pattern', 'best practice', 'memory', 'CPU',
  'thread', 'process', 'concurrent', 'parallel', 'synchronous', 'asynchronous',
  'blocking', 'non-blocking', 'data structure', 'error handling', 'exception'
];

// Terms indicating clear explanation
const clarityIndicators = [
  'because', 'therefore', 'for example', 'this means', 'to clarify',
  'in other words', 'specifically', 'in summary', 'first', 'second',
  'finally', 'furthermore', 'however', 'similarly', 'conversely',
  'in contrast', 'additionally', 'consequently', 'as a result'
];

/**
 * Evaluates an answer using keyword matching and pattern recognition
 */
export const evaluateAnswer = (question: string, transcript: string, techStack?: string): EvaluationResult => {
  // Normalize text for better matching
  const normalizedTranscript = transcript.toLowerCase();
  const normalizedQuestion = question.toLowerCase();
  
  // Initialize scores
  let technicalAccuracyScore = 0;
  let completenessScore = 0;
  let clarityScore = 0;
  let examplesScore = 0;
  
  // Get keywords for the specific tech stack
  const techKeywords = techStack && techStackKeywords[techStack] 
    ? techStackKeywords[techStack] 
    : Object.values(techStackKeywords).flat();
  
  // Calculate technical accuracy score (40%)
  // Count tech stack specific keywords
  const techKeywordMatches = techKeywords.filter(keyword => 
    normalizedTranscript.includes(keyword.toLowerCase())
  );
  
  // Count general technical terms
  const generalTermMatches = generalTechnicalTerms.filter(term => 
    normalizedTranscript.includes(term.toLowerCase())
  );
  
  // Calculate technical score based on keyword density
  const techKeywordDensity = techKeywordMatches.length / techKeywords.length;
  const generalTermDensity = generalTermMatches.length / generalTechnicalTerms.length;
  
  technicalAccuracyScore = Math.min(10, (techKeywordDensity * 7) + (generalTermDensity * 3) + 3);
  
  // Calculate completeness score (30%)
  // Check if the answer covers key parts from the question
  const questionWords = normalizedQuestion.split(' ');
  const questionKeywords = questionWords.filter(word => word.length > 4);
  const questionKeywordMatches = questionKeywords.filter(keyword => 
    normalizedTranscript.includes(keyword)
  );
  
  // Length is also a factor in completeness
  const lengthFactor = Math.min(1, transcript.length / 200);
  
  completenessScore = Math.min(10, 
    (questionKeywordMatches.length / questionKeywords.length * 6) + 
    (lengthFactor * 4)
  );
  
  // Calculate clarity score (20%)
  // Check for transition words and clear structure
  const clarityMatches = clarityIndicators.filter(indicator => 
    normalizedTranscript.includes(indicator.toLowerCase())
  );
  
  // Sentence structure analysis (simple version)
  const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const avgWordsPerSentence = sentences.reduce((sum, s) => sum + s.split(' ').length, 0) / Math.max(1, sentences.length);
  
  // Ideal is between 10-20 words per sentence
  const sentenceStructureScore = avgWordsPerSentence > 5 && avgWordsPerSentence < 25 ? 1 : 0.5;
  
  clarityScore = Math.min(10, 
    (clarityMatches.length / clarityIndicators.length * 5) + 
    (sentenceStructureScore * 5)
  );
  
  // Calculate examples score (10%)
  // Check for example indicators
  const hasExamples = normalizedTranscript.includes('example') || 
    normalizedTranscript.includes('instance') || 
    normalizedTranscript.includes('case') ||
    normalizedTranscript.includes('scenario') ||
    normalizedTranscript.includes('like') ||
    normalizedTranscript.includes('such as');
  
  // Check for code snippets indicators
  const hasCodeSnippets = (normalizedTranscript.includes('```') || 
    normalizedTranscript.includes('code') || 
    normalizedTranscript.includes('function') ||
    normalizedTranscript.includes('class') ||
    normalizedTranscript.includes('method')) &&
    (normalizedTranscript.includes('{') || normalizedTranscript.includes('(') || normalizedTranscript.includes('='));
  
  examplesScore = (hasExamples ? 5 : 0) + (hasCodeSnippets ? 5 : 0);
  
  // Calculate total score (weighted average)
  const totalScore = (
    (technicalAccuracyScore * 0.4) + 
    (completenessScore * 0.3) + 
    (clarityScore * 0.2) + 
    (examplesScore * 0.1)
  );
  
  // Generate feedback
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  
  // Technical accuracy feedback
  if (technicalAccuracyScore >= 7) {
    strengths.push('Demonstrated strong technical knowledge of key concepts');
  } else if (technicalAccuracyScore >= 4) {
    strengths.push('Shows basic understanding of technical concepts');
    weaknesses.push('Could improve technical depth and accuracy');
  } else {
    weaknesses.push('Technical accuracy needs significant improvement');
  }
  
  // Completeness feedback
  if (completenessScore >= 7) {
    strengths.push('Provided a comprehensive answer addressing all parts of the question');
  } else if (completenessScore >= 4) {
    strengths.push('Covered most aspects of the question');
    weaknesses.push('Some aspects of the question could be addressed more thoroughly');
  } else {
    weaknesses.push('Answer is incomplete and misses several key aspects of the question');
  }
  
  // Clarity feedback
  if (clarityScore >= 7) {
    strengths.push('Explanation was clear, well-structured and easy to follow');
  } else if (clarityScore >= 4) {
    strengths.push('Explanation was generally understandable');
    weaknesses.push('Could improve clarity with better structure and transitions');
  } else {
    weaknesses.push('Explanation was difficult to follow and lacked clear structure');
  }
  
  // Examples feedback
  if (examplesScore >= 7) {
    strengths.push('Provided excellent examples to illustrate the concepts');
  } else if (examplesScore >= 4) {
    strengths.push('Used some examples to support the explanation');
    weaknesses.push('Could benefit from more concrete examples or code snippets');
  } else {
    weaknesses.push('Lacked examples to illustrate the concepts');
  }
  
  // Generate final feedback text
  const feedback = `
Evaluation of your answer:

Strengths:
${strengths.map(s => `- ${s}`).join('\n')}

Areas for improvement:
${weaknesses.map(w => `- ${w}`).join('\n')}

The answer was evaluated on technical accuracy (${technicalAccuracyScore.toFixed(1)}/10), 
completeness (${completenessScore.toFixed(1)}/10), clarity (${clarityScore.toFixed(1)}/10), 
and examples (${examplesScore.toFixed(1)}/10).
  `.trim();
  
  return {
    score: Math.round(totalScore * 10) / 10,
    feedback,
    criteria: {
      technicalAccuracy: Math.round(technicalAccuracyScore * 10) / 10,
      completeness: Math.round(completenessScore * 10) / 10,
      clarity: Math.round(clarityScore * 10) / 10,
      examples: Math.round(examplesScore * 10) / 10
    }
  };
};

export default {
  evaluateAnswer
}; 