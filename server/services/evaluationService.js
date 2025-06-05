import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

class EvaluationService {
  constructor() {
    this.evaluations = new Map(); // Store evaluations by interview ID
  }

  async generateEvaluation(interviewId, responses, domain) {
    try {
      const evaluation = {
        interviewId,
        domain,
        timestamp: new Date(),
        technicalSkills: {},
        softSkills: {},
        overallRating: 0,
        detailedFeedback: '',
        recommendations: [],
        strengths: [],
        weaknesses: [],
        improvementAreas: []
      };

      // Analyze technical skills
      evaluation.technicalSkills = await this.analyzeTechnicalSkills(responses, domain);
      
      // Analyze soft skills
      evaluation.softSkills = await this.analyzeSoftSkills(responses);
      
      // Generate overall rating
      evaluation.overallRating = this.calculateOverallRating(
        evaluation.technicalSkills,
        evaluation.softSkills
      );
      
      // Generate detailed feedback
      evaluation.detailedFeedback = await this.generateDetailedFeedback(
        evaluation.technicalSkills,
        evaluation.softSkills,
        domain
      );
      
      // Generate recommendations
      evaluation.recommendations = await this.generateRecommendations(
        evaluation.technicalSkills,
        evaluation.softSkills,
        domain
      );

      // Store evaluation
      this.evaluations.set(interviewId, evaluation);
      
      return evaluation;
    } catch (error) {
      console.error('Error generating evaluation:', error);
      throw error;
    }
  }

  async analyzeTechnicalSkills(responses, domain) {
    try {
      const prompt = `Analyze the technical skills demonstrated in these interview responses for a ${domain} position:
      
      ${responses.map((r, i) => `
      Q${i + 1}: ${r.question}
      Response: ${r.response}
      Analysis: ${JSON.stringify(r.analysis)}
      `).join('\n')}
      
      Evaluate the following aspects:
      1. Technical knowledge depth
      2. Problem-solving ability
      3. Code quality (if applicable)
      4. Architecture understanding
      5. Best practices knowledge
      
      Format the response as a JSON object:
      {
        "knowledgeDepth": number (0-10),
        "problemSolving": number (0-10),
        "codeQuality": number (0-10),
        "architecture": number (0-10),
        "bestPractices": number (0-10),
        "overallTechnicalScore": number (0-10),
        "keyStrengths": string[],
        "technicalGaps": string[],
        "detailedAnalysis": string
      }`;

      const completion = await openai.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are an expert technical evaluator providing detailed skill assessment."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        model: "gpt-4-turbo-preview",
        response_format: { type: "json_object" }
      });

      return JSON.parse(completion.choices[0].message.content);
    } catch (error) {
      console.error('Error analyzing technical skills:', error);
      throw error;
    }
  }

  async analyzeSoftSkills(responses) {
    try {
      const prompt = `Analyze the soft skills demonstrated in these interview responses:
      
      ${responses.map((r, i) => `
      Q${i + 1}: ${r.question}
      Response: ${r.response}
      `).join('\n')}
      
      Evaluate the following aspects:
      1. Communication clarity
      2. Problem explanation
      3. Confidence level
      4. Professional demeanor
      5. Team collaboration potential
      
      Format the response as a JSON object:
      {
        "communication": number (0-10),
        "explanation": number (0-10),
        "confidence": number (0-10),
        "professionalism": number (0-10),
        "collaboration": number (0-10),
        "overallSoftScore": number (0-10),
        "keyStrengths": string[],
        "improvementAreas": string[],
        "detailedAnalysis": string
      }`;

      const completion = await openai.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are an expert evaluator providing detailed soft skills assessment."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        model: "gpt-4-turbo-preview",
        response_format: { type: "json_object" }
      });

      return JSON.parse(completion.choices[0].message.content);
    } catch (error) {
      console.error('Error analyzing soft skills:', error);
      throw error;
    }
  }

  calculateOverallRating(technicalSkills, softSkills) {
    const weights = {
      technical: 0.7,
      soft: 0.3
    };

    return (
      technicalSkills.overallTechnicalScore * weights.technical +
      softSkills.overallSoftScore * weights.soft
    );
  }

  async generateDetailedFeedback(technicalSkills, softSkills, domain) {
    try {
      const prompt = `Generate detailed feedback for a ${domain} candidate based on the following evaluation:
      
      Technical Skills:
      ${JSON.stringify(technicalSkills, null, 2)}
      
      Soft Skills:
      ${JSON.stringify(softSkills, null, 2)}
      
      Provide comprehensive feedback that:
      1. Summarizes overall performance
      2. Highlights key strengths
      3. Identifies areas for improvement
      4. Provides specific examples
      5. Suggests actionable steps
      
      Format the response as a JSON object:
      {
        "summary": string,
        "strengths": string[],
        "improvements": string[],
        "examples": string[],
        "actionItems": string[],
        "finalThoughts": string
      }`;

      const completion = await openai.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are an expert interviewer providing detailed candidate feedback."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        model: "gpt-4-turbo-preview",
        response_format: { type: "json_object" }
      });

      return JSON.parse(completion.choices[0].message.content);
    } catch (error) {
      console.error('Error generating detailed feedback:', error);
      throw error;
    }
  }

  async generateRecommendations(technicalSkills, softSkills, domain) {
    try {
      const prompt = `Generate specific recommendations for a ${domain} candidate based on their evaluation:
      
      Technical Skills:
      ${JSON.stringify(technicalSkills, null, 2)}
      
      Soft Skills:
      ${JSON.stringify(softSkills, null, 2)}
      
      Provide recommendations that:
      1. Address technical gaps
      2. Improve soft skills
      3. Include specific resources
      4. Set clear goals
      5. Suggest practice exercises
      
      Format the response as a JSON object:
      {
        "technicalRecommendations": {
          "resources": string[],
          "practiceExercises": string[],
          "learningPaths": string[]
        },
        "softSkillRecommendations": {
          "improvementAreas": string[],
          "practiceScenarios": string[],
          "resources": string[]
        },
        "timeline": {
          "shortTerm": string[],
          "mediumTerm": string[],
          "longTerm": string[]
        }
      }`;

      const completion = await openai.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are an expert career advisor providing detailed improvement recommendations."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        model: "gpt-4-turbo-preview",
        response_format: { type: "json_object" }
      });

      return JSON.parse(completion.choices[0].message.content);
    } catch (error) {
      console.error('Error generating recommendations:', error);
      throw error;
    }
  }

  getEvaluation(interviewId) {
    return this.evaluations.get(interviewId);
  }
}

export default new EvaluationService(); 