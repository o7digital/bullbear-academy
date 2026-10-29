import assert from 'node:assert/strict';
import test from 'node:test';
import { migrateLegacyAssistantMessage } from '../src/scripts/chat-identity.mjs';

test('restored screenshot reply updates its introduction and keeps its course information', () => {
  const body = '\n\nPuedo ayudarte a conocer los cursos de trading y finanzas, comparar opciones según tu experiencia o explicarte las opciones de formación presencial y online. ¿Qué te gustaría aprender?';
  const message = { role: 'assistant', id: 'existing-reply', content: '¡Hola! Soy Olivia, asistente de Bull & Bear Academy. 👋' + body };
  assert.deepEqual(migrateLegacyAssistantMessage(message), {
    ...message, content: '¡Hola! Soy Charly, asistente de Bull & Bear Academy. 👋' + body,
  });
  assert.match(message.content, /Soy Olivia/);
});

test('former assistant introductions migrate in all eight chat languages', () => {
  for (const [before, after] of [
    ['Hola, soy Carlos, el asistente IA.', 'Hola, soy Charly, el asistente IA.'],
    ['I’m **Carlos AI**, your assistant.', 'I’m **Charly IA**, your assistant.'],
    ['Здравствуйте! Я Olivia, ИИ-ассистент.', 'Здравствуйте! Я Charly, ИИ-ассистент.'],
    ['您好，我是 Olivia，AI 助手。', '您好，我是 Charly，AI 助手。'],
    ['Guten Tag, ich bin Carlos, der KI-Assistent.', 'Guten Tag, ich bin Charly, der KI-Assistent.'],
    ['Ciao, sono Olivia, l’assistente IA.', 'Ciao, sono Charly, l’assistente IA.'],
    ['Bonjour, je suis Carlos, l’assistant IA.', 'Bonjour, je suis Charly, l’assistant IA.'],
    ['Olá, sou Olivia, o assistente de IA.', 'Olá, sou Charly, o assistente de IA.'],
  ]) {
    assert.equal(migrateLegacyAssistantMessage({ role: 'assistant', content: before }).content, after);
  }
});

test('visitor/operator messages, real people, links and current replies stay intact', () => {
  for (const message of [
    { role: 'user', content: 'Soy Olivia. ¿Quién es Carlos Reyes?' },
    { role: 'operator', content: 'Soy Carlos, del equipo.' },
    { role: 'assistant', content: 'Carlos Reyes fundó la academia. Juan Carlos Cruz es mentor.' },
    { role: 'assistant', content: 'Soy **Carlos Reyes**, el fundador.' },
    { role: 'assistant', content: 'https://olivia-ai.o7digital.com/ Soy Charly IA.' },
  ]) assert.equal(migrateLegacyAssistantMessage(message), message);
});

test('migration is safe to repeat across page and language changes', () => {
  const once = migrateLegacyAssistantMessage({ role: 'assistant', content: 'Soy **Olivia IA**, tu asistente.' });
  assert.equal(once.content, 'Soy **Charly IA**, tu asistente.');
  assert.equal(migrateLegacyAssistantMessage(once), once);
});
