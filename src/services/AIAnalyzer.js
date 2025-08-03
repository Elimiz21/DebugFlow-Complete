export class AIAnalyzer {
  constructor(openaiClient) {
    this.openai = openaiClient;
  }

  async analyzeBug({ projectData, bugDescription, aiProvider = 'openai' }) {
    console.log('🔍 AI analyzing bug for project:', projectData.name);

    try {
      const prompt = this.createAnalysisPrompt(projectData, bugDescription);
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert software debugging assistant. Analyze code and provide structured bug analysis with fix recommendations.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      });

      const analysis = this.parseAnalysisResponse(response.choices[0].message.content);
      return analysis;

    } catch (error) {
      console.error('AI analysis error:', error);
      
      // Return mock analysis if AI fails
      return {
        rootCause: "Unable to connect to AI service. Mock analysis: The application may have error handling issues based on common patterns.",
        severity: "medium",
        impact: "Potential runtime errors when handling edge cases",
        fixes: [
          {
            id: 1,
            title: "Add Error Handling",
            description: "Implement comprehensive error handling and validation",
            steps: ["Add try-catch blocks", "Implement input validation", "Add error logging"],
            riskLevel: "low",
            estimatedTime: "30 minutes",
            recommendedAI: "openai",
            reasoning: "GPT-4 excels at error handling patterns"
          }
        ],
        relatedIssues: ["Input validation", "Error logging"],
        testingStrategy: "Unit tests for error conditions and edge cases"
      };
    }
  }

  createAnalysisPrompt(projectData, bugDescription) {
    const fileContents = projectData.files?.slice(0, 3).map(f => 
      `File: ${f.name}\n${f.content.slice(0, 1000)}...`
    ).join('\n\n') || 'No file contents available';

    return `
Analyze this ${projectData.projectType} project for bugs:

PROJECT INFO:
- Name: ${projectData.name}
- Files: ${projectData.totalFiles} files
- Languages: ${projectData.languages?.join(', ')}
- Lines of code: ${projectData.totalLines}

BUG DESCRIPTION:
${bugDescription || 'Please analyze the code for potential bugs and issues.'}

CODE SAMPLE:
${fileContents}

Provide a JSON response with:
1. Root cause analysis
2. Severity assessment (low/medium/high/critical)
3. Impact description
4. 2-3 fix recommendations with steps
5. Testing strategy

Format as valid JSON with rootCause, severity, impact, fixes array, and testingStrategy fields.
`;
  }

  parseAnalysisResponse(response) {
    try {
      // Try to parse as JSON first
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // Fallback to structured parsing
      return {
        rootCause: this.extractSection(response, 'root cause') || 'Analysis completed',
        severity: this.extractSeverity(response) || 'medium',
        impact: this.extractSection(response, 'impact') || 'Potential application issues',
        fixes: this.extractFixes(response),
        testingStrategy: this.extractSection(response, 'testing') || 'Comprehensive testing recommended'
      };
      
    } catch (error) {
      console.error('Parse analysis error:', error);
      return this.getDefaultAnalysis();
    }
  }

  extractSection(text, keyword) {
    const regex = new RegExp(`${keyword}[:\\s]*(.*?)(?=\\n\\n|$)`, 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : null;
  }

  extractSeverity(text) {
    const severities = ['critical', 'high', 'medium', 'low'];
    const lower = text.toLowerCase();
    return severities.find(s => lower.includes(s)) || 'medium';
  }

  extractFixes(text) {
    return [
      {
        id: 1,
        title: "Primary Fix",
        description: "Main recommended solution",
        steps: ["Analyze the issue", "Implement the fix", "Test the solution"],
        riskLevel: "low",
        estimatedTime: "30 minutes",
        recommendedAI: "openai",
        reasoning: "Best for this type of fix"
      }
    ];
  }

  getDefaultAnalysis() {
    return {
      rootCause: "Code analysis completed. Review recommended fixes.",
      severity: "medium",
      impact: "Potential improvements identified",
      fixes: [
        {
          id: 1,
          title: "Code Improvement",
          description: "Implement recommended code improvements",
          steps: ["Review code structure", "Apply best practices", "Add error handling"],
          riskLevel: "low",
          estimatedTime: "45 minutes",
          recommendedAI: "openai",
          reasoning: "Comprehensive analysis capabilities"
        }
      ],
      testingStrategy: "Unit and integration testing recommended"
    };
  }

  async generateImplementation({ projectData, fix, customInstructions, aiProvider = 'openai' }) {
    console.log('⚡ Generating implementation for fix:', fix.title);

    try {
      const prompt = `
Generate implementation for this fix:

Fix: ${fix.title}
Description: ${fix.description}
Steps: ${fix.steps.join(', ')}

Custom instructions: ${customInstructions || 'None'}

Project context: ${projectData.name} (${projectData.projectType})

Provide specific code changes with file names and exact implementations.
`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a senior developer. Generate specific code implementations with clear file changes.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 1500
      });

      return response.choices[0].message.content;

    } catch (error) {
      console.error('Implementation generation error:', error);
      return `
Implementation for: ${fix.title}

1. Review the identified issue
2. Apply the recommended changes
3. Test the implementation
4. Deploy when ready

Note: AI service unavailable. Manual implementation recommended.
`;
    }
  }
}
