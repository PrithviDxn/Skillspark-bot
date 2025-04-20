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
  console.log(`FreeEvaluationService: Evaluating answer for question: ${question?.substring(0, 30)}...`);
  console.log(`FreeEvaluationService: Using tech stack: ${techStack || 'unknown'}`);
  
  // Normalize text for better matching
  const normalizedTranscript = transcript.toLowerCase();
  const normalizedQuestion = question.toLowerCase();
  
  // Check if the answer is too short
  if (normalizedTranscript.length < 10) {
    return {
      score: 0,
      feedback: "Your answer is too short to evaluate. Please provide a more detailed response.",
      criteria: {
        technicalAccuracy: 0,
        completeness: 0,
        clarity: 0,
        examples: 0
      }
    };
  }
  
  // Check for extremely short answers
  if (transcript.length < 20 || transcript.trim().split(/\s+/).length < 5) {
    console.log('Answer too short:', transcript.length, 'chars,', transcript.trim().split(/\s+/).length, 'words');
    return {
      score: 1,
      feedback: "Your answer is too short. Please provide a more detailed response that addresses the question thoroughly.",
      criteria: {
        technicalAccuracy: 1,
        completeness: 1,
        clarity: 1,
        examples: 0
      }
    };
  }
  
  // Check for nonsensical answers
  const words = transcript.toLowerCase().trim().split(/\s+/);
  const wordCount = words.length;
  const uniqueWords = new Set(words);
  const wordVariety = uniqueWords.size / Math.max(1, wordCount);
  
  // Check if answer is just numbers or has very low word variety
  const isNumericOnly = /^\d+$/.test(transcript.trim().replace(/\s+/g, ''));
  const hasHighRepetition = wordVariety < 0.4;
  const containsMostlyNumbers = transcript.replace(/[^0-9]/g, '').length > transcript.length * 0.5;
  
  // Musical terms that might indicate singing instead of answering
  const musicalTerms = ['sing', 'song', 'music', 'lyrics', 'melody', 'rhythm', 'beat', 'tune', 'chorus', 'verse'];
  const containsMusicalTerms = musicalTerms.some(term => normalizedTranscript.includes(term));
  
  // Check for common patterns in songs/poetry (repeated phrases, rhyming)
  const lines = transcript.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const hasRepeatedLines = lines.some(line => 
    lines.filter(l => l === line).length > 1
  );
  
  // Check for rhyming patterns (basic detection)
  const hasRhymingPattern = lines.length >= 4 && lines.some((line, index) => {
    if (index < lines.length - 2) {
      const currentLastWord = line.split(' ').pop() || '';
      const nextLastWord = lines[index + 2].split(' ').pop() || '';
      
      // Very basic rhyme detection - same last 2 characters
      return currentLastWord.length > 3 && nextLastWord.length > 3 && 
             currentLastWord.slice(-2) === nextLastWord.slice(-2);
    }
    return false;
  });
  
  // Detect if answer is likely singing or poetry
  const isLikelySingingOrPoetry = containsMusicalTerms || hasRepeatedLines || hasRhymingPattern;
  
  if (isNumericOnly || hasHighRepetition || containsMostlyNumbers || isLikelySingingOrPoetry) {
    console.log('Nonsensical or irrelevant answer detected:', {
      wordVariety,
      isNumericOnly,
      containsMostlyNumbers,
      containsMusicalTerms,
      hasRepeatedLines,
      hasRhymingPattern,
      isLikelySingingOrPoetry
    });
    
    let feedback = "Your response doesn't appear to be a meaningful answer to the technical question.";
    
    if (isLikelySingingOrPoetry) {
      feedback = "Your response appears to be singing or poetry rather than a technical answer. Please provide a relevant technical response that addresses the question.";
    }
    
    return {
      score: 0,
      feedback,
      criteria: {
        technicalAccuracy: 0,
        completeness: 0,
        clarity: 0,
        examples: 0
      }
    };
  }
  
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
  
  // Technical accuracy calculation
  const answerWords = normalizedTranscript.split(' ').filter(word => word.length > 0);
  
  // Apply length penalty for very short answers
  const lengthPenalty = Math.min(1, Math.max(0.1, answerWords.length / 30));
  
  // Reduced baseline from 3 to 0 for very poor answers
  technicalAccuracyScore = Math.min(10, ((techKeywordDensity * 7) + (generalTermDensity * 3)) * lengthPenalty);
  
  // Helper function to extract keywords from text
  const extractKeywords = (text: string): string[] => {
    return text.split(' ')
      .filter(word => word.length > 4)
      .map(word => word.toLowerCase());
  };
  
  // Extract keywords from the question
  const questionKeywords = extractKeywords(normalizedQuestion);

  // Check if the answer contains keywords from the question
  const matchedKeywords = questionKeywords.filter(keyword => normalizedTranscript.includes(keyword));
  console.log('Question keywords:', questionKeywords);
  console.log('Matched keywords:', matchedKeywords);

  // Check completeness (how many of the question keywords are addressed)
  const questionKeywordMatches = questionKeywords.filter(
    keyword => normalizedTranscript.includes(keyword)
  );
  
  // Calculate relevance score - how relevant is this answer to the question
  const relevanceScore = questionKeywords.length > 0 
    ? Math.min(1, matchedKeywords.length / Math.min(3, questionKeywords.length))
    : 0.1;
    
  console.log('Relevance score:', relevanceScore, '(matched', matchedKeywords.length, 'of', questionKeywords.length, 'keywords)');
    
  // If answer is completely irrelevant (matches none of the key question terms),
  // it should get a very low score
  if (relevanceScore < 0.1 && questionKeywords.length >= 3) {
    console.log('Answer appears completely irrelevant to the question');
    return {
      score: 0,
      feedback: "Your answer appears to be unrelated to the question. Please provide a relevant response that directly addresses the specific technical question asked.",
      criteria: {
        technicalAccuracy: 0,
        completeness: 0,
        clarity: 0,
        examples: 0
      }
    };
  }
  
  // Completeness calculation - fix NaN issue
  if (questionKeywords.length > 0) {
    // Multiply by relevance score to penalize irrelevant answers
    completenessScore = Math.min(10, (questionKeywordMatches.length / questionKeywords.length) * 10 * relevanceScore);
  } else {
    // Fallback to length-based score if no question keywords
    completenessScore = Math.min(10, answerWords.length / 20) * relevanceScore;
  }

  // Very short answers should have reduced completeness
  if (answerWords.length < 15) {
    completenessScore = completenessScore * (answerWords.length / 15);
  }
  
  // Calculate clarity score (20%)
  // Check for transition words and clear structure
  const clarityMatches = clarityIndicators.filter(indicator => 
    normalizedTranscript.includes(indicator.toLowerCase())
  );
  
  // Sentence structure analysis (simple version)
  const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const avgWordsPerSentence = sentences.reduce((sum, s) => sum + s.split(' ').length, 0) / Math.max(1, sentences.length);
  
  // No baseline points for short answers
  const sentenceStructureScore = (avgWordsPerSentence > 5 && avgWordsPerSentence < 25 && sentences.length > 1) ? 1 : 0;
  
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
  
  // Set a conservative minimum baseline for very short but valid answers
  const technicalAccuracyFinal = Math.max(1, technicalAccuracyScore);
  const completenessFinal = Math.max(1, completenessScore);
  const clarityFinal = Math.max(1, clarityScore);
  const examplesFinal = Math.max(0, examplesScore); // Examples can be 0 if none provided

  // Final score is weighted average
  const weightedScore = (
    technicalAccuracyFinal * 0.4 +
    completenessFinal * 0.3 +
    clarityFinal * 0.2 +
    examplesFinal * 0.1
  );

  const finalScore = Math.min(10, weightedScore);
  
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
  
  const result = {
    score: Math.round(finalScore * 10) / 10,
    feedback,
    criteria: {
      technicalAccuracy: Math.round(technicalAccuracyScore * 10) / 10,
      completeness: Math.round(completenessScore * 10) / 10,
      clarity: Math.round(clarityScore * 10) / 10,
      examples: Math.round(examplesScore * 10) / 10
    }
  };
  
  console.log("FreeEvaluationService: Final result:", {
    score: result.score,
    criteriaKeys: Object.keys(result.criteria),
    criteria: result.criteria
  });

  // Log the full result for debugging
  console.log("FreeEvaluationService: Complete evaluation result:", JSON.stringify(result, null, 2));
  
  return result;
};

export default {
  evaluateAnswer
}; 