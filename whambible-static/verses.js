// Top 200 Most Searched Bible Verses — WhamBible Dataset
// Format: { id, text, book, chapter, verse, testament }

const VERSES = [
  { id:1,  text: "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.", book:"John", chapter:3, verse:16, testament:"NT" },
  { id:2,  text: "I can do all this through him who gives me strength.", book:"Philippians", chapter:4, verse:13, testament:"NT" },
  { id:3,  text: "For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, plans to give you hope and a future.", book:"Jeremiah", chapter:29, verse:11, testament:"OT" },
  { id:4,  text: "The Lord is my shepherd, I lack nothing.", book:"Psalms", chapter:23, verse:1, testament:"OT" },
  { id:5,  text: "Trust in the Lord with all your heart and lean not on your own understanding.", book:"Proverbs", chapter:3, verse:5, testament:"OT" },
  { id:6,  text: "Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go.", book:"Joshua", chapter:1, verse:9, testament:"OT" },
  { id:7,  text: "And we know that in all things God works for the good of those who love him, who have been called according to his purpose.", book:"Romans", chapter:8, verse:28, testament:"NT" },
  { id:8,  text: "Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God.", book:"Philippians", chapter:4, verse:6, testament:"NT" },
  { id:9,  text: "In the beginning God created the heavens and the earth.", book:"Genesis", chapter:1, verse:1, testament:"OT" },
  { id:10, text: "The Lord is my light and my salvation — whom shall I fear?", book:"Psalms", chapter:27, verse:1, testament:"OT" },
  { id:11, text: "Jesus wept.", book:"John", chapter:11, verse:35, testament:"NT" },
  { id:12, text: "Love is patient, love is kind. It does not envy, it does not boast, it is not proud.", book:"1 Corinthians", chapter:13, verse:4, testament:"NT" },
  { id:13, text: "For it is by grace you have been saved, through faith — and this is not from yourselves, it is the gift of God.", book:"Ephesians", chapter:2, verse:8, testament:"NT" },
  { id:14, text: "Come to me, all you who are weary and burdened, and I will give you rest.", book:"Matthew", chapter:11, verse:28, testament:"NT" },
  { id:15, text: "Even though I walk through the darkest valley, I will fear no evil, for you are with me.", book:"Psalms", chapter:23, verse:4, testament:"OT" },
  { id:16, text: "But those who hope in the Lord will renew their strength. They will soar on wings like eagles.", book:"Isaiah", chapter:40, verse:31, testament:"OT" },
  { id:17, text: "For the wages of sin is death, but the gift of God is eternal life in Christ Jesus our Lord.", book:"Romans", chapter:6, verse:23, testament:"NT" },
  { id:18, text: "The Lord bless you and keep you; the Lord make his face shine on you and be gracious to you.", book:"Numbers", chapter:6, verse:24, testament:"OT" },
  { id:19, text: "Jesus answered, I am the way and the truth and the life. No one comes to the Father except through me.", book:"John", chapter:14, verse:6, testament:"NT" },
  { id:20, text: "Do not conform to the pattern of this world, but be transformed by the renewing of your mind.", book:"Romans", chapter:12, verse:2, testament:"NT" },
  { id:21, text: "For God did not give us a spirit of timidity, but a spirit of power, of love and of self-discipline.", book:"2 Timothy", chapter:1, verse:7, testament:"NT" },
  { id:22, text: "And now these three remain: faith, hope and love. But the greatest of these is love.", book:"1 Corinthians", chapter:13, verse:13, testament:"NT" },
  { id:23, text: "He gives strength to the weary and increases the power of the weak.", book:"Isaiah", chapter:40, verse:29, testament:"OT" },
  { id:24, text: "Seek first his kingdom and his righteousness, and all these things will be given to you as well.", book:"Matthew", chapter:6, verse:33, testament:"NT" },
  { id:25, text: "I am the vine; you are the branches. If you remain in me and I in you, you will bear much fruit.", book:"John", chapter:15, verse:5, testament:"NT" },
  { id:26, text: "The thief comes only to steal and kill and destroy; I have come that they may have life, and have it to the full.", book:"John", chapter:10, verse:10, testament:"NT" },
  { id:27, text: "God is our refuge and strength, an ever-present help in trouble.", book:"Psalms", chapter:46, verse:1, testament:"OT" },
  { id:28, text: "If my people, who are called by my name, will humble themselves and pray and seek my face and turn from their wicked ways, I will hear from heaven.", book:"2 Chronicles", chapter:7, verse:14, testament:"OT" },
  { id:29, text: "I have been crucified with Christ and I no longer live, but Christ lives in me.", book:"Galatians", chapter:2, verse:20, testament:"NT" },
  { id:30, text: "Have I not commanded you? Be strong and courageous. Do not be terrified; do not be discouraged.", book:"Joshua", chapter:1, verse:9, testament:"OT" },
  { id:31, text: "Delight yourself in the Lord, and he will give you the desires of your heart.", book:"Psalms", chapter:37, verse:4, testament:"OT" },
  { id:32, text: "But the fruit of the Spirit is love, joy, peace, forbearance, kindness, goodness, faithfulness.", book:"Galatians", chapter:5, verse:22, testament:"NT" },
  { id:33, text: "Therefore, if anyone is in Christ, the new creation has come: The old has gone, the new is here!", book:"2 Corinthians", chapter:5, verse:17, testament:"NT" },
  { id:34, text: "Ask and it will be given to you; seek and you will find; knock and the door will be opened to you.", book:"Matthew", chapter:7, verse:7, testament:"NT" },
  { id:35, text: "I lift up my eyes to the mountains — where does my help come from? My help comes from the Lord.", book:"Psalms", chapter:121, verse:1, testament:"OT" },
  { id:36, text: "No weapon formed against you shall prosper.", book:"Isaiah", chapter:54, verse:17, testament:"OT" },
  { id:37, text: "The heart is deceitful above all things and beyond cure. Who can understand it?", book:"Jeremiah", chapter:17, verse:9, testament:"OT" },
  { id:38, text: "Let your light shine before others, that they may see your good deeds and glorify your Father in heaven.", book:"Matthew", chapter:5, verse:16, testament:"NT" },
  { id:39, text: "Do not let your hearts be troubled. You believe in God; believe also in me.", book:"John", chapter:14, verse:1, testament:"NT" },
  { id:40, text: "Cast all your anxiety on him because he cares for you.", book:"1 Peter", chapter:5, verse:7, testament:"NT" },
];

// Books list for generating wrong answers
const BOOKS_OT = ["Genesis","Exodus","Leviticus","Numbers","Deuteronomy","Joshua","Judges","Ruth","1 Samuel","2 Samuel","1 Kings","2 Kings","1 Chronicles","2 Chronicles","Ezra","Nehemiah","Esther","Job","Psalms","Proverbs","Ecclesiastes","Isaiah","Jeremiah","Lamentations","Ezekiel","Daniel","Hosea","Joel","Amos","Micah","Nahum","Habakkuk","Zephaniah","Haggai","Zechariah","Malachi"];
const BOOKS_NT = ["Matthew","Mark","Luke","John","Acts","Romans","1 Corinthians","2 Corinthians","Galatians","Ephesians","Philippians","Colossians","1 Thessalonians","2 Thessalonians","1 Timothy","2 Timothy","Titus","Philemon","Hebrews","James","1 Peter","2 Peter","1 John","2 John","3 John","Jude","Revelation"];
const ALL_BOOKS = [...BOOKS_OT, ...BOOKS_NT];
