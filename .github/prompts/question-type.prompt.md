Create a comprehensive quiz generation system with the following specifications:

1. Question Type Configuration:

- Define individual question types (multiple choice, true/false, open-ended, coding challenges)
- Specify custom instructions per question type
- Set difficulty levels (beginner, intermediate, advanced)
- Select target programming language or subject matter
- Include detailed evaluation criteria for each type

2. Single Question Generation:

- Generate one question at a time
- Allow fine-grained control over parameters:
  - Question type
  - Topic/concept
  - Difficulty
  - Language preference
  - Time limit
  - Point value
  - Required code examples/references

3. Complete Quiz Assembly:

- Specify number and mix of question types
- Set overall difficulty curve
- Define total time limit and point distribution
- Include quiz-level instructions and prerequisites
- Generate comprehensive answer key
- Support custom formatting and presentation options

4. Output Format:

- Structured JSON response
- Clear question/answer separation
- Included metadata for tracking
- Tagged content for easy parsing
- Support for code snippets and examples

Each component should be modular and independently usable, following clean architecture principles for maximum extensibility.
