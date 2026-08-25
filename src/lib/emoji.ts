/* Cosy, autumnal food-and-critters set used for recipe/meal emojis.
   Shared between the client picker and server-side random assignment so the
   two never drift apart. */
export const EMOJIS = [
  "🍎", "🍐", "🍊", "🍇", "🫐", "🍑", "🥭", "🫛",
  "🥦", "🥕", "🥔", "🧅", "🥐", "🍞", "🥖", "🫜",
  "🍠", "🥨", "🥞", "🧇", "🫕", "🍛", "🥮", "🥠",
  "🥧", "🍪", "🌰", "🍯", "🥜", "☕️", "🫖", "🍿",
  "🪵", "🎄", "🌲", "🍁", "🍂", "🍄", "🍄‍🟫", "🌾",
  "🌻", "🐿️", "🦔", "🦫", "🦃", "🐈", "🐈‍⬛", "🐌",
  "🐞", "🦆", "🦉", "🦇", "🐱", "🐦‍⬛", "🐛", "🧸",
  "🎉", "🎁", "🎊", "📯", "📚", "⛄️", "🎃", "👻",
  "🍋", "🎂", "🍰", "🧁", 
];

export function randomEmoji(): string {
  return EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
}
