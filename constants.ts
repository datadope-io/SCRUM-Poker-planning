import { AiPersona } from './types';

export const AI_PERSONAS: AiPersona[] = [
  {
    id: 'ai-senior',
    name: 'Sarah (Senior Dev)',
    role: 'Senior Full Stack Engineer',
    avatarSeed: 'sarah',
    description: 'Cautious, considers technical debt and edge cases. Tends to estimate higher.'
  },
  {
    id: 'ai-junior',
    name: 'Mike (Junior Dev)',
    role: 'Junior Frontend Developer',
    avatarSeed: 'mike',
    description: 'Optimistic, focuses on the happy path. Tends to estimate lower.'
  },
  {
    id: 'ai-qa',
    name: 'Alex (QA Lead)',
    role: 'QA Automation Engineer',
    avatarSeed: 'alex',
    description: 'Focuses on testing complexity and potential bugs. Moderate to high estimates.'
  },
  {
    id: 'ai-pm',
    name: 'Jessica (Product)',
    role: 'Product Manager',
    avatarSeed: 'jessica',
    description: 'Focuses on business value, sometimes underestimates technical complexity.'
  }
];

export const MOCK_STORY_TEMPLATES = [
  {
    title: "Implement User Authentication",
    description: "As a user, I want to sign up and login using email/password so that I can access my account. Includes JWT handling and password hashing."
  },
  {
    title: "Optimize Dashboard Performance",
    description: "The main dashboard takes 3s to load. We need to implement data caching and optimize SQL queries to bring it under 500ms."
  },
  {
    title: "Dark Mode Toggle",
    description: "Add a switch to the header to toggle between light and dark themes. Persist preference in local storage."
  }
];
