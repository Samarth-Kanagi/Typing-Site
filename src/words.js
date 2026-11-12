// Word banks organized by difficulty level

export const easyWords = [
  'computer', 'develop', 'system', 'design', 'program', 'data',
  'network', 'internet', 'software', 'hardware', 'device', 'mobile',
  'update', 'create', 'manage', 'project', 'digital', 'service',
  'student', 'college', 'learning', 'knowledge', 'information',
  'process', 'research', 'analysis', 'solution', 'customer',
  'support', 'business', 'technology', 'artificial', 'intelligence',
  'environment', 'community', 'important', 'government',
  'opportunity', 'education', 'experience', 'improve',
  'practice', 'discipline', 'workshop', 'problem', 'algorithm',
  'database', 'application', 'function', 'performance', 'security',
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'it',
  'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at', 'this',
  'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she', 'or',
  'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what', 'so',
  'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me', 'when',
  'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take', 'people',
  'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other', 'than',
  'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also', 'back',
  'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way', 'even',
];

export const mediumWords = [
  'should', 'world', 'still', 'between', 'never', 'under', 'start', 'might', 'story', 'school',
  'every', 'point', 'begin', 'change', 'always', 'place', 'while', 'state', 'small', 'night',
  'water', 'along', 'house', 'group', 'young', 'often', 'until', 'large', 'child', 'learn',
  'those', 'right', 'found', 'world', 'going', 'where', 'thing', 'three', 'study', 'being',
  'become', 'people', 'number', 'before', 'system', 'little', 'follow', 'during', 'around', 'return',
  'mother', 'father', 'family', 'create', 'reason', 'simple', 'figure', 'become', 'happen', 'moment',
  'answer', 'public', 'result', 'expect', 'energy', 'second', 'within', 'toward', 'appear', 'enough',
  'almost', 'across', 'anyone', 'behind', 'matter', 'remain', 'notice', 'market', 'design', 'report',
  'garden', 'battle', 'wonder', 'person', 'nature', 'single', 'common', 'future', 'pretty', 'normal',
  'travel', 'finger', 'animal', 'police', 'window', 'handle', 'bridge', 'silver', 'basket', 'hunger',
  'doctor', 'listen', 'memory', 'dinner', 'modern', 'office', 'action', 'player', 'danger', 'record',
  'course', 'happen', 'toward', 'summer', 'island', 'broken', 'bottle', 'letter', 'twelve', 'circle',
];

export const hardWords = [
  'algorithm', 'philosophy', 'acknowledge', 'circumstance', 'extraordinary', 'phenomenon', 'sophisticated',
  'bureaucracy', 'consciousness', 'environmental', 'infrastructure', 'revolutionary', 'communication',
  'psychological', 'approximately', 'characteristic', 'determination', 'entrepreneurial', 'manifestation',
  'unprecedented', 'quintessential', 'simultaneously', 'comprehensive', 'rehabilitation', 'administration',
  'collaboration', 'discontinuous', 'electromagnetic', 'hypothetical', 'jurisprudence', 'kaleidoscope',
  'Mediterranean', 'metamorphosis', 'onomatopoeia', 'perpendicular', 'questionnaire', 'reconnaissance',
  'serendipity', 'thermodynamics', 'ubiquitous', 'vulnerability', 'xylophone', 'archaeological',
  'bibliography', 'catastrophic', 'demographics', 'ecclesiastical', 'fluorescent', 'genealogy',
  'hierarchical', 'idiosyncratic', 'juxtaposition', 'knowledgeable', 'labyrinthine', 'magnanimous',
  'nomenclature', 'ostentatious', 'paradigmatic', 'quintessence', 'reminiscence', 'surveillance',
  'transcontinental', 'unequivocally', 'verisimilitude', 'weatherization', 'extemporaneous', 'acquaintance',
];

/**
 * Generate a passage from random words of the specified difficulty.
 * @param {'easy' | 'medium' | 'hard'} difficulty
 * @param {number} wordCount - Number of words to generate
 * @returns {string}
 */
export function generatePassage(difficulty = 'easy', wordCount = 50) {
  const wordBank =
    difficulty === 'hard' ? hardWords :
    difficulty === 'medium' ? mediumWords :
    easyWords;

  const words = [];
  for (let i = 0; i < wordCount; i++) {
    const idx = Math.floor(Math.random() * wordBank.length);
    words.push(wordBank[idx]);
  }

  return words.join(' ');
}
