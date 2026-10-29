// Update the assistant's former introductions when restoring a browser session.
// User/operator messages, people mentioned in replies and URLs remain intact.
const legacyIntroduction = /((?<![\p{L}\p{N}_])(?:(?:soy|me llamo|mi nombre es|je suis|je m['’]appelle|i am|i['’]m|my name is|ich bin|mein name ist|sono|mi chiamo|sou|me chamo|я|меня зовут)\s+|(?:我是|我叫)\s*))(\*\*)?(?:Olivia|Carlos)(?!(?:\*\*)?\s+(?:Reyes|Cruz)\b)(\s+(?:IA|AI))?(\*\*)?(?![\p{L}\p{N}_])/giu;

export function migrateLegacyAssistantMessage(message) {
  if (message.role !== 'assistant') return message;
  const content = message.content.replace(legacyIntroduction, (_, introduction, boldOpen, suffix, boldClose) =>
    `${introduction}${boldOpen || ''}Charly${suffix ? ' IA' : ''}${boldClose || ''}`);
  return content === message.content ? message : { ...message, content };
}
