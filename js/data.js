const sentences = {
  easy: [
    { text: "Le chat dort.", emoji: "😺" },
    { text: "Le chien joue.", emoji: "🐕" },
    { text: "L'oiseau vole.", emoji: "🐦" }
  ],
  medium: [
    { text: "Le soleil brille aujourd'hui.", emoji: "☀️" },
    { text: "Les enfants jouent au parc.", emoji: "🎮" },
    { text: "J'aime manger des fruits.", emoji: "🍎" }
  ],
  hard: [
    { text: "La vie est pleine de surprises agréables.", emoji: "✨" },
    { text: "Les voyages forment la jeunesse.", emoji: "✈️" },
    { text: "La musique adoucit les mœurs.", emoji: "🎵" }
  ]
}

let phoneticDict = {}

// Test environment phonetic dictionary
const testPhoneticDict = {
  'chat': 'ʃa',
  'chien': 'ʃjɛ̃',
  'dort': 'dɔʁ',
  'le': 'lə',
  'la': 'la',
  'les': 'le',
  'soleil': 'sɔlɛj',
  'brille': 'bʁij',
  'aujourd': 'oʒuʁdɥi',
  'hui': 'ɥi'
}

async function loadPhoneticDict() {
  // In test environment, use test data
  if (import.meta.env?.MODE === 'test') {
    phoneticDict = testPhoneticDict
    return
  }

  try {
    const response = await fetch('fr_FR.txt')
    const text = await response.text()
    
    text.split('\n').forEach(line => {
      const [word, ...phonetics] = line.split('\t')
      if (word && phonetics.length > 0) {
        phoneticDict[word.toLowerCase()] = phonetics[0]
      }
    })
  } catch (error) {
    console.warn('Error loading phonetic dictionary, using fallback data')
    phoneticDict = testPhoneticDict
  }
}

function getPhonetic(word) {
  return phoneticDict[word.toLowerCase()] || word
}

function getSentences(level) {
  return sentences[level] || []
}

// Initialize dictionary
loadPhoneticDict()

export { getSentences, getPhonetic }
