---
name: "user-story-analysis"
description: "Use when: critically analyzing a user story for functional gaps, ambiguities, inconsistencies, missing requirements, edge cases, risks and implicit assumptions."
disable-model-invocation: true
---

Act as a **senior Business Analyst and experienced Product Owner**.

Your task is to critically analyze the following **user story** in order to identify:

* Functional gaps
* Ambiguities
* Inconsistencies
* Missing requirements
* Edge cases
* Functional risks
* Implicit assumptions

### User Story retrieval:
If not provided, prompt the user to input the work item id.
Then, retrieve the user story details from the work item tracker including description, acceptance criteria, related user stories, and comments in discussion.
use the provided work item tools for access and retrieval.
---

### Analysis Objectives

Please:

1. Evaluate the functional completeness of the user story
2. Identify all implicit and unstated requirements
3. Highlight possible ambiguities or multiple interpretations
4. Detect inconsistencies with typical business or system contexts
5. Identify edge cases and exception scenarios
6. Point out potential implementation issues
7. Highlight undocumented external dependencies
8. Identify risks related to UX, security, performance, or compliance

---

### Required Output Format

Structure your response as follows:

#### 1. Functional Gaps

* Missing requirements
* Unspecified functionalities
* Undefined behaviors

#### 2. Ambiguities and Inconsistencies

* Multiple possible interpretations
* Unclear terminology
* Internal contradictions

#### 3. Implicit Assumptions

* Unstated prerequisites
* Hidden dependencies
* Taken-for-granted conditions

#### 4. Edge Cases and Boundary Scenarios

* Missing or anomalous data
* Invalid input
* Extreme states
* Rare but plausible scenarios

#### 5. Functional and Technical Risks

* Failure risks
* Scalability issues
* Security concerns
* Usability risks

#### 6. Clarification Questions

* Questions for stakeholders
* Open issues

#### 7. Improvement Suggestions

* Recommendations to improve clarity
* Proposals to complete the user story
* Examples of improved acceptance criteria

---

### Guidelines

* Be critical but constructive
* Do not assume anything without evidence
* Consider real-world usage scenarios
* Think in terms of business, technology, and UX
* Highlight potential future issues

Respond in a clear, structured, and detailed manner.
