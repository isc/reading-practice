export const sentences = {
  easy: [
    { text: "Le chat dort sur le canapé.", emoji: "😺" },
    { text: "Il fait beau aujourd'hui.", emoji: "☀️" },
    { text: "J'aime lire des livres intéressants.", emoji: "📚" },
  ],
  medium: [
    {
      text: "Le petit chat aime le lait, mais le grand chat préfère l'eau.",
      emoji: "🥛",
    },
    {
      text: "La vie est pleine de surprises et d'opportunités à saisir.",
      emoji: "✨",
    },
    {
      text: "Apprendre une nouvelle langue ouvre de nombreuses portes.",
      emoji: "🗣️",
    },
  ],
  hard: [
    {
      text: "L'intelligence artificielle révolutionne de nombreux secteurs de notre société.",
      emoji: "🤖",
    },
    {
      text: "La biodiversité est essentielle à l'équilibre des écosystèmes de notre planète.",
      emoji: "🌍",
    },
    {
      text: "Les avancées technologiques nous obligent à repenser notre rapport au travail.",
      emoji: "💻",
    },
  ],
}

export function loadPhoneticDict() {
  const phoneticDict = {}
  fetch("fr_FR.txt")
    .then((response) => response.text())
    .then((data) => {
      data.split("\n").forEach((line) => {
        const [word, phonetic] = line.split("\t")
        if (word && phonetic) phoneticDict[word.toLowerCase()] = phonetic.trim()
      })
    })
    .catch((error) =>
      console.error("Error loading phonetic dictionary:", error)
    )
  return phoneticDict
}

export const phoneticDict = loadPhoneticDict()

export function getPhonetic(word) {
  word = word.toLowerCase().replace(/[.,!?]/g, "")
  return phoneticDict[word] || word
}
