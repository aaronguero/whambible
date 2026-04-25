import { useState, useEffect, useRef, useCallback } from "react";

// ── Asset URLs ──
const LANDSCAPE_BG  = "https://media.base44.com/images/public/69df9a909b33058a5ce47831/33b065c94_generated_image.png";
const CHAR_SOLO     = "https://media.base44.com/images/public/69df9a909b33058a5ce47831/b23c98cb8_generated_image.png";
const CHAR_GAMEOVER = "https://media.base44.com/images/public/69df9a909b33058a5ce47831/c5aa4771c_generated_image.png";
const CHAR_PRAYER   = "https://media.base44.com/images/public/69df9a909b33058a5ce47831/a21cde22c_generated_image.png";
const WHAM_AUDIO = "https://media.base44.com/videos/public/69c40c6701d9dfdb1df69d2b/5d143ab80_51a54c36d_wham-slam-voice1.webm";
const WHAM_CHARS    = "https://media.base44.com/images/public/69df9a909b33058a5ce47831/85be9d10e_generated_image.png";
// WHAM_TEXT_IMG retired — replaced by pure CSS text (no background dependency)

const C = {
  cobalt:    "#1A3A5C",
  cobaltDark:"#0D1F35",
  teal:      "#1E7A8C",
  tealLight: "#3ABDD4",
  gold:      "#D4921A",
  goldLight: "#F5C842",
  white:     "#FFFFFF",
  offWhite:  "#F4F0E8",
  terra:     "#C05A2A",
  emerald:   "#1A7A4A",
  red:       "#C0392B",
};

// ── Sample Verse Pool ──
// ── WHAM_VERSES — 300 verses, all 66 books, 4 tiers (Tasks 6+7) ───────────────
// tier: "squire"(5pt) | "warrior"(10pt) | "knight"(15pt) | "champion"(20pt)
// English text stored locally. Other languages fetched via bible-api.com.
// ══════════════════════════════════════════════════════════════════════════════

// ── Translation Engine (Option C) ──────────────────────────────────────────
const BIBLE_TRANSLATIONS = {
  en:"kjv", es:"rvr1960", fr:"lsg", de:"luther1912",
  pt:"almeida", it:"diodati", zh:"cunpss", ru:"synodal",
  ar:"arabsvd", ko:"korean", hi:"hindi", ja:"kjv",
};
function getActiveLang() {
  try { return localStorage.getItem("wb_language") || "en"; } catch { return "en"; }
}
async function fetchVerse(book, ch, vs, lang, fallbackText) {
  if (!lang || lang === "en") return { text: fallbackText };
  const cacheKey = `wb_v_${book}_${ch}_${vs}_${lang}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) { try { return JSON.parse(cached); } catch {} }
  const translation = BIBLE_TRANSLATIONS[lang] || "kjv";
  const url = `https://bible-api.com/${encodeURIComponent(book)}+${ch}:${vs}?translation=${translation}`;
  try {
    const res  = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const text = (data.verses?.[0]?.text || data.text || "").trim().replace(/\n/g, " ");
    if (!text) throw new Error("empty");
    const result = { text };
    localStorage.setItem(cacheKey, JSON.stringify(result));
    return result;
  } catch (err) {
    console.warn("[WhamBible] fetchVerse fallback:", err.message);
    return { text: fallbackText };
  }
}

const WHAM_VERSES = [
  // ── SQUIRE (5pt) ─────────────────────────────────────────────────────
  { book:"John",              ch:3,  vs:16, tier:"squire",   text:"For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life." },
  { book:"Psalms",            ch:23, vs:1,  tier:"squire",   text:"The Lord is my shepherd, I lack nothing." },
  { book:"Romans",            ch:8,  vs:28, tier:"squire",   text:"And we know that in all things God works for the good of those who love him, who have been called according to his purpose." },
  { book:"Proverbs",          ch:3,  vs:5,  tier:"squire",   text:"Trust in the Lord with all your heart and lean not on your own understanding." },
  { book:"Philippians",       ch:4,  vs:13, tier:"squire",   text:"I can do all this through him who gives me strength." },
  { book:"Jeremiah",          ch:29, vs:11, tier:"squire",   text:"For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, plans to give you hope and a future." },
  { book:"Isaiah",            ch:40, vs:31, tier:"squire",   text:"But those who hope in the Lord will renew their strength. They will soar on wings like eagles; they will run and not grow weary, they will walk and not be faint." },
  { book:"Matthew",           ch:11, vs:28, tier:"squire",   text:"Come to me, all you who are weary and burdened, and I will give you rest." },
  { book:"Psalms",            ch:46, vs:10, tier:"squire",   text:"He says, Be still, and know that I am God; I will be exalted among the nations, I will be exalted in the earth." },
  { book:"Joshua",            ch:1,  vs:9,  tier:"squire",   text:"Have I not commanded you? Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go." },
  { book:"Proverbs",          ch:3,  vs:6,  tier:"squire",   text:"In all your ways submit to him, and he will make your paths straight." },
  { book:"Romans",            ch:12, vs:2,  tier:"squire",   text:"Do not conform to the pattern of this world, but be transformed by the renewing of your mind." },
  { book:"Matthew",           ch:6,  vs:33, tier:"squire",   text:"But seek first his kingdom and his righteousness, and all these things will be given to you as well." },
  { book:"John",              ch:14, vs:6,  tier:"squire",   text:"Jesus answered, I am the way and the truth and the life. No one comes to the Father except through me." },
  { book:"Psalms",            ch:119,vs:105,tier:"squire",   text:"Your word is a lamp for my feet, a light on my path." },
  { book:"Ephesians",         ch:2,  vs:8,  tier:"squire",   text:"For it is by grace you have been saved, through faith, and this is not from yourselves, it is the gift of God." },
  { book:"Genesis",           ch:1,  vs:1,  tier:"squire",   text:"In the beginning God created the heavens and the earth." },
  { book:"Genesis",           ch:1,  vs:27, tier:"squire",   text:"So God created mankind in his own image, in the image of God he created them; male and female he created them." },
  { book:"Exodus",            ch:20, vs:3,  tier:"squire",   text:"You shall have no other gods before me." },
  { book:"Deuteronomy",       ch:6,  vs:5,  tier:"squire",   text:"Love the Lord your God with all your heart and with all your soul and with all your strength." },
  { book:"Psalms",            ch:1,  vs:1,  tier:"squire",   text:"Blessed is the one who does not walk in step with the wicked or stand in the way that sinners take or sit in the company of mockers." },
  { book:"Proverbs",          ch:1,  vs:7,  tier:"squire",   text:"The fear of the Lord is the beginning of wisdom, but fools despise wisdom and instruction." },
  { book:"Isaiah",            ch:53, vs:5,  tier:"squire",   text:"But he was pierced for our transgressions, he was crushed for our iniquities; the punishment that brought us peace was on him, and by his wounds we are healed." },
  { book:"Matthew",           ch:5,  vs:3,  tier:"squire",   text:"Blessed are the poor in spirit, for theirs is the kingdom of heaven." },
  { book:"Luke",              ch:2,  vs:11, tier:"squire",   text:"Today in the town of David a Savior has been born to you; he is the Messiah, the Lord." },
  { book:"John",              ch:1,  vs:1,  tier:"squire",   text:"In the beginning was the Word, and the Word was with God, and the Word was God." },
  { book:"Acts",              ch:1,  vs:8,  tier:"squire",   text:"But you will receive power when the Holy Spirit comes on you; and you will be my witnesses in Jerusalem, and in all Judea and Samaria, and to the ends of the earth." },
  { book:"Romans",            ch:3,  vs:23, tier:"squire",   text:"For all have sinned and fall short of the glory of God." },
  { book:"Romans",            ch:6,  vs:23, tier:"squire",   text:"For the wages of sin is death, but the gift of God is eternal life in Christ Jesus our Lord." },
  { book:"1 Corinthians",     ch:13, vs:4,  tier:"squire",   text:"Love is patient, love is kind. It does not envy, it does not boast, it is not proud." },
  { book:"Galatians",         ch:5,  vs:22, tier:"squire",   text:"But the fruit of the Spirit is love, joy, peace, forbearance, kindness, goodness, faithfulness." },
  { book:"Ephesians",         ch:6,  vs:11, tier:"squire",   text:"Put on the full armor of God, so that you can take your stand against the devil's schemes." },
  { book:"Philippians",       ch:4,  vs:6,  tier:"squire",   text:"Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God." },
  { book:"Hebrews",           ch:11, vs:1,  tier:"squire",   text:"Now faith is confidence in what we hope for and assurance about what we do not see." },
  { book:"James",             ch:1,  vs:2,  tier:"squire",   text:"Consider it pure joy, my brothers and sisters, whenever you face trials of many kinds." },
  { book:"1 John",            ch:4,  vs:8,  tier:"squire",   text:"Whoever does not love does not know God, because God is love." },
  { book:"Revelation",        ch:3,  vs:20, tier:"squire",   text:"Here I am! I stand at the door and knock. If anyone hears my voice and opens the door, I will come in and eat with that person, and they with me." },
  { book:"Ruth",              ch:1,  vs:16, tier:"squire",   text:"But Ruth replied, Do not urge me to leave you or to turn back from you. Where you go I will go, and where you stay I will stay." },
  { book:"1 Samuel",          ch:16, vs:7,  tier:"squire",   text:"The Lord does not look at the things people look at. People look at the outward appearance, but the Lord looks at the heart." },
  { book:"Esther",            ch:4,  vs:14, tier:"squire",   text:"And who knows but that you have come to your royal position for such a time as this?" },
  { book:"Job",               ch:19, vs:25, tier:"squire",   text:"I know that my redeemer lives, and that in the end he will stand on the earth." },
  { book:"2 Thessalonians",   ch:3,  vs:3,  tier:"squire",   text:"But the Lord is faithful, and he will strengthen you and protect you from the evil one." },
  { book:"Titus",             ch:3,  vs:5,  tier:"squire",   text:"He saved us, not because of righteous things we had done, but because of his mercy." },
  { book:"2 Peter",           ch:3,  vs:9,  tier:"squire",   text:"The Lord is not slow in keeping his promise. Instead he is patient with you, not wanting anyone to perish, but everyone to come to repentance." },
  { book:"Jude",              ch:1,  vs:24, tier:"squire",   text:"To him who is able to keep you from stumbling and to present you before his glorious presence without fault and with great joy." },
  { book:"Song of Solomon",   ch:8,  vs:7,  tier:"squire",   text:"Many waters cannot quench love; rivers cannot sweep it away." },
  { book:"Joel",              ch:2,  vs:28, tier:"squire",   text:"And afterward, I will pour out my Spirit on all people. Your sons and daughters will prophesy, your old men will dream dreams, your young men will see visions." },
  { book:"Micah",             ch:6,  vs:8,  tier:"squire",   text:"He has shown you, O mortal, what is good. And what does the Lord require of you? To act justly and to love mercy and to walk humbly with your God." },
  { book:"Malachi",           ch:3,  vs:10, tier:"squire",   text:"Bring the whole tithe into the storehouse, that there may be food in my house. Test me in this, says the Lord Almighty." },
  { book:"Nehemiah",          ch:8,  vs:10, tier:"squire",   text:"Do not grieve, for the joy of the Lord is your strength." },
  { book:"Proverbs",          ch:22, vs:6,  tier:"squire",   text:"Start children off on the way they should go, and even when they are old they will not turn from it." },
  { book:"Judges",            ch:5,  vs:31, tier:"squire",   text:"So may all your enemies perish, Lord! But may all who love you be like the sun when it rises in its strength." },
  { book:"Colossians",        ch:3,  vs:23, tier:"squire",   text:"Whatever you do, work at it with all your heart, as working for the Lord, not for human masters." },
  { book:"Philippians",       ch:4,  vs:7,  tier:"squire",   text:"And the peace of God, which transcends all understanding, will guard your hearts and your minds in Christ Jesus." },
  { book:"Psalms",            ch:37, vs:4,  tier:"squire",   text:"Take delight in the Lord, and he will give you the desires of your heart." },
  { book:"Matthew",           ch:5,  vs:14, tier:"squire",   text:"You are the light of the world. A town built on a hill cannot be hidden." },
  { book:"1 John",            ch:1,  vs:9,  tier:"squire",   text:"If we confess our sins, he is faithful and just and will forgive us our sins and purify us from all unrighteousness." },
  { book:"Isaiah",            ch:41, vs:10, tier:"squire",   text:"So do not fear, for I am with you; do not be dismayed, for I am your God. I will strengthen you and help you." },
  { book:"Lamentations",      ch:3,  vs:22, tier:"squire",   text:"Because of the Lord's great love we are not consumed, for his compassions never fail." },
  { book:"Philemon",          ch:1,  vs:6,  tier:"squire",   text:"I pray that your partnership with us in the faith may be effective in deepening your understanding of every good thing we share for the sake of Christ." },
  { book:"2 John",            ch:1,  vs:6,  tier:"squire",   text:"And this is love: that we walk in obedience to his commands. As you have heard from the beginning, his command is that you walk in love." },
  { book:"3 John",            ch:1,  vs:2,  tier:"squire",   text:"Dear friend, I pray that you may enjoy good health and that all may go well with you, even as your soul is getting along well." },
  { book:"2 Samuel",          ch:22, vs:2,  tier:"squire",   text:"The Lord is my rock, my fortress and my deliverer." },
  { book:"1 Kings",           ch:3,  vs:9,  tier:"squire",   text:"So give your servant a discerning heart to govern your people and to distinguish between right and wrong." },
  { book:"1 Chronicles",      ch:16, vs:34, tier:"squire",   text:"Give thanks to the Lord, for he is good; his love endures forever." },

  // ── WARRIOR (10pt) ───────────────────────────────────────────────────
  { book:"Isaiah",            ch:40, vs:8,  tier:"warrior",  text:"The grass withers and the flowers fall, but the word of our God endures forever." },
  { book:"Psalms",            ch:139,vs:14, tier:"warrior",  text:"I praise you because I am fearfully and wonderfully made; your works are wonderful, I know that full well." },
  { book:"Matthew",           ch:28, vs:19, tier:"warrior",  text:"Therefore go and make disciples of all nations, baptizing them in the name of the Father and of the Son and of the Holy Spirit." },
  { book:"Romans",            ch:8,  vs:38, tier:"warrior",  text:"For I am convinced that neither death nor life, neither angels nor demons, will be able to separate us from the love of God that is in Christ Jesus our Lord." },
  { book:"Proverbs",          ch:16, vs:3,  tier:"warrior",  text:"Commit to the Lord whatever you do, and he will establish your plans." },
  { book:"1 Corinthians",     ch:10, vs:13, tier:"warrior",  text:"No temptation has overtaken you except what is common to mankind. And God is faithful; he will not let you be tempted beyond what you can bear." },
  { book:"Hebrews",           ch:12, vs:1,  tier:"warrior",  text:"Therefore, since we are surrounded by such a great cloud of witnesses, let us throw off everything that hinders and the sin that so easily entangles. And let us run with perseverance the race marked out for us." },
  { book:"James",             ch:1,  vs:22, tier:"warrior",  text:"Do not merely listen to the word, and so deceive yourselves. Do what it says." },
  { book:"Ephesians",         ch:3,  vs:20, tier:"warrior",  text:"Now to him who is able to do immeasurably more than all we ask or imagine, according to his power that is at work within us." },
  { book:"Galatians",         ch:2,  vs:20, tier:"warrior",  text:"I have been crucified with Christ and I no longer live, but Christ lives in me. The life I now live in the body, I live by faith in the Son of God." },
  { book:"John",              ch:15, vs:5,  tier:"warrior",  text:"I am the vine; you are the branches. If you remain in me and I in you, you will bear much fruit; apart from me you can do nothing." },
  { book:"Colossians",        ch:1,  vs:17, tier:"warrior",  text:"He is before all things, and in him all things hold together." },
  { book:"Psalms",            ch:51, vs:10, tier:"warrior",  text:"Create in me a pure heart, O God, and renew a steadfast spirit within me." },
  { book:"Matthew",           ch:22, vs:37, tier:"warrior",  text:"Jesus replied: Love the Lord your God with all your heart and with all your soul and with all your mind." },
  { book:"Romans",            ch:5,  vs:8,  tier:"warrior",  text:"But God demonstrates his own love for us in this: While we were still sinners, Christ died for us." },
  { book:"Isaiah",            ch:55, vs:11, tier:"warrior",  text:"So is my word that goes out from my mouth: It will not return to me empty, but will accomplish what I desire and achieve the purpose for which I sent it." },
  { book:"2 Corinthians",     ch:5,  vs:17, tier:"warrior",  text:"Therefore, if anyone is in Christ, the new creation has come: The old has gone, the new is here!" },
  { book:"Ephesians",         ch:4,  vs:32, tier:"warrior",  text:"Be kind and compassionate to one another, forgiving each other, just as in Christ God forgave you." },
  { book:"James",             ch:4,  vs:7,  tier:"warrior",  text:"Submit yourselves, then, to God. Resist the devil, and he will flee from you." },
  { book:"Hebrews",           ch:4,  vs:12, tier:"warrior",  text:"For the word of God is alive and active. Sharper than any double-edged sword, it penetrates even to dividing soul and spirit, joints and marrow." },
  { book:"Proverbs",          ch:4,  vs:23, tier:"warrior",  text:"Above all else, guard your heart, for everything you do flows from it." },
  { book:"Psalms",            ch:27, vs:1,  tier:"warrior",  text:"The Lord is my light and my salvation, whom shall I fear? The Lord is the stronghold of my life, of whom shall I be afraid?" },
  { book:"Luke",              ch:1,  vs:37, tier:"warrior",  text:"For no word from God will ever fail." },
  { book:"John",              ch:8,  vs:32, tier:"warrior",  text:"Then you will know the truth, and the truth will set you free." },
  { book:"1 John",            ch:4,  vs:4,  tier:"warrior",  text:"You, dear children, are from God and have overcome them, because the one who is in you is greater than the one who is in the world." },
  { book:"Acts",              ch:4,  vs:12, tier:"warrior",  text:"Salvation is found in no one else, for there is no other name under heaven given to mankind by which we must be saved." },
  { book:"2 Timothy",         ch:3,  vs:16, tier:"warrior",  text:"All Scripture is God-breathed and is useful for teaching, rebuking, correcting and training in righteousness." },
  { book:"1 Thessalonians",   ch:5,  vs:16, tier:"warrior",  text:"Rejoice always, pray continually, give thanks in all circumstances; for this is God's will for you in Christ Jesus." },
  { book:"Numbers",           ch:6,  vs:24, tier:"warrior",  text:"The Lord bless you and keep you; the Lord make his face shine on you and be gracious to you; the Lord turn his face toward you and give you peace." },
  { book:"Deuteronomy",       ch:31, vs:6,  tier:"warrior",  text:"Be strong and courageous. Do not be afraid or terrified because of them, for the Lord your God goes with you; he will never leave you nor forsake you." },
  { book:"Leviticus",         ch:19, vs:18, tier:"warrior",  text:"Do not seek revenge or bear a grudge against anyone among your people, but love your neighbor as yourself. I am the Lord." },
  { book:"Exodus",            ch:14, vs:14, tier:"warrior",  text:"The Lord will fight for you; you need only to be still." },
  { book:"Ezra",              ch:7,  vs:10, tier:"warrior",  text:"For Ezra had devoted himself to the study and observance of the Law of the Lord, and to teaching its decrees and laws in Israel." },
  { book:"2 Chronicles",      ch:7,  vs:14, tier:"warrior",  text:"If my people, who are called by my name, will humble themselves and pray and seek my face and turn from their wicked ways, then I will hear from heaven, and I will forgive their sin and will heal their land." },
  { book:"2 Kings",           ch:6,  vs:16, tier:"warrior",  text:"Don't be afraid, the prophet answered. Those who are with us are more than those who are with them." },
  { book:"1 Samuel",          ch:17, vs:47, tier:"warrior",  text:"All those gathered here will know that it is not by sword or spear that the Lord saves; for the battle is the Lord's." },
  { book:"2 Samuel",          ch:7,  vs:28, tier:"warrior",  text:"Sovereign Lord, you are God! Your covenant is trustworthy, and you have promised these good things to your servant." },
  { book:"1 Kings",           ch:18, vs:21, tier:"warrior",  text:"How long will you waver between two opinions? If the Lord is God, follow him; but if Baal is God, follow him." },
  { book:"1 Chronicles",      ch:29, vs:11, tier:"warrior",  text:"Yours, Lord, is the greatness and the power and the glory and the majesty and the splendor, for everything in heaven and earth is yours." },
  { book:"Esther",            ch:4,  vs:16, tier:"warrior",  text:"And if I perish, I perish. But I will go to the king, even though it is against the law." },
  { book:"Job",               ch:1,  vs:21, tier:"warrior",  text:"Naked I came from my mother's womb, and naked I will depart. The Lord gave and the Lord has taken away; may the name of the Lord be praised." },
  { book:"Ecclesiastes",      ch:3,  vs:1,  tier:"warrior",  text:"There is a time for everything, and a season for every activity under the heavens." },
  { book:"Ecclesiastes",      ch:12, vs:13, tier:"warrior",  text:"Now all has been heard; here is the conclusion of the matter: Fear God and keep his commandments, for this is the duty of all mankind." },
  { book:"Song of Solomon",   ch:2,  vs:4,  tier:"warrior",  text:"Let him lead me to the banquet hall, and let his banner over me be love." },
  { book:"Isaiah",            ch:9,  vs:6,  tier:"warrior",  text:"For to us a child is born, to us a son is given, and the government will be on his shoulders. And he will be called Wonderful Counselor, Mighty God, Everlasting Father, Prince of Peace." },
  { book:"Jeremiah",          ch:17, vs:9,  tier:"warrior",  text:"The heart is deceitful above all things and beyond cure. Who can understand it?" },
  { book:"Ezekiel",           ch:36, vs:26, tier:"warrior",  text:"I will give you a new heart and put a new spirit in you; I will remove from you your heart of stone and give you a heart of flesh." },
  { book:"Daniel",            ch:3,  vs:17, tier:"warrior",  text:"If we are thrown into the blazing furnace, the God we serve is able to deliver us from it, and he will deliver us from Your Majesty's hand." },
  { book:"Hosea",             ch:6,  vs:3,  tier:"warrior",  text:"Let us acknowledge the Lord; let us press on to acknowledge him. As surely as the sun rises, he will appear; he will come to us like the winter rains, like the spring rains that water the earth." },
  { book:"Joel",              ch:2,  vs:32, tier:"warrior",  text:"And everyone who calls on the name of the Lord will be saved." },
  { book:"Amos",              ch:5,  vs:24, tier:"warrior",  text:"But let justice roll on like a river, righteousness like a never-failing stream!" },
  { book:"Obadiah",           ch:1,  vs:3,  tier:"warrior",  text:"The pride of your heart has deceived you, you who live in the clefts of the rocks and make your home on the heights." },
  { book:"Jonah",             ch:2,  vs:9,  tier:"warrior",  text:"But I, with shouts of grateful praise, will sacrifice to you. What I have vowed I will make good. I will say, Salvation comes from the Lord." },
  { book:"Micah",             ch:7,  vs:7,  tier:"warrior",  text:"But as for me, I watch in hope for the Lord, I wait for God my Savior; my God will hear me." },
  { book:"Nahum",             ch:1,  vs:7,  tier:"warrior",  text:"The Lord is good, a refuge in times of trouble. He cares for those who trust in him." },
  { book:"Habakkuk",          ch:2,  vs:4,  tier:"warrior",  text:"The righteous person will live by his faithfulness." },
  { book:"Zephaniah",         ch:3,  vs:17, tier:"warrior",  text:"The Lord your God is with you, the Mighty Warrior who saves. He will take great delight in you; in his love he will no longer rebuke you, but will rejoice over you with singing." },
  { book:"Haggai",            ch:2,  vs:4,  tier:"warrior",  text:"Be strong, all you people of the land, declares the Lord, and work. For I am with you, declares the Lord Almighty." },
  { book:"Zechariah",         ch:4,  vs:6,  tier:"warrior",  text:"Not by might nor by power, but by my Spirit, says the Lord Almighty." },
  { book:"Malachi",           ch:4,  vs:2,  tier:"warrior",  text:"But for you who revere my name, the sun of righteousness will rise with healing in its rays." },
  { book:"Judges",            ch:6,  vs:12, tier:"warrior",  text:"When the angel of the Lord appeared to Gideon, he said, The Lord is with you, mighty warrior." },
  { book:"Ruth",              ch:2,  vs:12, tier:"warrior",  text:"May the Lord repay you for what you have done. May you be richly rewarded by the Lord, the God of Israel, under whose wings you have come to take refuge." },
  { book:"2 Peter",           ch:1,  vs:3,  tier:"warrior",  text:"His divine power has given us everything we need for a godly life through our knowledge of him who called us by his own glory and goodness." },
  { book:"Jude",              ch:1,  vs:3,  tier:"warrior",  text:"I felt compelled to write and urge you to contend for the faith that was once for all entrusted to God's holy people." },
  { book:"Titus",             ch:2,  vs:11, tier:"warrior",  text:"For the grace of God has appeared that offers salvation to all people." },
  { book:"Philemon",          ch:1,  vs:7,  tier:"warrior",  text:"Your love has given me great joy and encouragement, because you, brother, have refreshed the hearts of the Lord's people." },
  { book:"2 John",            ch:1,  vs:8,  tier:"warrior",  text:"Watch out that you do not lose what we have worked for, but that you may be rewarded fully." },
  { book:"3 John",            ch:1,  vs:11, tier:"warrior",  text:"Dear friend, do not imitate what is evil but what is good. Anyone who does what is good is from God." },
  { book:"2 Thessalonians",   ch:2,  vs:16, tier:"warrior",  text:"May our Lord Jesus Christ himself and God our Father, who loved us and by his grace gave us eternal encouragement and good hope." },
  { book:"1 Timothy",         ch:6,  vs:12, tier:"warrior",  text:"Fight the good fight of the faith. Take hold of the eternal life to which you were called." },
  { book:"Romans",            ch:10, vs:9,  tier:"warrior",  text:"If you declare with your mouth, Jesus is Lord, and believe in your heart that God raised him from the dead, you will be saved." },
  { book:"1 Corinthians",     ch:15, vs:57, tier:"warrior",  text:"But thanks be to God! He gives us the victory through our Lord Jesus Christ." },
  { book:"2 Corinthians",     ch:12, vs:9,  tier:"warrior",  text:"But he said to me, My grace is sufficient for you, for my power is made perfect in weakness." },
  { book:"Colossians",        ch:2,  vs:6,  tier:"warrior",  text:"So then, just as you received Christ Jesus as Lord, continue to live your lives in him." },
  { book:"Hebrews",           ch:13, vs:8,  tier:"warrior",  text:"Jesus Christ is the same yesterday and today and forever." },
  { book:"Revelation",        ch:21, vs:4,  tier:"warrior",  text:"He will wipe every tear from their eyes. There will be no more death or mourning or crying or pain, for the old order of things has passed away." },
  { book:"Proverbs",          ch:18, vs:10, tier:"warrior",  text:"The name of the Lord is a fortified tower; the righteous run to it and are safe." },
  { book:"Isaiah",            ch:43, vs:2,  tier:"warrior",  text:"When you pass through the waters, I will be with you; and when you pass through the rivers, they will not sweep over you." },

  // ── KNIGHT (15pt) ────────────────────────────────────────────────────
  { book:"Romans",            ch:8,  vs:1,  tier:"knight",   text:"Therefore, there is now no condemnation for those who are in Christ Jesus." },
  { book:"Psalms",            ch:91, vs:1,  tier:"knight",   text:"Whoever dwells in the shelter of the Most High will rest in the shadow of the Almighty." },
  { book:"Isaiah",            ch:26, vs:3,  tier:"knight",   text:"You will keep in perfect peace those whose minds are steadfast, because they trust in you." },
  { book:"John",              ch:10, vs:10, tier:"knight",   text:"The thief comes only to steal and kill and destroy; I have come that they may have life, and have it to the full." },
  { book:"Matthew",           ch:6,  vs:34, tier:"knight",   text:"Therefore do not worry about tomorrow, for tomorrow will worry about itself. Each day has enough trouble of its own." },
  { book:"1 Corinthians",     ch:13, vs:13, tier:"knight",   text:"And now these three remain: faith, hope and love. But the greatest of these is love." },
  { book:"Ephesians",         ch:2,  vs:10, tier:"knight",   text:"For we are God's handiwork, created in Christ Jesus to do good works, which God prepared in advance for us to do." },
  { book:"Hebrews",           ch:11, vs:6,  tier:"knight",   text:"And without faith it is impossible to please God, because anyone who comes to him must believe that he exists and that he rewards those who earnestly seek him." },
  { book:"James",             ch:1,  vs:17, tier:"knight",   text:"Every good and perfect gift is from above, coming down from the Father of the heavenly lights, who does not change like shifting shadows." },
  { book:"1 Peter",           ch:5,  vs:7,  tier:"knight",   text:"Cast all your anxiety on him because he cares for you." },
  { book:"Philippians",       ch:4,  vs:11, tier:"knight",   text:"I have learned, in whatsoever state I am, therewith to be content." },
  { book:"Galatians",         ch:5,  vs:1,  tier:"knight",   text:"It is for freedom that Christ has set us free. Stand firm, then, and do not let yourselves be burdened again by a yoke of slavery." },
  { book:"Colossians",        ch:3,  vs:2,  tier:"knight",   text:"Set your minds on things above, not on earthly things." },
  { book:"Acts",              ch:2,  vs:38, tier:"knight",   text:"Peter replied, Repent and be baptized, every one of you, in the name of Jesus Christ for the forgiveness of your sins. And you will receive the gift of the Holy Spirit." },
  { book:"Luke",              ch:6,  vs:31, tier:"knight",   text:"Do to others as you would have them do to you." },
  { book:"Mark",              ch:11, vs:24, tier:"knight",   text:"Therefore I tell you, whatever you ask for in prayer, believe that you have received it, and it will be yours." },
  { book:"Proverbs",          ch:11, vs:25, tier:"knight",   text:"A generous person will prosper; whoever refreshes others will be refreshed." },
  { book:"Psalms",            ch:73, vs:26, tier:"knight",   text:"My flesh and my heart may fail, but God is the strength of my heart and my portion forever." },
  { book:"2 Corinthians",     ch:4,  vs:17, tier:"knight",   text:"For our light and momentary troubles are achieving for us an eternal glory that far outweighs them all." },
  { book:"Romans",            ch:15, vs:13, tier:"knight",   text:"May the God of hope fill you with all joy and peace as you trust in him, so that you may overflow with hope by the power of the Holy Spirit." },
  { book:"Isaiah",            ch:30, vs:21, tier:"knight",   text:"Whether you turn to the right or to the left, your ears will hear a voice behind you, saying, This is the way; walk in it." },
  { book:"Jeremiah",          ch:31, vs:33, tier:"knight",   text:"I will put my law in their minds and write it on their hearts. I will be their God, and they will be my people." },
  { book:"Daniel",            ch:6,  vs:22, tier:"knight",   text:"My God sent his angel, and he shut the mouths of the lions. They have not hurt me, because I was found innocent in his sight." },
  { book:"Hosea",             ch:14, vs:9,  tier:"knight",   text:"Who is wise? Let them realize these things. The ways of the Lord are right; the righteous walk in them." },
  { book:"Nehemiah",          ch:4,  vs:14, tier:"knight",   text:"Don't be afraid of them. Remember the Lord, who is great and awesome, and fight for your families, your sons and your daughters, your wives and your homes." },
  { book:"Job",               ch:38, vs:4,  tier:"knight",   text:"Where were you when I laid the earth's foundation? Tell me, if you understand." },
  { book:"Genesis",           ch:22, vs:14, tier:"knight",   text:"So Abraham called that place The Lord Will Provide. And to this day it is said, On the mountain of the Lord it will be provided." },
  { book:"Exodus",            ch:3,  vs:14, tier:"knight",   text:"God said to Moses, I am who I am. This is what you are to say to the Israelites: I am has sent me to you." },
  { book:"Leviticus",         ch:20, vs:7,  tier:"knight",   text:"Consecrate yourselves and be holy, because I am the Lord your God." },
  { book:"Deuteronomy",       ch:8,  vs:3,  tier:"knight",   text:"He humbled you, causing you to hunger and then feeding you with manna, to teach you that man does not live on bread alone but on every word that comes from the mouth of God." },
  { book:"Judges",            ch:7,  vs:18, tier:"knight",   text:"When I blow with a trumpet, I and all who are with me, then blow your trumpets too, all around the camp, and shout: For the Lord and for Gideon!" },
  { book:"Ruth",              ch:3,  vs:10, tier:"knight",   text:"The Lord bless you, my daughter. This kindness is greater than that which you showed earlier." },
  { book:"1 Samuel",          ch:3,  vs:10, tier:"knight",   text:"The Lord came and stood there, calling as at the other times, Samuel! Samuel! Then Samuel said, Speak, for your servant is listening." },
  { book:"2 Samuel",          ch:23, vs:3,  tier:"knight",   text:"The God of Israel spoke, the Rock of Israel said to me: When one rules over people in righteousness, when he rules in the fear of God." },
  { book:"1 Kings",           ch:8,  vs:27, tier:"knight",   text:"But will God really dwell on earth? The heavens, even the highest heaven, cannot contain you. How much less this temple I have built!" },
  { book:"2 Kings",           ch:2,  vs:9,  tier:"knight",   text:"Elijah said to Elisha, Tell me, what can I do for you before I am taken from you? Let me inherit a double portion of your spirit, Elisha replied." },
  { book:"1 Chronicles",      ch:4,  vs:10, tier:"knight",   text:"Oh, that you would bless me and enlarge my territory! Let your hand be with me, and keep me from harm so that I will be free from pain." },
  { book:"2 Chronicles",      ch:15, vs:7,  tier:"knight",   text:"But as for you, be strong and do not give up, for your work will be rewarded." },
  { book:"Ezra",              ch:8,  vs:22, tier:"knight",   text:"The gracious hand of our God is on everyone who looks to him, but his great anger is against all who forsake him." },
  { book:"Esther",            ch:2,  vs:20, tier:"knight",   text:"Esther had kept secret her family background and nationality just as Mordecai had told her to do, for she continued to follow Mordecai's instructions." },
  { book:"Ecclesiastes",      ch:4,  vs:9,  tier:"knight",   text:"Two are better than one, because they have a good return for their labor: If either of them falls down, one can help the other up." },
  { book:"Song of Solomon",   ch:4,  vs:7,  tier:"knight",   text:"You are altogether beautiful, my darling; there is no flaw in you." },
  { book:"Lamentations",      ch:3,  vs:25, tier:"knight",   text:"The Lord is good to those whose hope is in him, to the one who seeks him." },
  { book:"Ezekiel",           ch:37, vs:3,  tier:"knight",   text:"He asked me, Son of man, can these bones live? I said, Sovereign Lord, you alone know." },
  { book:"Micah",             ch:4,  vs:3,  tier:"knight",   text:"They will beat their swords into plowshares and their spears into pruning hooks. Nation will not take up sword against nation, nor will they train for war anymore." },
  { book:"Zephaniah",         ch:1,  vs:7,  tier:"knight",   text:"Be silent before the Sovereign Lord, for the day of the Lord is near." },
  { book:"1 Thessalonians",   ch:4,  vs:16, tier:"knight",   text:"For the Lord himself will come down from heaven, with a loud command, with the voice of the archangel and with the trumpet call of God, and the dead in Christ will rise first." },
  { book:"2 Thessalonians",   ch:1,  vs:11, tier:"knight",   text:"With this in mind, we constantly pray for you, that our God may make you worthy of his calling." },
  { book:"1 Timothy",         ch:4,  vs:8,  tier:"knight",   text:"For physical training is of some value, but godliness has value for all things, holding promise for both the present life and the life to come." },
  { book:"2 Timothy",         ch:1,  vs:7,  tier:"knight",   text:"For the Spirit God gave us does not make us timid, but gives us power, love and self-discipline." },
  { book:"Titus",             ch:1,  vs:9,  tier:"knight",   text:"He must hold firmly to the trustworthy message as it has been taught, so that he can encourage others by sound doctrine and refute those who oppose it." },
  { book:"Philemon",          ch:1,  vs:16, tier:"knight",   text:"No longer as a slave, but better than a slave, as a dear brother. He is very dear to me but even dearer to you, both as a fellow man and as a brother in the Lord." },
  { book:"2 Peter",           ch:3,  vs:18, tier:"knight",   text:"But grow in the grace and knowledge of our Lord and Savior Jesus Christ. To him be glory both now and forever! Amen." },
  { book:"2 John",            ch:1,  vs:9,  tier:"knight",   text:"Anyone who runs ahead and does not continue in the teaching of Christ does not have God; whoever continues in the teaching has both the Father and the Son." },
  { book:"3 John",            ch:1,  vs:4,  tier:"knight",   text:"I have no greater joy than to hear that my children are walking in the truth." },
  { book:"Jude",              ch:1,  vs:20, tier:"knight",   text:"But you, dear friends, by building yourselves up in your most holy faith and praying in the Holy Spirit, keep yourselves in God's love." },
  { book:"Mark",              ch:12, vs:30, tier:"knight",   text:"Love the Lord your God with all your heart and with all your soul and with all your mind and with all your strength." },
  { book:"Luke",              ch:15, vs:20, tier:"knight",   text:"But while he was still a long way off, his father saw him and was filled with compassion for him; he ran to his son, threw his arms around him and kissed him." },
  { book:"1 Peter",           ch:2,  vs:9,  tier:"knight",   text:"But you are a chosen people, a royal priesthood, a holy nation, God's special possession, that you may declare the praises of him who called you out of darkness into his wonderful light." },
  { book:"Revelation",        ch:22, vs:20, tier:"knight",   text:"He who testifies to these things says, Yes, I am coming soon. Amen. Come, Lord Jesus." },
  { book:"Proverbs",          ch:31, vs:25, tier:"knight",   text:"She is clothed with strength and dignity; she can laugh at the days to come." },
  { book:"Psalms",            ch:23, vs:4,  tier:"knight",   text:"Even though I walk through the darkest valley, I will fear no evil, for you are with me; your rod and your staff, they comfort me." },
  { book:"Isaiah",            ch:46, vs:4,  tier:"knight",   text:"Even to your old age and gray hairs I am he, I am he who will sustain you. I have made you and I will carry you; I will sustain you and I will rescue you." },

  // ── CHAMPION (20pt) ──────────────────────────────────────────────────
  { book:"Romans",            ch:8,  vs:31, tier:"champion", text:"What, then, shall we say in response to these things? If God is for us, who can be against us?" },
  { book:"John",              ch:17, vs:17, tier:"champion", text:"Sanctify them by the truth; your word is truth." },
  { book:"Psalms",            ch:16, vs:11, tier:"champion", text:"You make known to me the path of life; you will fill me with joy in your presence, with eternal pleasures at your right hand." },
  { book:"Isaiah",            ch:64, vs:4,  tier:"champion", text:"Since ancient times no one has heard, no ear has perceived, no eye has seen any God besides you, who acts on behalf of those who wait for him." },
  { book:"Matthew",           ch:4,  vs:4,  tier:"champion", text:"Jesus answered, It is written: Man shall not live on bread alone, but on every word that comes from the mouth of God." },
  { book:"Romans",            ch:11, vs:33, tier:"champion", text:"Oh, the depth of the riches of the wisdom and knowledge of God! How unsearchable his judgments, and his paths beyond tracing out!" },
  { book:"1 Corinthians",     ch:2,  vs:9,  tier:"champion", text:"What no eye has seen, what no ear has heard, and what no human mind has conceived, the things God has prepared for those who love him." },
  { book:"Ephesians",         ch:1,  vs:18, tier:"champion", text:"I pray that the eyes of your heart may be enlightened in order that you may know the hope to which he has called you, the riches of his glorious inheritance in his holy people." },
  { book:"Hebrews",           ch:2,  vs:18, tier:"champion", text:"Because he himself suffered when he was tempted, he is able to help those who are being tempted." },
  { book:"Revelation",        ch:1,  vs:8,  tier:"champion", text:"I am the Alpha and the Omega, says the Lord God, who is, and who was, and who is to come, the Almighty." },
  { book:"John",              ch:6,  vs:35, tier:"champion", text:"Then Jesus declared, I am the bread of life. Whoever comes to me will never go hungry, and whoever believes in me will never be thirsty." },
  { book:"Colossians",        ch:1,  vs:27, tier:"champion", text:"To them God has chosen to make known among the Gentiles the glorious riches of this mystery, which is Christ in you, the hope of glory." },
  { book:"Galatians",         ch:3,  vs:28, tier:"champion", text:"There is neither Jew nor Gentile, neither slave nor free, nor is there male and female, for you are all one in Christ Jesus." },
  { book:"Proverbs",          ch:2,  vs:6,  tier:"champion", text:"For the Lord gives wisdom; from his mouth come knowledge and understanding." },
  { book:"Isaiah",            ch:55, vs:8,  tier:"champion", text:"For my thoughts are not your thoughts, neither are your ways my ways, declares the Lord." },
  { book:"Psalms",            ch:111,vs:10, tier:"champion", text:"The fear of the Lord is the beginning of wisdom; all who follow his precepts have good understanding." },
  { book:"Acts",              ch:17, vs:28, tier:"champion", text:"For in him we live and move and have our being. As some of your own poets have said, We are his offspring." },
  { book:"2 Corinthians",     ch:10, vs:5,  tier:"champion", text:"We demolish arguments and every pretension that sets itself up against the knowledge of God, and we take captive every thought to make it obedient to Christ." },
  { book:"Hebrews",           ch:7,  vs:25, tier:"champion", text:"Therefore he is able to save completely those who come to God through him, because he always lives to intercede for them." },
  { book:"James",             ch:5,  vs:16, tier:"champion", text:"The prayer of a righteous person is powerful and effective." },
  { book:"Philippians",       ch:3,  vs:10, tier:"champion", text:"I want to know Christ, yes, to know the power of his resurrection and participation in his sufferings, becoming like him in his death." },
  { book:"Romans",            ch:12, vs:21, tier:"champion", text:"Do not be overcome by evil, but overcome evil with good." },
  { book:"Luke",              ch:10, vs:27, tier:"champion", text:"Love the Lord your God with all your heart and with all your soul and with all your strength and with all your mind; and, Love your neighbor as yourself." },
  { book:"Mark",              ch:8,  vs:36, tier:"champion", text:"What good is it for someone to gain the whole world, yet forfeit their soul?" },
  { book:"1 Peter",           ch:1,  vs:24, tier:"champion", text:"All people are like grass, and all their glory is like the flowers of the field; the grass withers and the flowers fall, but the word of the Lord endures forever." },
  { book:"1 Timothy",         ch:2,  vs:5,  tier:"champion", text:"For there is one God and one mediator between God and mankind, the man Christ Jesus." },
  { book:"2 Timothy",         ch:4,  vs:7,  tier:"champion", text:"I have fought the good fight, I have finished the race, I have kept the faith." },
  { book:"Titus",             ch:2,  vs:13, tier:"champion", text:"While we wait for the blessed hope, the appearing of the glory of our great God and Savior, Jesus Christ." },
  { book:"1 John",            ch:2,  vs:17, tier:"champion", text:"The world and its desires pass away, but whoever does the will of God lives forever." },
  { book:"Psalms",            ch:19, vs:1,  tier:"champion", text:"The heavens declare the glory of God; the skies proclaim the work of his hands." },
  { book:"Genesis",           ch:50, vs:20, tier:"champion", text:"You intended to harm me, but God intended it for good to accomplish what is now being done, the saving of many lives." },
  { book:"Isaiah",            ch:53, vs:6,  tier:"champion", text:"We all, like sheep, have gone astray, each of us has turned to our own way; and the Lord has laid on him the iniquity of us all." },
  { book:"Jeremiah",          ch:1,  vs:5,  tier:"champion", text:"Before I formed you in the womb I knew you, before you were born I set you apart; I appointed you as a prophet to the nations." },
  { book:"Daniel",            ch:12, vs:3,  tier:"champion", text:"Those who are wise will shine like the brightness of the heavens, and those who lead many to righteousness, like the stars for ever and ever." },
  { book:"Joel",              ch:3,  vs:10, tier:"champion", text:"Beat your plowshares into swords and your pruning hooks into spears. Let the weakling say, I am strong!" },
  { book:"Zechariah",         ch:9,  vs:9,  tier:"champion", text:"Rejoice greatly, Daughter Zion! See, your king comes to you, righteous and victorious, lowly and riding on a donkey." },
  { book:"Malachi",           ch:3,  vs:6,  tier:"champion", text:"I the Lord do not change. So you, the descendants of Jacob, are not destroyed." },
  { book:"Revelation",        ch:5,  vs:9,  tier:"champion", text:"And they sang a new song, saying: You are worthy to take the scroll and to open its seals, because you were slain, and with your blood you purchased for God persons from every tribe and language and people and nation." },
  { book:"Job",               ch:42, vs:5,  tier:"champion", text:"My ears had heard of you but now my eyes have seen you." },
  { book:"Proverbs",          ch:8,  vs:17, tier:"champion", text:"I love those who love me, and those who seek me find me." },
  { book:"Ecclesiastes",      ch:9,  vs:11, tier:"champion", text:"The race is not to the swift or the battle to the strong, nor does food come to the wise or wealth to the brilliant or favor to the learned; but time and chance happen to them all." },
];

// ══════════════════════════════════════════════════════════════════
// ── TASK 7: Bible Expansion — Allowed Books by Rank ──────────────
//
// NT = always available (all players from day one)
// OT unlocks progressively by rank:
//   Scribe  : NT only
//   Squire  : NT + Psalms + Proverbs
//   Warrior : + Major Prophets (Isaiah, Jeremiah, Ezekiel, Lamentations)
//   Knight  : + Wisdom books + Minor Prophets + historical books
//   Champion: Full Bible — all 66 books
//
// drawVerse(tierKey, rank) — picks a random verse from the pool that:
//   1. Matches the tier (difficulty selected)
//   2. Is from an allowed book for this rank
//   3. Is ≤ 280 chars (already guaranteed by pool definition)
//   Retries up to 50 times before falling back to NT-only squire verse.
// ══════════════════════════════════════════════════════════════════

const NT_BOOKS = [
  "Matthew","Mark","Luke","John","Acts",
  "Romans","1 Corinthians","2 Corinthians","Galatians","Ephesians",
  "Philippians","Colossians","1 Thessalonians","2 Thessalonians",
  "1 Timothy","2 Timothy","Titus","Philemon",
  "Hebrews","James","1 Peter","2 Peter",
  "1 John","2 John","3 John","Jude","Revelation"
];

const SQUIRE_BOOKS  = [...NT_BOOKS, "Psalms","Proverbs"];
const WARRIOR_BOOKS = [...SQUIRE_BOOKS,
  "Isaiah","Jeremiah","Ezekiel","Lamentations"
];
const KNIGHT_BOOKS  = [...WARRIOR_BOOKS,
  "Job","Ecclesiastes","Song of Solomon",
  "Daniel","Hosea","Joel","Amos","Obadiah","Jonah",
  "Micah","Nahum","Habakkuk","Zephaniah","Haggai","Zechariah","Malachi",
  "Joshua","Judges","Ruth","1 Samuel","2 Samuel",
  "1 Kings","2 Kings","1 Chronicles","2 Chronicles",
  "Ezra","Nehemiah","Esther"
];
// Champion = all 66 — no restriction (null means no filter)
const CHAMPION_BOOKS = null;

function getAllowedBooks(rank) {
  switch (rank) {
    case "champion": return CHAMPION_BOOKS;
    case "knight":   return KNIGHT_BOOKS;
    case "warrior":  return WARRIOR_BOOKS;
    case "squire":   return SQUIRE_BOOKS;
    default:         return NT_BOOKS; // Scribe
  }
}

// ── Rank-up celebration toast ──────────────────────────────────────
// Call after score update. Returns unlock message or null.
function getRankUpMessage(oldScore, newScore) {
  const thresholds = [
    { score: 100,  rank: "Squire",   msg: "🗡️ You are now a Squire!\n📖 Psalms & Proverbs unlocked!" },
    { score: 300,  rank: "Warrior",  msg: "⚔️ You are now a Warrior!\n📖 Major Prophets unlocked!" },
    { score: 600,  rank: "Knight",   msg: "🛡️ You are now a Knight!\n📖 Wisdom & Minor Prophets unlocked!" },
    { score: 1000, rank: "Champion", msg: "👑 You are now a Champion!\n📖 Full Bible unlocked!" },
  ];
  for (const t of thresholds) {
    if (oldScore < t.score && newScore >= t.score) return t.msg;
  }
  return null;
}

function getRank(score) {
  if (score >= 1000) return "champion";
  if (score >= 600)  return "knight";
  if (score >= 300)  return "warrior";
  if (score >= 100)  return "squire";
  return "scribe";
}

// ── drawVerse(tierKey, rank) ───────────────────────────────────────
// tierKey: "squire" | "warrior" | "knight" | "champion"
// rank:    player\'s current rank string
function drawVerse(tierKey, rank) {
  const allowed   = getAllowedBooks(rank);
  const tierPool  = WHAM_VERSES.filter(v =>
    v.tier === tierKey &&
    (allowed === null || allowed.includes(v.book))
  );
  // Fallback: if tier pool is empty after book filter, use squire NT pool
  const pool = tierPool.length > 0
    ? tierPool
    : WHAM_VERSES.filter(v => v.tier === "squire" && NT_BOOKS.includes(v.book));
  return pool[Math.floor(Math.random() * pool.length)];
}
const LEVELS = [
  { pts:5,  tier:"squire",   name:"Squire",   icon:"🗡️", color:"#1E7A8C", hint:10 },
  { pts:10, tier:"warrior",  name:"Warrior",  icon:"⚔️", color:"#D4921A", hint:13 },
  { pts:15, tier:"knight",   name:"Knight",   icon:"🛡️", color:"#C05A2A", hint:15 },
  { pts:20, tier:"champion", name:"Champion", icon:"👑", color:"#7B2D8B", hint:17 },
];


// ── Recovery asset ──
const CHAR_RECOVERY = "https://media.base44.com/images/public/69df9a909b33058a5ce47831/833513c9d_generated_image.png";

// ── Wheel data ──
const ALL_BOOKS = ["Genesis","Exodus","Leviticus","Numbers","Deuteronomy","Joshua","Judges","Ruth","1 Samuel","2 Samuel","1 Kings","2 Kings","1 Chronicles","2 Chronicles","Ezra","Nehemiah","Esther","Job","Psalms","Proverbs","Ecclesiastes","Song of Solomon","Isaiah","Jeremiah","Lamentations","Ezekiel","Daniel","Hosea","Joel","Amos","Obadiah","Jonah","Micah","Nahum","Habakkuk","Zephaniah","Haggai","Zechariah","Malachi","Matthew","Mark","Luke","John","Acts","Romans","1 Corinthians","2 Corinthians","Galatians","Ephesians","Philippians","Colossians","1 Thessalonians","2 Thessalonians","1 Timothy","2 Timothy","Titus","Philemon","Hebrews","James","1 Peter","2 Peter","1 John","2 John","3 John","Jude","Revelation"];
const W_CHAPTERS = Array.from({ length: 150 }, (_, i) => i + 1);
const W_VERSES   = Array.from({ length: 176 }, (_, i) => i + 1);
const SP_RECOVERY_SEC = 7;
const WHEEL_ITEM_H    = 42;
const WHEEL_VISIBLE   = 5;
const WHEEL_CENTER    = 2;
const WHEEL_COPIES    = 5;

const BOOKS = ["Genesis","Exodus","Leviticus","Numbers","Deuteronomy","Joshua","Judges","Ruth","1 Samuel","2 Samuel","1 Kings","2 Kings","1 Chronicles","2 Chronicles","Ezra","Nehemiah","Esther","Job","Psalms","Proverbs","Ecclesiastes","Song of Solomon","Isaiah","Jeremiah","Lamentations","Ezekiel","Daniel","Hosea","Joel","Amos","Obadiah","Jonah","Micah","Nahum","Habakkuk","Zephaniah","Haggai","Zechariah","Malachi","Matthew","Mark","Luke","John","Acts","Romans","1 Corinthians","2 Corinthians","Galatians","Ephesians","Philippians","Colossians","1 Thessalonians","2 Thessalonians","1 Timothy","2 Timothy","Titus","Philemon","Hebrews","James","1 Peter","2 Peter","1 John","2 John","3 John","Jude","Revelation"];

function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5); }

function makeOptions(verse) {
  const correct = { book: verse.book, ch: verse.ch, vs: verse.vs };
  const wrong = shuffle(
    BOOKS.filter(b => b !== verse.book).slice(0, 3).map(b => ({
      book: b,
      ch: Math.floor(Math.random() * 20) + 1,
      vs: Math.floor(Math.random() * 30) + 1,
    }))
  );
  return shuffle([correct, ...wrong]).map(o => `${o.book} ${o.ch}:${o.vs}`);
}

// ══════════════════════════════════════════════════════════════════
// ── WHAM SLAM ────────────────────────────────────────────────────
//
// Universal correct-answer celebration. 4-layer cinematic sequence.
//
// PHASE TIMELINE:
//   Phase 0 │   0ms –  140ms │ WHITE FLASH full screen only
//   Phase 1 │ 140ms –  500ms │ Characters materialize bottom→top
//   Phase 2 │ 500ms –  800ms │ Ball lightning orb drops in ON TOP of chars at knee height
//   Phase 3 │ 800ms – 1400ms │ WHAM CSS text explodes from orb, rubber-band expand
//   Phase 4 │1400ms – 1750ms │ Full fade out
//   onDone  │ 1750ms          │ Fires — round advances
//
// z-index stack (bottom→top):
//   cobalt bg (1) → characters (2) → orb + smoke (3) → WHAM text (4)
//
// WHAM text is pure CSS — gold gradient + layered text-shadow lightning.
// No image asset. No background. Works on any surface.
//
// Props:
//   message  {string} — shown under WHAM text (e.g. "+5")
//   onDone   {fn}     — fires when sequence completes
// ══════════════════════════════════════════════════════════════════

function playWhamSound(audioRef) {
  try {
    if (audioRef && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  } catch(e) {}
}

function WhamSlam({ message = "+5", onDone }) {
  const [phase, setPhase] = useState(0);
  const audioRef = useRef(null);

  // Pre-warm audio on mount so it fires instantly at t=0
  useEffect(() => {
    audioRef.current = new Audio(WHAM_AUDIO);
    audioRef.current.preload = "auto";
    audioRef.current.volume = 1.0;
    audioRef.current.load();
  }, []);

  useEffect(() => {
    playWhamSound(audioRef);  // fires at t=0 — phase 0 (white flash)
    const t1 = setTimeout(() => setPhase(1), 140);   // chars materialize
    const t2 = setTimeout(() => setPhase(2), 500);   // orb drops in
    const t3 = setTimeout(() => setPhase(3), 800);   // WHAM text explodes
    const t4 = setTimeout(() => setPhase(4), 1400);  // fade out
    const t5 = setTimeout(() => onDone && onDone(), 1750);
    return () => { [t1,t2,t3,t4,t5].forEach(clearTimeout); };
  }, []);

  const exiting = phase === 4;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 999, overflow: "hidden",
      background: phase === 0 ? "#FFFFFF" : "#0D1F35",
      opacity: exiting ? 0 : 1,
      transition: exiting ? "opacity 0.35s ease" : phase === 0 ? "background 0.2s ease" : "background 0.25s ease",
    }}>

      {/* ── LAYER 1 (z:2): Characters ── */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none",
        clipPath: phase === 0 ? "inset(100% 0 0 0)" : "inset(0% 0 0 0)",
        transition: phase === 1 ? "clip-path 0.72s cubic-bezier(0.22, 1, 0.36, 1)" : "none",
        opacity: exiting ? 0 : 1,
        ...(exiting && { transition: "opacity 0.35s ease" }),
      }}>
        <img src={WHAM_CHARS} alt="" style={{
          position: "absolute", bottom: 0, left: "50%",
          transform: "translateX(-50%)",
          width: "100vw", maxWidth: 680, minWidth: 320,
          objectFit: "contain", objectPosition: "bottom center",
        }} />
      </div>

      {/* ── LAYER 2 (z:3): Ball lightning orb + smoke ── */}
      {phase >= 2 && (
        <div style={{
          position: "absolute", left: "50%", top: "27%",
          transform: "translate(-50%, -50%)",
          width: 300, height: 140, borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(180,220,255,0.15) 0%, rgba(91,200,255,0.07) 45%, transparent 72%)",
          filter: "blur(22px)", zIndex: 3, pointerEvents: "none",
          opacity: exiting ? 0 : 0.95,
          transition: exiting ? "opacity 0.35s ease" : "opacity 0.4s ease",
          animation: "wb-smoke-drift 1.4s ease-in-out infinite alternate",
        }} />
      )}

      <div style={{
        position: "absolute", left: "50%", top: "27%",
        transform: "translate(-50%, -50%)",
        width:  phase < 2 ? 0 : phase === 2 ? 120 : phase === 3 ? 100 : 80,
        height: phase < 2 ? 0 : phase === 2 ? 120 : phase === 3 ? 100 : 80,
        borderRadius: "50%",
        background: phase < 2 ? "transparent"
          : "radial-gradient(circle, #FFFFFF 0%, #c8eeff 20%, #5bc8ff 40%, rgba(30,122,140,0.45) 60%, transparent 80%)",
        boxShadow: phase < 2 ? "none"
          : "0 0 50px 24px rgba(91,200,255,0.75), 0 0 100px 50px rgba(30,122,140,0.35), 0 0 8px 4px #fff",
        zIndex: 3, pointerEvents: "none",
        transition: phase === 2
          ? "width 0.35s cubic-bezier(0.34,1.56,0.64,1), height 0.35s cubic-bezier(0.34,1.56,0.64,1), background 0.3s ease, box-shadow 0.3s ease"
          : "all 0.3s ease",
        animation: (phase === 2 || phase === 3) ? "wb-orb-pulse 0.55s ease-in-out infinite alternate" : "none",
      }} />

      {/* ── LAYER 3 (z:4): WHAM — pure CSS text, no image, no background ── */}
      <div style={{
        position: "absolute",
        left: "50%",
        top: "30%",
        transform: `translate(-50%, -50%) scale(${phase < 3 ? 0 : phase === 3 ? 1.0 : 0.9})`,
        transformOrigin: "center 215%",
        zIndex: 4, pointerEvents: "none",
        opacity: phase < 3 ? 0 : exiting ? 0 : 1,
        transition: phase === 3
          ? "transform 0.42s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.12s ease"
          : "transform 0.25s ease, opacity 0.35s ease",
        textAlign: "center",
      }}>
        {/* CSS WHAM text — gold gradient + lightning glow shadows */}
        <div style={{
          fontFamily: "'Cinzel', serif",
          fontSize: "clamp(72px, 22vw, 120px)",
          fontWeight: 900,
          letterSpacing: "0.06em",
          lineHeight: 1,
          // Gold gradient fill via background-clip
          background: "linear-gradient(160deg, #fff8c0 0%, #F5C842 25%, #D4921A 55%, #F5C842 75%, #b87614 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          // Lightning glow via layered text-shadow
          // (text-shadow doesn't apply to gradient text in all browsers,
          //  so we use filter: drop-shadow instead — works perfectly)
          filter: phase === 3
            ? [
                "drop-shadow(0 0 6px rgba(255,255,255,0.95))",
                "drop-shadow(0 0 18px rgba(245,200,66,1))",
                "drop-shadow(0 0 40px rgba(245,200,66,0.85))",
                "drop-shadow(0 0 70px rgba(91,200,255,0.7))",
                "drop-shadow(0 0 120px rgba(30,122,140,0.5))",
              ].join(" ")
            : "drop-shadow(0 0 8px rgba(245,200,66,0.4))",
          transition: "filter 0.3s ease",
          animation: phase === 3 ? "wb-wham-flicker 0.25s step-end 3" : "none",
          userSelect: "none",
        }}>
          WHAM
        </div>

        {/* "+5" message */}
        <div style={{
          fontFamily: "'Cinzel', serif",
          fontSize: 26,
          fontWeight: 800,
          letterSpacing: 8,
          color: "#F5C842",
          textShadow: "0 0 24px rgba(245,200,66,0.9), 0 0 48px rgba(245,200,66,0.5)",
          marginTop: 10,
          opacity: phase === 3 ? 1 : 0,
          transform: phase === 3 ? "translateY(0)" : "translateY(10px)",
          transition: "opacity 0.3s ease 0.18s, transform 0.3s ease 0.18s",
          textTransform: "uppercase",
        }}>
          {message}
        </div>

        {/* Gold divider */}
        <div style={{
          width: phase === 3 ? 110 : 0,
          height: 1,
          background: "linear-gradient(90deg, transparent, rgba(245,200,66,0.75), transparent)",
          margin: "10px auto 0",
          transition: "width 0.4s ease 0.22s",
        }} />
      </div>

      {/* ── Electric arc screen flicker (phases 2–3) ── */}
      {(phase === 2 || phase === 3) && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 5, pointerEvents: "none",
          animation: "wb-electric-flicker 0.2s step-end infinite",
          opacity: 0.05, mixBlendMode: "screen", background: "transparent",
        }} />
      )}

      <style>{`
        @keyframes wb-orb-pulse {
          from { box-shadow: 0 0 50px 24px rgba(91,200,255,0.75), 0 0 100px 50px rgba(30,122,140,0.35), 0 0 8px 4px #fff; }
          to   { box-shadow: 0 0 70px 34px rgba(91,200,255,0.95), 0 0 130px 65px rgba(30,122,140,0.5),  0 0 12px 6px #fff; }
        }
        @keyframes wb-smoke-drift {
          from { transform: translate(-50%, -50%) scaleX(1.0)  scaleY(1.0);  opacity: 0.8; }
          to   { transform: translate(-50%, -53%) scaleX(1.15) scaleY(0.85); opacity: 0.55; }
        }
        @keyframes wb-electric-flicker {
          0%  { background: rgba(180,230,255,0.0); }
          20% { background: rgba(180,230,255,0.09); }
          40% { background: rgba(180,230,255,0.0); }
          70% { background: rgba(245,200,66,0.05); }
          100%{ background: rgba(180,230,255,0.0); }
        }
        @keyframes wb-wham-flicker {
          0%   { opacity: 1; }
          33%  { opacity: 0.7; }
          66%  { opacity: 1; }
          100% { opacity: 0.85; }
        }
      `}</style>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════
// ── STREAK FLASH ──────────────────────────────────────────────────
//
// Fires after 3 consecutive correct answers. +5 fixed bonus.
// Battle-style cinematic: sword-clash characters, gold sparks, +5 at contact.
// Total runtime: 900ms. Then onDone fires.
//
// PHASE TIMELINE:
//   Phase 0 │   0ms – 120ms │ White-gold flash
//   Phase 1 │ 120ms – 400ms │ WHAM_CHARS slide in from both sides
//   Phase 2 │ 400ms – 650ms │ "+5 STREAK" explodes at center contact point
//   Phase 3 │ 650ms – 900ms │ Fade out → onDone
// ══════════════════════════════════════════════════════════════════
function StreakFlash({ onDone }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 120);
    const t2 = setTimeout(() => setPhase(2), 400);
    const t3 = setTimeout(() => setPhase(3), 650);
    const t4 = setTimeout(() => { onDone && onDone(); }, 900);
    return () => { [t1,t2,t3,t4].forEach(clearTimeout); };
  }, []);

  const fading = phase === 3;

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:998, overflow:"hidden",
      background: phase === 0 ? "rgba(245,200,66,0.92)" : "rgba(13,31,53,0.96)",
      opacity: fading ? 0 : 1,
      transition: fading ? "opacity 0.25s ease" : phase === 0 ? "none" : "background 0.2s ease",
      display:"flex", alignItems:"center", justifyContent:"center",
      pointerEvents:"none",
    }}>

      {/* Left character — slides in from left */}
      <div style={{
        position:"absolute", bottom:0, left: phase >= 1 ? "5%" : "-60%",
        transition: phase === 1 ? "left 0.28s cubic-bezier(0.22,1,0.36,1)" : "none",
        zIndex:2, pointerEvents:"none",
        transform:"scaleX(-1)",
        opacity: fading ? 0 : 1,
      }}>
        <img src={WHAM_CHARS} alt="" style={{
          width:"55vw", maxWidth:320, minWidth:180,
          objectFit:"contain", objectPosition:"bottom center",
          display:"block",
        }}/>
      </div>

      {/* Right character — slides in from right */}
      <div style={{
        position:"absolute", bottom:0, right: phase >= 1 ? "5%" : "-60%",
        transition: phase === 1 ? "right 0.28s cubic-bezier(0.22,1,0.36,1)" : "none",
        zIndex:2, pointerEvents:"none",
        opacity: fading ? 0 : 1,
      }}>
        <img src={WHAM_CHARS} alt="" style={{
          width:"55vw", maxWidth:320, minWidth:180,
          objectFit:"contain", objectPosition:"bottom center",
          display:"block",
        }}/>
      </div>

      {/* Spark burst at center contact */}
      {phase >= 2 && (
        <div style={{
          position:"absolute", top:"44%", left:"50%",
          transform:"translate(-50%,-50%)",
          zIndex:4, pointerEvents:"none",
          animation:"streak-spark-burst 0.35s ease-out forwards",
        }}>
          {/* Spark rays */}
          {[0,45,90,135,180,225,270,315].map(deg => (
            <div key={deg} style={{
              position:"absolute", top:"50%", left:"50%",
              width: fading ? 0 : 40, height:2,
              background:"linear-gradient(90deg,#F5C842,transparent)",
              transformOrigin:"left center",
              transform:`rotate(${deg}deg)`,
              borderRadius:2,
              opacity: fading ? 0 : 0.85,
              transition:"width 0.2s ease, opacity 0.25s ease",
            }}/>
          ))}
        </div>
      )}

      {/* "+5 STREAK" text — explodes at sword contact point */}
      <div style={{
        position:"absolute", top:"36%", left:"50%",
        transform:`translate(-50%,-50%) scale(${phase < 2 ? 0 : fading ? 0.7 : 1.0})`,
        zIndex:5, pointerEvents:"none",
        opacity: phase < 2 ? 0 : fading ? 0 : 1,
        transition: phase === 2
          ? "transform 0.28s cubic-bezier(0.34,1.56,0.64,1), opacity 0.12s ease"
          : "transform 0.2s ease, opacity 0.25s ease",
        textAlign:"center",
        whiteSpace:"nowrap",
      }}>
        <div style={{
          fontFamily:"'Cinzel',serif",
          fontSize:"clamp(42px,13vw,72px)",
          fontWeight:900,
          letterSpacing:4,
          background:"linear-gradient(180deg,#FFFFFF 0%,#F5C842 40%,#D4921A 100%)",
          WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
          textShadow:"none",
          filter:"drop-shadow(0 0 18px rgba(245,200,66,0.9)) drop-shadow(0 0 36px rgba(245,200,66,0.5))",
          lineHeight:1,
        }}>+5</div>
        <div style={{
          fontFamily:"'Cinzel',serif",
          fontSize:"clamp(11px,3.5vw,16px)",
          fontWeight:800, letterSpacing:6,
          color:"#F5C842",
          textShadow:"0 0 12px rgba(245,200,66,0.8)",
          marginTop:4,
          textTransform:"uppercase",
        }}>STREAK BONUS</div>
      </div>

      <style>{`
        @keyframes streak-spark-burst {
          from { transform: translate(-50%,-50%) scale(0.2); opacity:0; }
          to   { transform: translate(-50%,-50%) scale(1);   opacity:1; }
        }
      `}</style>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════
// ── SCROLL WHEEL ─────────────────────────────────────────────────
// Momentum physics, center-snap, 5-item visible window.
// ══════════════════════════════════════════════════════════════════
function ScrollWheel({ items, startIndex, label, widthClass, onChange }) {
  const outerRef = useRef(null);
  const innerRef = useRef(null);
  const s = useRef({
    offset:0, dragging:false, startY:0, startOffset:0,
    lastY:0, lastT:0, velocity:0, rafId:null, currentIdx:startIndex,
  });

  const normalize = useCallback((offset) => {
    const len = items.length, minOff = len * WHEEL_ITEM_H, maxOff = len * WHEEL_ITEM_H * 3;
    let o = offset;
    while (o < minOff) o += len * WHEEL_ITEM_H;
    while (o > maxOff) o -= len * WHEEL_ITEM_H;
    return o;
  }, [items]);

  const offsetToIdx = useCallback((offset) => {
    const len = items.length;
    const row = Math.round((offset + WHEEL_CENTER * WHEEL_ITEM_H) / WHEEL_ITEM_H);
    return ((row % len) + len) % len;
  }, [items]);

  const applyHighlight = useCallback((idx) => {
    const inner = innerRef.current; if (!inner) return;
    const len = items.length;
    inner.querySelectorAll(".spw-item").forEach((el, i) => {
      const rel  = ((i % len) + len) % len;
      const dist = Math.min(Math.abs(rel-idx), Math.abs(rel-idx+len), Math.abs(rel-idx-len));
      el.className = "spw-item" + (rel===idx?" selected":dist===1?" near1":dist===2?" near2":"");
    });
  }, [items]);

  const setOff = useCallback((offset, animate) => {
    const inner = innerRef.current; if (!inner) return;
    inner.style.transition = animate ? "transform 0.18s cubic-bezier(.22,.68,0,1.2)" : "none";
    inner.style.transform  = `translateY(-${offset}px)`;
    s.current.offset = offset;
    const idx = offsetToIdx(offset);
    s.current.currentIdx = idx;
    applyHighlight(idx);
    onChange?.(idx);
  }, [offsetToIdx, applyHighlight, onChange]);

  const snap = useCallback((offset) => {
    const ctr = offset + WHEEL_CENTER * WHEEL_ITEM_H;
    const snappedC = Math.round(ctr / WHEEL_ITEM_H) * WHEEL_ITEM_H;
    setOff(normalize(snappedC - WHEEL_CENTER * WHEEL_ITEM_H), true);
  }, [normalize, setOff]);

  useEffect(() => {
    const inner = innerRef.current; if (!inner) return;
    inner.innerHTML = "";
    const all = Array(WHEEL_COPIES).fill(items).flat();
    all.forEach(item => {
      const el = document.createElement("div");
      el.className = "spw-item";
      el.textContent = String(item);
      inner.appendChild(el);
    });
    const init = normalize((items.length * 2 + startIndex) * WHEEL_ITEM_H - WHEEL_CENTER * WHEEL_ITEM_H);
    setOff(init, false);
  }, [items, startIndex]);

  const onStart = useCallback((y) => {
    cancelAnimationFrame(s.current.rafId);
    Object.assign(s.current, { dragging:true, startY:y, lastY:y, lastT:performance.now(), velocity:0, startOffset:s.current.offset });
    if (innerRef.current) innerRef.current.style.transition = "none";
  }, []);

  const onMove = useCallback((y) => {
    if (!s.current.dragging) return;
    const now = performance.now(), dt = now - s.current.lastT || 16;
    s.current.velocity = (s.current.lastY - y) / dt;
    s.current.lastY = y; s.current.lastT = now;
    setOff(normalize(s.current.startOffset + (s.current.startY - y)), false);
  }, [normalize, setOff]);

  const onEnd = useCallback(() => {
    if (!s.current.dragging) return;
    s.current.dragging = false;
    let vel = s.current.velocity * 1000, offset = s.current.offset;
    const coast = () => {
      if (Math.abs(vel) < 0.5) { snap(offset); return; }
      vel *= 0.94; offset += vel / 60;
      setOff(normalize(offset), false);
      s.current.rafId = requestAnimationFrame(coast);
    };
    Math.abs(vel) > 80 ? coast() : snap(offset);
  }, [snap, normalize, setOff]);

  useEffect(() => {
    const outer = outerRef.current; if (!outer) return;
    const tStart = e => onStart(e.touches[0].clientY);
    const tMove  = e => { e.preventDefault(); onMove(e.touches[0].clientY); };
    const tEnd   = () => onEnd();
    const mDown  = e => { onStart(e.clientY); e.preventDefault(); };
    const mMove  = e => { if (s.current.dragging) onMove(e.clientY); };
    const mUp    = () => { if (s.current.dragging) onEnd(); };
    const mLeave = () => { if (s.current.dragging) onEnd(); };
    outer.addEventListener("touchstart", tStart, { passive:true });
    outer.addEventListener("touchmove",  tMove,  { passive:false });
    outer.addEventListener("touchend",   tEnd,   { passive:true });
    outer.addEventListener("mousedown",  mDown);
    outer.addEventListener("mousemove",  mMove);
    outer.addEventListener("mouseleave", mLeave);
    document.addEventListener("mouseup", mUp);
    return () => {
      outer.removeEventListener("touchstart", tStart);
      outer.removeEventListener("touchmove",  tMove);
      outer.removeEventListener("touchend",   tEnd);
      outer.removeEventListener("mousedown",  mDown);
      outer.removeEventListener("mousemove",  mMove);
      outer.removeEventListener("mouseleave", mLeave);
      document.removeEventListener("mouseup", mUp);
    };
  }, [onStart, onMove, onEnd]);

  return (
    <div className={`spw-wrap ${widthClass}`}>
      <div className="spw-label">{label}</div>
      <div ref={outerRef} className="spw-outer" style={{ height: WHEEL_ITEM_H * WHEEL_VISIBLE }}>
        <div className="spw-band" style={{ top: WHEEL_CENTER * WHEEL_ITEM_H, height: WHEEL_ITEM_H }} />
        <div className="spw-fade spw-fade-top" />
        <div className="spw-fade spw-fade-bot" />
        <div ref={innerRef} className="spw-inner" />
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// ── SP RECOVERY OVERLAY ──────────────────────────────────────────
// Fires inline over GamePlay when player answers wrong.
// Props: verse { book, ch, vs, text }, onDone(recovered:bool)
// 7s countdown — spin wheels to correct Book/Chapter/Verse, hit Submit.
// Correct = +5 pts, WHAM SLAM fires. Wrong/timeout = 0 pts, round advances.
// ══════════════════════════════════════════════════════════════════
function SPRecovery({ verse, onDone }) {
  const bookIdxRef    = useRef(spStartIdx(ALL_BOOKS, verse.book, 8));
  const chapterIdxRef = useRef(spStartIdx(W_CHAPTERS, verse.ch, 4));
  const verseIdxRef   = useRef(spStartIdx(W_VERSES,   verse.vs, 4));

  const [timeLeft,   setTimeLeft]  = useState(SP_RECOVERY_SEC);
  const [submitted,  setSubmitted] = useState(false);
  const [result,     setResult]    = useState(null);
  const [slamActive, setSlamActive] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const timerRef = useRef(null);
  const audioRef = useRef(null);
  const circumference = 163.4;

  useEffect(() => {
    audioRef.current = new Audio(WHAM_AUDIO);
    audioRef.current.preload = "auto";
    audioRef.current.load();
    return () => clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    let t = SP_RECOVERY_SEC;
    timerRef.current = setInterval(() => {
      t -= 0.1;
      setTimeLeft(parseFloat(t.toFixed(1)));
      if (t <= 0) { clearInterval(timerRef.current); handleSubmit(); }
    }, 100);
    return () => clearInterval(timerRef.current);
  }, []);

  function spStartIdx(arr, correct, offset) {
    const idx = arr.findIndex(v => String(v) === String(correct));
    const len = arr.length;
    return idx >= 0 ? ((idx - offset) % len + len) % len : 0;
  }

  function handleSubmit() {
    if (submitted) return;
    setSubmitted(true);
    clearInterval(timerRef.current);
    const selBook = ALL_BOOKS[bookIdxRef.current];
    const selCh   = W_CHAPTERS[chapterIdxRef.current];
    const selVs   = W_VERSES[verseIdxRef.current];
    const correct = selBook === verse.book && selCh === verse.ch && selVs === verse.vs;
    setResult(correct ? "correct" : "wrong");
    if (correct) {
      try { audioRef.current.currentTime=0; audioRef.current.play().catch(()=>{}); } catch {}
      setSlamActive(true);
      setTimeout(() => { setSlamActive(false); setShowResult(true); }, 1750);
      setTimeout(() => onDone(true),  2600); // brief result shown, then advance
    } else {
      setShowResult(true);
      setTimeout(() => onDone(false), 1400);
    }
  }

  const timerPct  = timeLeft / SP_RECOVERY_SEC;
  const dashOff   = circumference * (1 - timerPct);
  const isRed     = timeLeft <= 3;
  const timerClr  = isRed ? C.red : C.gold;

  const bookStart    = spStartIdx(ALL_BOOKS, verse.book, 8);
  const chapterStart = spStartIdx(W_CHAPTERS, verse.ch,   4);
  const verseStart   = spStartIdx(W_VERSES,   verse.vs,   4);

  return (
    <div style={{
      position:"fixed",inset:0,zIndex:900,overflowY:"auto",
      background:"rgba(10,5,0,0.97)",
      animation:"spRec-in 0.28s cubic-bezier(0.22,1,0.36,1)",
    }}>
      {/* WHAM SLAM mini overlay inside recovery */}
      {slamActive && <WhamSlam message="+5" onDone={() => {}} />}

      {/* Background layers */}
      <div style={{
        position:"fixed",inset:0,zIndex:0,pointerEvents:"none",
        backgroundImage:`url('${LANDSCAPE_BG}')`,
        backgroundSize:"cover",backgroundPosition:"center top",opacity:0.35,
      }}/>
      <div style={{
        position:"fixed",inset:0,zIndex:1,pointerEvents:"none",
        backgroundImage:`url('${CHAR_RECOVERY}')`,
        backgroundSize:"70% auto",backgroundPosition:"center 4%",backgroundRepeat:"no-repeat",opacity:0.7,
        WebkitMaskImage:"linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.8) 10%, rgba(0,0,0,1) 22%, rgba(0,0,0,1) 50%, rgba(0,0,0,0.2) 68%, rgba(0,0,0,0) 82%)",
        maskImage:"linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.8) 10%, rgba(0,0,0,1) 22%, rgba(0,0,0,1) 50%, rgba(0,0,0,0.2) 68%, rgba(0,0,0,0) 82%)",
      }}/>
      <div style={{
        position:"fixed",inset:0,zIndex:2,pointerEvents:"none",
        background:"linear-gradient(to bottom,rgba(10,5,0,0.1) 0%,rgba(10,5,0,0.6) 45%,rgba(10,5,0,0.95) 75%,rgba(10,5,0,1) 100%)",
      }}/>

      {/* Content */}
      <div style={{
        position:"relative",zIndex:4,maxWidth:480,margin:"0 auto",
        padding:"0 16px 60px",display:"flex",flexDirection:"column",alignItems:"center",
      }}>
        <div style={{ height:290, width:"100%" }} />

        {/* Panel */}
        <div style={{
          width:"100%",borderRadius:"20px 20px 0 0",padding:"22px 18px 0",
          background:"linear-gradient(180deg,rgba(10,5,0,0) 0%,rgba(10,5,0,0.88) 8%,rgba(10,5,0,0.98) 18%,rgba(10,5,0,0.98) 100%)",
        }}>
          {/* Curl */}
          <div style={{
            width:"70%",height:4,margin:"0 auto 14px",borderRadius:2,
            background:"linear-gradient(90deg,transparent,rgba(212,146,26,0.7),rgba(58,189,212,0.5),rgba(212,146,26,0.7),transparent)",
          }}/>

          {/* Badge */}
          <div style={{
            fontFamily:"'Cinzel',serif",fontSize:10,letterSpacing:2,
            color:"rgba(212,146,26,0.85)",background:"rgba(212,146,26,0.1)",
            border:"1px solid rgba(212,146,26,0.3)",borderRadius:20,padding:"5px 14px",
            textTransform:"uppercase",marginBottom:12,textAlign:"center",display:"inline-block",
            alignSelf:"center",
          }}>📜 Scroll Recovery · Recover +5</div>

          {/* Verse */}
          <div style={{
            width:"100%",background:"rgba(201,162,39,0.06)",
            border:"1px solid rgba(201,162,39,0.22)",borderRadius:12,padding:"14px 18px",marginBottom:14,
          }}>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:9,letterSpacing:2,color:"rgba(201,162,26,0.5)",textTransform:"uppercase",marginBottom:8}}>📖 The Verse You Missed</div>
            <p style={{fontSize:13,lineHeight:1.7,color:"rgba(240,228,192,0.85)",fontStyle:"italic",margin:"0 0 8px"}}>"{verse.text}"</p>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:11,color:C.gold,textAlign:"right",letterSpacing:1}}>— {verse.book} {verse.ch}:{verse.vs}</div>
          </div>

          {!showResult ? (
            <>
              <p style={{
                fontFamily:"'Cinzel',serif",fontSize:10,letterSpacing:1,
                color:"rgba(201,162,39,0.45)",textAlign:"center",textTransform:"uppercase",
                lineHeight:1.8,marginBottom:10,
              }}>Spin to <strong>Book · Chapter · Verse</strong><br/>Submit before time runs out</p>

              {/* Timer ring */}
              <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginBottom:14}}>
                <div style={{position:"relative",width:64,height:64,flexShrink:0}}>
                  <svg viewBox="0 0 56 56" style={{width:64,height:64,transform:"rotate(-90deg)"}}>
                    <circle cx="28" cy="28" r="26" fill="none" stroke="rgba(212,146,26,0.1)" strokeWidth="4"/>
                    <circle cx="28" cy="28" r="26" fill="none" strokeWidth="4" strokeLinecap="round"
                      strokeDasharray="163.4"
                      style={{strokeDashoffset:dashOff,stroke:timerClr,transition:"stroke-dashoffset 0.1s linear,stroke 0.3s"}}/>
                  </svg>
                  <div style={{
                    position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",
                    fontFamily:"'Cinzel',serif",fontSize:20,fontWeight:700,color:timerClr,
                  }}>{Math.ceil(timeLeft)}</div>
                </div>
              </div>

              {/* Wheels */}
              <div style={{display:"flex",gap:8,width:"100%",justifyContent:"center",alignItems:"flex-start",marginBottom:14}}>
                <ScrollWheel items={ALL_BOOKS} startIndex={bookStart}    label="Book"    widthClass="spw-book"    onChange={idx => bookIdxRef.current=idx}/>
                <ScrollWheel items={W_CHAPTERS} startIndex={chapterStart} label="Chapter" widthClass="spw-chapter" onChange={idx => chapterIdxRef.current=idx}/>
                <ScrollWheel items={W_VERSES}   startIndex={verseStart}   label="Verse"   widthClass="spw-verse"   onChange={idx => verseIdxRef.current=idx}/>
              </div>

              <button onClick={handleSubmit} disabled={submitted} style={{
                width:"100%",padding:"15px 24px",
                background:"linear-gradient(135deg,#D4921A 0%,#b87614 50%,#D4921A 100%)",
                border:"none",borderRadius:12,color:"#fff",
                fontFamily:"'Cinzel',serif",fontSize:15,fontWeight:700,letterSpacing:3,
                textTransform:"uppercase",cursor:submitted?"default":"pointer",
                boxShadow:"0 4px 20px rgba(212,146,26,0.4)",marginBottom:20,
              }}>⚔️ Submit Recovery</button>
            </>
          ) : (
            <div style={{textAlign:"center",padding:"20px 0"}}>
              <div style={{fontSize:36,marginBottom:12}}>{result==="correct"?"✅":"❌"}</div>
              <div style={{
                fontFamily:"'Cinzel',serif",fontSize:18,fontWeight:800,letterSpacing:2,
                color:result==="correct"?C.teal:C.red,marginBottom:8,
              }}>{result==="correct"?"RECOVERED! +5 pts":"MISSED IT"}</div>
              <div style={{fontFamily:"'Cinzel',serif",fontSize:11,color:C.offWhite,opacity:0.7}}>
                {result==="correct"
                  ?`${verse.book} ${verse.ch}:${verse.vs} — locked in!`
                  :`The answer was ${verse.book} ${verse.ch}:${verse.vs}`}
              </div>
            </div>
          )}

        </div>
      </div>

      <style>{`
        @keyframes spRec-in {
          from { transform:translateY(100%); opacity:0.6; }
          to   { transform:translateY(0);    opacity:1; }
        }
        .spw-wrap { display:flex; flex-direction:column; align-items:center; gap:5px; flex:1; }
        .spw-book    { flex:2.4; max-width:175px; }
        .spw-chapter { flex:1;   max-width:80px; }
        .spw-verse   { flex:1;   max-width:80px; }
        .spw-label {
          font-family:'Cinzel',serif; font-size:8px; letter-spacing:3px;
          color:rgba(201,162,39,0.35); text-transform:uppercase;
        }
        .spw-outer {
          position:relative; width:100%; border-radius:12px; overflow:hidden;
          background:linear-gradient(180deg,rgba(10,5,0,0.98) 0%,rgba(30,18,3,0.98) 50%,rgba(10,5,0,0.98) 100%);
          border:1px solid rgba(201,162,39,0.3);
          box-shadow:inset 0 0 24px rgba(0,0,0,0.6),0 4px 16px rgba(0,0,0,0.4);
          cursor:grab; user-select:none; touch-action:none;
        }
        .spw-outer:active { cursor:grabbing; }
        .spw-inner { display:flex; flex-direction:column; will-change:transform; position:absolute; left:0; right:0; top:0; }
        .spw-item {
          height:42px; display:flex; align-items:center; justify-content:center;
          font-family:'Cinzel',serif; font-size:12px;
          color:rgba(201,162,39,0.25); padding:0 5px; text-align:center;
          white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex-shrink:0;
          pointer-events:none; transition:color 0.12s,font-size 0.12s;
        }
        .spw-item.near2   { color:rgba(201,162,39,0.28); font-size:11.5px; }
        .spw-item.near1   { color:rgba(201,162,39,0.55); font-size:12.5px; }
        .spw-item.selected { color:#f0e4c0; font-size:14px; font-weight:700; text-shadow:0 0 12px rgba(201,162,39,0.7); }
        .spw-band {
          position:absolute; left:0; right:0; z-index:4; pointer-events:none;
          background:rgba(201,162,39,0.07);
          border-top:1px solid rgba(201,162,39,0.45); border-bottom:1px solid rgba(201,162,39,0.45);
        }
        .spw-fade { position:absolute; left:0; right:0; z-index:3; pointer-events:none; height:65px; }
        .spw-fade-top { top:0;    background:linear-gradient(180deg,rgba(10,5,0,0.96) 0%,transparent 100%); }
        .spw-fade-bot { bottom:0; background:linear-gradient(0deg,  rgba(10,5,0,0.96) 0%,transparent 100%); }
      `}</style>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════
// ── WHAM DRAIN v4 ────────────────────────────────────────────────
// Designer spec: uniform X/Y scale, circular tangential stretch
// along the spiral path, orbital velocity that ACCELERATES toward
// center (slow outer → violent inner), pixel-pull vacuum effect,
// final implosion once everything hits dead center.
//
// PHYSICS:
//   — scale(X,Y) always congruent — object shrinks as one piece
//   — scaleX stretches TANGENTIALLY (along direction of travel)
//   — scaleY compresses RADIALLY (gravity squeezing inward)
//   — rotate() uses custom cubic-bezier: slow start → exponential
//     acceleration as the spiral tightens
//   — translate() pulls the whole mass toward center, accelerating
//   — blur/brightness only spike at the very end — implosion frame
//
// TIMELINE (1700ms total):
//   0ms        — Stamp frozen. Intact on white void.
//   0–300ms    — Gravity detected. Gentle tilt, first orbital pull.
//   300–700ms  — Orbit established. Circular stretch begins along
//                path. Scale ~0.7, rotate ~120°, speed building.
//   700–1150ms — Acceleration phase. Tighter spiral, scale ~0.3,
//                rotate ~270°. Tangential stretch peaks here.
//   1150–1500ms— Terminal velocity. Scale ~0.05, rotate ~450°.
//                Everything blurring toward singularity.
//   1500–1650ms— IMPLOSION. Scale 0, rotate 540°. Bright white
//                flash-point expands then collapses in 150ms.
//   1700ms     — onDone → SPRecovery slides in.
// ══════════════════════════════════════════════════════════════════
function WhamDrain({ panelRef, onDone }) {
  const cloneRef  = useRef(null);
  const singRef   = useRef(null);

  useEffect(() => {
    // ── Stamp the panel as a frozen clone ──
    const source = panelRef?.current;
    if (source && cloneRef.current) {
      const clone = source.cloneNode(true);
      const rect  = source.getBoundingClientRect();
      clone.style.cssText = `
        position:absolute; top:0; left:0;
        width:${rect.width}px;
        pointer-events:none; overflow:visible;
        border-radius:inherit;
      `;
      clone.querySelectorAll("*").forEach(el => {
        el.style.transition = "none";
        el.style.animation  = "none";
      });
      cloneRef.current.appendChild(clone);
    }

    // ── Double-rAF: mount first, then trigger ──
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (cloneRef.current) cloneRef.current.classList.add("wd-vortex");
      });
    });

    // ── Implosion fires at 1500ms (150ms before onDone) ──
    const implosionT = setTimeout(() => {
      if (singRef.current) singRef.current.classList.add("wd-implode");
    }, 1500);

    const doneT = setTimeout(() => onDone && onDone(), 1700);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(implosionT);
      clearTimeout(doneT);
    };
  }, []);

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:9000,
      background:"#ffffff",
      display:"flex", alignItems:"center", justifyContent:"center",
      overflow:"hidden",
    }}>
      {/* ── The frozen stamp — one intact object pulled into the vortex ── */}
      <div ref={cloneRef} className="wd-stamp" style={{
        position:"relative",
        width:"100%", maxWidth:480,
        transformOrigin:"50% 50%",
        zIndex:2,
      }} />

      {/* ── Implosion point at dead center ── */}
      <div ref={singRef} className="wd-implode-ring" style={{
        position:"absolute",
        top:"50%", left:"50%",
        transform:"translate(-50%,-50%)",
        zIndex:5, pointerEvents:"none",
      }} />

      <style>{`
        /* ══ BASE STAMP ══ */
        .wd-stamp {
          will-change: transform, opacity, filter;
        }

        /* ══ VORTEX DRAIN ══════════════════════════════════════════════
           Circular stretch = scaleX elongates ALONG direction of travel
           while scaleY compresses inward. Both start equal and diverge
           as the spiral tightens. Rotation accelerates exponentially —
           the custom timing function front-loads the slow outer orbit
           and back-loads the violent terminal pull.
           translate(-2%,-2%) nudges mass toward center continuously.
        ══════════════════════════════════════════════════════════════ */
        .wd-vortex {
          animation: wdVortex 1.5s cubic-bezier(0.12, 0, 0.95, 1) forwards;
        }

        @keyframes wdVortex {

          /* FRAME 0: Intact. Gravity just beginning to bite. */
          0% {
            transform:
              translate(0%, 0%)
              rotate(0deg)
              scale(1, 1)
              skewX(0deg);
            opacity: 1;
            filter: blur(0px) brightness(1);
          }

          /* FRAME 1 ~18% (270ms): First orbital tug.
             Slight tilt, tangential stretch just starting.
             scaleX > scaleY — stretching along the path. */
          18% {
            transform:
              translate(-1%, -1%)
              rotate(45deg)
              scale(0.88, 0.82)
              skewX(-4deg);
            opacity: 1;
            filter: blur(0.3px) brightness(1.02);
          }

          /* FRAME 2 ~38% (570ms): Orbit established.
             Circular stretch visible — object curves with path.
             Velocity building. */
          38% {
            transform:
              translate(-2%, -2%)
              rotate(120deg)
              scale(0.62, 0.54)
              skewX(-10deg);
            opacity: 0.95;
            filter: blur(0.8px) brightness(1.08) contrast(1.1);
          }

          /* FRAME 3 ~57% (855ms): Mid-spiral. Speed doubling.
             scaleX tangential stretch peaks — wide along path.
             scaleY radial compression — squeezed by gravity. */
          57% {
            transform:
              translate(-3%, -2%)
              rotate(228deg)
              scale(0.36, 0.26)
              skewX(-18deg);
            opacity: 0.82;
            filter: blur(2px) brightness(1.2) contrast(1.25);
          }

          /* FRAME 4 ~74% (1110ms): Acceleration phase.
             Orbital path tightening rapidly. Almost gone. */
          74% {
            transform:
              translate(-2%, -1%)
              rotate(348deg)
              scale(0.14, 0.09)
              skewX(-26deg);
            opacity: 0.55;
            filter: blur(5px) brightness(1.6) contrast(1.8);
          }

          /* FRAME 5 ~88% (1320ms): Terminal velocity.
             Pixels racing toward singularity. */
          88% {
            transform:
              translate(-1%, 0%)
              rotate(450deg)
              scale(0.04, 0.025)
              skewX(-30deg);
            opacity: 0.25;
            filter: blur(10px) brightness(2.5) contrast(3);
          }

          /* FRAME 6 100% (1500ms): Everything hits center. White out. */
          100% {
            transform:
              translate(0%, 0%)
              rotate(540deg)
              scale(0, 0)
              skewX(0deg);
            opacity: 0;
            filter: blur(18px) brightness(6) contrast(5);
          }
        }

        /* ══ IMPLOSION RING ════════════════════════════════════════════
           Fires at 1500ms. Expands fast from 0 → 80px, then
           collapses violently back to 0 in 150ms. Final punctuation.
        ══════════════════════════════════════════════════════════════ */
        .wd-implode-ring {
          width: 0; height: 0;
          border-radius: 50%;
          opacity: 0;
        }
        .wd-implode {
          animation: wdImplode 0.2s cubic-bezier(0.2, 0, 0.4, 1) forwards;
        }
        @keyframes wdImplode {
          0%   {
            width: 0; height: 0; opacity: 0;
            box-shadow: none;
            background: transparent;
          }
          35%  {
            width: 80px; height: 80px; opacity: 1;
            background: radial-gradient(circle, #ffffff 0%, rgba(30,122,140,0.9) 40%, rgba(26,58,92,0.6) 70%, transparent 100%);
            box-shadow: 0 0 60px 30px rgba(255,255,255,0.9), 0 0 20px 8px rgba(30,122,140,0.8);
            transform: translate(-50%, -50%);
          }
          70%  {
            width: 20px; height: 20px; opacity: 0.8;
            background: radial-gradient(circle, #ffffff 0%, rgba(30,122,140,1) 60%, transparent 100%);
            box-shadow: 0 0 16px 8px rgba(30,122,140,0.6);
            transform: translate(-50%, -50%);
          }
          100% {
            width: 0; height: 0; opacity: 0;
            box-shadow: none;
            transform: translate(-50%, -50%);
          }
        }
      `}</style>
    </div>
  );
}
// ── SCREEN: Level Select ──
function LevelSelect({ onSelect }) {
  return (
    <div className="wb-screen">
      <div className="wb-bg-land" />
      <div className="wb-bg-char" style={{ backgroundImage: `url('${CHAR_PRAYER}')` }} />
      <div className="wb-bg-tone" />
      <div className="wb-bg-rim" />
      <div className="wb-content">
        <div className="wb-hero-space" style={{ height: 370 }} />
        <div className="wb-scroll-panel">
          <div className="wb-scroll-curl" />
          <p className="wb-tagline">⚔️ Choose Your Challenge ⚔️</p>
          <p style={{ fontSize:11, color:"rgba(245,200,66,0.55)", letterSpacing:1.5, textAlign:"center", marginBottom:14, marginTop:-8 }}>ALL LEVELS OPEN · ANY RANK</p>
          <div style={{ width:"100%", display:"flex", flexDirection:"column", gap:10, marginBottom:20 }}>
            {LEVELS.map(lv => (
              <button key={lv.pts} onClick={() => onSelect(lv)}
                style={{
                  width:"100%", padding:"16px 20px", borderRadius:10,
                  border:`1.5px solid ${lv.color}66`,
                  background:`linear-gradient(135deg, ${lv.color}22, ${lv.color}11)`,
                  color:"#fff", cursor:"pointer", textAlign:"left",
                  fontFamily:"'Cinzel',serif", display:"flex", alignItems:"center", gap:14,
                  boxShadow:`0 2px 12px ${lv.color}22`, transition:"all 0.18s",
                }}
                onMouseEnter={e=>{e.currentTarget.style.background=`linear-gradient(135deg, ${lv.color}55, ${lv.color}33)`;e.currentTarget.style.boxShadow=`0 4px 20px ${lv.color}55`;}}
                onMouseLeave={e=>{e.currentTarget.style.background=`linear-gradient(135deg, ${lv.color}22, ${lv.color}11)`;e.currentTarget.style.boxShadow=`0 2px 12px ${lv.color}22`;}}>
                <span style={{ fontSize:28 }}>{lv.icon}</span>
                <div>
                  <div style={{ fontSize:16, fontWeight:800, letterSpacing:2 }}>{lv.name}</div>
                  <div style={{ fontSize:11, opacity:0.75, letterSpacing:1 }}>{lv.pts} pts per correct answer</div>
                </div>
                <div style={{ marginLeft:"auto", fontSize:22, fontWeight:800, color: C.goldLight }}>
                  {lv.pts}
                </div>
              </button>
            ))}
          </div>
          <button className="wb-btn-ghost" onClick={() => window.location.href = "/"}>← Home</button>
          <div style={{ height:30 }} />
        </div>
      </div>
    </div>
  );
}

// ── SCREEN: Game Play ──
function GamePlay({ level, onDone }) {
  // ── Build round queue using drawVerse (Task 6+7) ──
  // level.tier: "squire"|"warrior"|"knight"|"champion"
  // playerRank: derived from score stored in localStorage
  const playerScore = parseInt(localStorage.getItem("wham_score") || "0", 10);
  const playerRank  = getRank(playerScore);
  const queue = useRef((() => {
    const drawn = [];
    const seen  = new Set();
    let   tries = 0;
    while (drawn.length < 5 && tries < 200) {
      tries++;
      const v = drawVerse(level.tier, playerRank);
      const key = `${v.book}-${v.ch}-${v.vs}`;
      if (!seen.has(key)) { seen.add(key); drawn.push({ ...v, options: makeOptions(v) }); }
    }
    return drawn;
  })());
  const [idx, setIdx]           = useState(0);
  const [score, setScore]       = useState(0);
  const [timeLeft, setTime]     = useState(20);
  const [answered, setAnswered] = useState(false);
  const [chosen, setChosen]     = useState(null);
  const [results, setResults]   = useState([]);
  const [showHint, setShowHint] = useState(false);
  const [whamSlam, setWhamSlam] = useState(false);
  // whamDrain removed — replaced by SPRecovery overlay
  const timerRef    = useRef(null);
  const hintRef     = useRef(null);
  const answeredRef = useRef(false);
  const [streak,      setStreak]      = useState(0);
  const [streakFlash, setStreakFlash] = useState(false);
  const [rankUpMsg,   setRankUpMsg]   = useState(null); // Task 7 rank-up toast
  const [spRecovery,  setSpRecovery] = useState(false);
  const [whamDrain,   setWhamDrain]  = useState(false);
  const panelRef = useRef(null);

  const verse         = queue.current[idx];
  const correctAnswer = `${verse.book} ${verse.ch}:${verse.vs}`;

  // Translation: show English immediately, swap in fetched translation async
  const [translatedText, setTranslatedText] = useState(verse.text);
  useEffect(() => {
    setTranslatedText(verse.text);
    const lang = getActiveLang();
    if (lang !== "en") {
      fetchVerse(verse.book, verse.ch, verse.vs, lang, verse.text)
        .then(r => setTranslatedText(r.text));
    }
  }, [idx]);

  useEffect(() => {
    answeredRef.current = false;
    setTime(20); setAnswered(false); setChosen(null); setShowHint(false);
    timerRef.current = setInterval(() => {
      setTime(t => {
        if (t <= 1) { clearInterval(timerRef.current); handleTimeout(); return 0; }
        return t - 1;
      });
    }, 1000);
    hintRef.current = setTimeout(() => setShowHint(true), (20 - level.hint) * 1000);
    return () => { clearInterval(timerRef.current); clearTimeout(hintRef.current); };
  }, [idx]);

  function handleTimeout() { if (!answeredRef.current) handleAnswer(null); }

  function handleAnswer(opt) {
    if (answeredRef.current) return;
    answeredRef.current = true;
    clearInterval(timerRef.current);
    clearTimeout(hintRef.current);
    setAnswered(true);
    setChosen(opt);
    const correct = opt === correctAnswer;
    if (correct) {
      const newTotal = playerScore + score + level.pts;
      const msg = getRankUpMessage(playerScore + score, newTotal);
      setScore(s => s + level.pts);
      if (msg) setTimeout(() => setRankUpMsg(msg), 900); // show after WHAM SLAM
    }
    setResults(r => [...r, { correct, ref: verse.ref }]);
    if (correct) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak >= 3 && newStreak % 3 === 0) {
        // Every 3rd consecutive correct — streak bonus +5, flash fires BEFORE wham slam
        setScore(s => s + 5);
        const streakTotal = playerScore + score + level.pts + 5;
        const streakMsg = getRankUpMessage(playerScore + score + level.pts, streakTotal);
        if (streakMsg) setTimeout(() => setRankUpMsg(streakMsg), 1500);
        setStreakFlash(true);
      } else {
        setWhamSlam(true);
      }
    } else {
      setStreak(0);
      setWhamDrain(true); // Black-hole drain first, then recovery
    }
  }

  function advance() {
    if (idx + 1 >= queue.current.length) onDone({ score, results });
    else setIdx(i => i + 1);
  }

  function handleWhamSlamDone() {
    setWhamSlam(false);
    setTimeout(() => advance(), 100);
  }

  function handleStreakFlashDone() {
    setStreakFlash(false);
    // After streak flash, fire WHAM SLAM for the correct answer
    setWhamSlam(true);
  }

  function handleDrainDone() {
    setWhamDrain(false);
    setSpRecovery(true);  // Drain complete → Recovery slides in
  }

  function handleRecoveryDone(recovered) {
    setSpRecovery(false);
    if (recovered) {
      // Player nailed the recovery — award +5 and fire WHAM SLAM
      setScore(s => s + 5);
      setWhamSlam(true);
    } else {
      // Missed recovery — just advance
      advance();
    }
  }

  const timerPct   = (timeLeft / 20) * 100;
  const timerColor = timeLeft > 10 ? C.teal : timeLeft > 5 ? C.gold : C.red;

  return (
    <div className="wb-screen">
      <div className="wb-bg-land" />
      <div className="wb-bg-char" style={{ backgroundImage: `url('${CHAR_SOLO}')` }} />
      <div className="wb-bg-tone" />
      <div className="wb-bg-rim" />

      {whamDrain   && <WhamDrain panelRef={panelRef} onDone={handleDrainDone} />}
      {spRecovery && <SPRecovery verse={verse} onDone={handleRecoveryDone} />}
      {streakFlash && <StreakFlash onDone={handleStreakFlashDone} />}
      {whamSlam && <WhamSlam message="+5" onDone={handleWhamSlamDone} />}

      {/* ── Task 7: Rank-Up Toast ── */}
      {rankUpMsg && (
        <div
          onClick={() => setRankUpMsg(null)}
          style={{
            position:"fixed", inset:0, zIndex:8000,
            display:"flex", alignItems:"center", justifyContent:"center",
            background:"rgba(10,5,0,0.75)",
            animation:"wbFadeIn 0.4s ease",
          }}
        >
          <div style={{
            background:"linear-gradient(160deg, #0D1F35 0%, #1A3A5C 60%, #1E7A8C 100%)",
            border:"2px solid #D4921A",
            borderRadius:20, padding:"32px 28px", maxWidth:320, textAlign:"center",
            boxShadow:"0 0 40px rgba(212,146,26,0.5)",
            animation:"wbScaleIn 0.35s cubic-bezier(0.34,1.56,0.64,1)",
          }}>
            <div style={{ fontSize:48, marginBottom:12, lineHeight:1 }}>📖</div>
            {rankUpMsg.split("\n").map((line, i) => (
              <p key={i} style={{
                fontFamily:"'Cinzel',serif",
                fontSize: i===0 ? 22 : 16,
                fontWeight: i===0 ? 800 : 600,
                color: i===0 ? "#F5C842" : "#E8D5A0",
                margin:"6px 0", lineHeight:1.3,
              }}>{line}</p>
            ))}
            <p style={{ fontSize:12, color:"rgba(232,213,160,0.6)", marginTop:16 }}>Tap to continue</p>
          </div>
        </div>
      )}

      <div className="wb-content">
        <div style={{ width:"100%", display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 0 6px" }}>
          <div style={{ fontFamily:"'Cinzel',serif", fontSize:11, color:C.cobalt, letterSpacing:1, opacity:0.7 }}>{level.icon} {level.name}</div>
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
            <div style={{ fontFamily:"'Cinzel',serif", fontSize:16, fontWeight:800, color:C.gold }}>{score} pts</div>
            {streak >= 2 && (
              <div style={{fontFamily:"'Cinzel',serif",fontSize:9,letterSpacing:2,color:"#F5C842",
                animation:"wb-streak-pulse 0.6s ease infinite alternate"}}>
                🔥 {streak} STREAK{streak >= 3 ? " +5!" : ""}
              </div>
            )}
          </div>
          <div style={{ fontFamily:"'Cinzel',serif", fontSize:11, color:C.cobalt, opacity:0.7 }}>{idx+1} / {queue.current.length}</div>
        </div>

        <div style={{ display:"flex", gap:6, marginBottom:10 }}>
          {queue.current.map((_, i) => (
            <div key={i} style={{
              width:10, height:10, borderRadius:"50%",
              background: i < idx ? (results[i]?.correct ? C.teal : C.red) : i === idx ? C.gold : "rgba(26,58,92,0.2)",
              transition:"all 0.3s",
            }} />
          ))}
        </div>

        <div className="wb-hero-space" style={{ height: 269 }} />

        <div className="wb-scroll-panel" ref={panelRef}>
          <div className="wb-scroll-curl" />

          <div style={{ width:"100%", height:5, background:"rgba(26,58,92,0.1)", borderRadius:3, marginBottom:14, overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${timerPct}%`, background:timerColor, borderRadius:3, transition:"width 1s linear, background 0.5s" }} />
          </div>
          <div style={{ textAlign:"right", fontSize:11, fontFamily:"'Cinzel',serif", color:timerColor, marginTop:-12, marginBottom:10 }}>
            {timeLeft}s
          </div>

          <div className="wb-verse-card">
            <div className="wb-verse-label">📜 Know This Verse</div>
            <p className="wb-verse-text">&#x201C;{translatedText}&#x201D;</p>
          </div>

          {showHint && !answered && (
            <div style={{
              width:"100%", background:"rgba(26,58,92,0.06)", border:`1px solid ${C.teal}44`,
              borderRadius:10, padding:"10px 14px", marginBottom:10,
              fontFamily:"'Cinzel',serif", fontSize:11, color:C.cobalt, letterSpacing:0.5,
              animation:"wb-hint-in 0.4s ease",
            }}>
              💡 <strong>Papa says:</strong> This verse is from <em>{verse.book}</em>, chapter {verse.ch}.
            </div>
          )}

          <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:16 }}>
            {verse.options.map((opt, i) => {
              const isCorrect = opt === correctAnswer;
              const isChosen  = opt === chosen;
              let bg = "rgba(255,255,255,0.7)", border = `1.5px solid rgba(26,58,92,0.18)`, color = C.cobaltDark;
              if (answered) {
                if (isCorrect)     { bg = `${C.teal}22`; border = `2px solid ${C.teal}`; color = C.teal; }
                else if (isChosen) { bg = `${C.red}11`;  border = `2px solid ${C.red}`;  color = C.red;  }
              }
              return (
                <button key={i} onClick={() => handleAnswer(opt)} disabled={answered}
                  style={{
                    width:"100%", padding:"13px 16px", borderRadius:10,
                    cursor: answered ? "default" : "pointer",
                    background:bg, border, color, fontFamily:"'Cinzel',serif",
                    fontSize:13, fontWeight:600, textAlign:"left", transition:"all 0.2s",
                    display:"flex", alignItems:"center", gap:12,
                    boxShadow: answered && isCorrect ? `0 0 16px ${C.teal}44` : "none",
                  }}>
                  <span style={{ fontWeight:800, fontSize:15, opacity:0.6, minWidth:18 }}>{["A","B","C","D"][i]}</span>
                  {opt}
                  {answered && isCorrect  && <span style={{ marginLeft:"auto" }}>✓</span>}
                  {answered && isChosen && !isCorrect && <span style={{ marginLeft:"auto" }}>✗</span>}
                </button>
              );
            })}
          </div>
          <div style={{ height:20 }} />
        </div>
      </div>
    </div>
  );
}

// ── SCREEN: Game Over ──
function GameOver({ score, results, level, onReplay, onHome }) {
  const correct = results.filter(r => r.correct).length;
  const pct     = Math.round((correct / results.length) * 100);
  const rank    = score >= 1000 ? "Champion 👑" : score >= 600 ? "Knight 🛡️" : score >= 300 ? "Warrior ⚔️" : score >= 100 ? "Squire 🗡️" : "Scribe 📜";

  return (
    <div className="wb-screen">
      <div className="wb-bg-land" />
      <div className="wb-bg-char" style={{ backgroundImage: `url('${CHAR_GAMEOVER}')` }} />
      <div className="wb-bg-tone" />
      <div className="wb-bg-rim" />
      <div className="wb-content">
        <div className="wb-hero-space" style={{ height: 336 }} />
        <div className="wb-scroll-panel">
          <div className="wb-scroll-curl" />
          <p className="wb-tagline" style={{ fontSize:"1rem", marginBottom:4 }}>
            {pct >= 80 ? "⚔️ Victory!" : pct >= 50 ? "📜 Well Fought!" : "🙏 Keep Studying"}
          </p>
          <p style={{ fontFamily:"'Cinzel',serif", fontSize:11, color:C.teal, letterSpacing:2, textAlign:"center", marginBottom:18, textTransform:"uppercase" }}>
            {rank}
          </p>

          <div style={{ textAlign:"center", margin:"0 auto 20px", width:120, height:120, borderRadius:"50%",
            background:`conic-gradient(${C.gold} ${pct}%, rgba(26,58,92,0.1) 0%)`,
            display:"flex", alignItems:"center", justifyContent:"center",
            boxShadow:`0 0 28px ${C.gold}44`, position:"relative" }}>
            <div style={{ width:90, height:90, borderRadius:"50%", background:C.offWhite,
              display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
              <div style={{ fontFamily:"'Cinzel',serif", fontSize:28, fontWeight:800, color:C.gold }}>{score}</div>
              <div style={{ fontFamily:"'Cinzel',serif", fontSize:9, color:C.cobalt, letterSpacing:1 }}>POINTS</div>
            </div>
          </div>

          <div style={{ width:"100%", display:"flex", gap:8, marginBottom:16 }}>
            {results.map((r, i) => (
              <div key={i} style={{ flex:1, padding:"10px 6px", borderRadius:8, textAlign:"center",
                background: r.correct ? `${C.teal}18` : `${C.red}12`,
                border: `1.5px solid ${r.correct ? C.teal : C.red}44` }}>
                <div style={{ fontSize:16 }}>{r.correct ? "✓" : "✗"}</div>
                <div style={{ fontFamily:"'Cinzel',serif", fontSize:8, color:C.cobalt, marginTop:3, opacity:0.7 }}>
                  {r.ref.split(" ").slice(-1)[0]}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap:10, width:"100%", marginBottom:20 }}>
            <button className="wb-btn-primary" onClick={onReplay}>⚔️ Play Again</button>
            <button className="wb-btn-secondary" onClick={onHome}>🏠 Home</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── ROOT ──
export default function SoloGame() {
  const [screen,     setScreen]     = useState("level");
  const [level,      setLevel]      = useState(null);
  const [gameResult, setGameResult] = useState(null);

  return (
    <div style={{ minHeight:"100vh", background:C.cobaltDark, fontFamily:"'Georgia',serif", overflowX:"hidden", position:"relative" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;800;900&display=swap');

        .wb-screen { min-height:100vh; position:relative; overflow-y:auto; overflow-x:hidden; }

        .wb-bg-land {
          position:fixed; inset:0; z-index:0; pointer-events:none;
          background-image: url('${LANDSCAPE_BG}');
          background-size:cover; background-position:center top;
        }
        .wb-bg-char {
          position:fixed; inset:0; z-index:1; pointer-events:none;
          background-size:80% auto; background-position:center 6%; background-repeat:no-repeat;
        }
        .wb-bg-tone { position:fixed; inset:0; z-index:2; pointer-events:none; display:none; }
        .wb-bg-rim {
          position:fixed; inset:0; z-index:3; pointer-events:none;
          background: radial-gradient(ellipse at 50% -10%, rgba(245,200,66,0.20) 0%, transparent 55%);
        }
        .wb-content {
          position:relative; z-index:4; max-width:480px; margin:0 auto;
          padding:0 16px 40px; display:flex; flex-direction:column; align-items:center;
        }
        .wb-hero-space { width:100%; }
        .wb-scroll-panel {
          width:100%; border-radius:20px 20px 0 0; padding:24px 20px 60px;
          position:relative; z-index:5; margin-top:-56px;
          overflow-y:auto; -webkit-overflow-scrolling:touch;
        }
        .wb-scroll-curl {
          width:80%; height:5px; margin:0 auto 16px; border-radius:3px;
          background: linear-gradient(90deg, transparent, ${C.gold}, ${C.teal}, ${C.gold}, transparent);
          opacity:0.5;
        }
        .wb-tagline {
          font-family:'Cinzel',serif; font-size:0.78rem; letter-spacing:0.16em;
          color:${C.cobalt}; text-transform:uppercase; text-align:center; margin:0 0 16px; opacity:0.85;
        }
        .wb-verse-card {
          width:100%;
          background:linear-gradient(135deg, rgba(26,58,92,0.07) 0%, rgba(30,122,140,0.05) 100%);
          border:1.5px solid rgba(30,122,140,0.30); border-radius:12px; padding:16px 20px;
          box-shadow:0 3px 16px rgba(26,58,92,0.08), inset 0 1px 0 rgba(255,255,255,0.7);
          margin-bottom:14px;
        }
        .wb-verse-label { color:${C.teal}; font-size:10px; letter-spacing:2px; text-transform:uppercase; margin-bottom:8px; font-family:'Cinzel',serif; font-weight:600; }
        .wb-verse-text  { color:${C.cobaltDark}; font-size:13px; line-height:1.7; font-style:italic; margin:0; }
        .wb-btn-primary {
          width:100%; padding:15px 24px;
          background:linear-gradient(135deg, ${C.gold} 0%, #b87614 50%, ${C.gold} 100%);
          border:none; border-radius:10px; color:#fff; font-size:15px; font-weight:700;
          font-family:'Cinzel',serif; letter-spacing:3px; text-transform:uppercase;
          cursor:pointer; transition:all 0.2s; box-shadow:0 4px 20px rgba(212,146,26,0.38);
        }
        .wb-btn-secondary {
          width:100%; padding:13px 24px; background:${C.teal}; border:none; border-radius:10px;
          color:#fff; font-size:14px; font-weight:700; font-family:'Cinzel',serif;
          letter-spacing:2px; text-transform:uppercase; cursor:pointer; transition:all 0.2s;
          box-shadow:0 3px 14px rgba(30,122,140,0.35);
        }
        .wb-btn-ghost {
          width:100%; padding:11px 24px; background:rgba(26,58,92,0.07);
          border:1.5px solid rgba(26,58,92,0.20); border-radius:10px; color:${C.cobalt};
          font-size:13px; font-family:'Cinzel',serif; letter-spacing:1px; text-transform:uppercase; cursor:pointer; transition:all 0.18s;
        }
        @keyframes wb-hint-in { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:none } }
        @keyframes wb-streak-pulse {
          from { opacity: 0.7; transform: scale(1.0); }
          to   { opacity: 1.0; transform: scale(1.08); }
        }
      `}</style>

      {screen === "level" && (
        <LevelSelect onSelect={(lv) => { setLevel(lv); setScreen("game"); }} />
      )}
      {screen === "game" && level && (
        <GamePlay level={level} onDone={(result) => {
          // Persist cumulative score to localStorage for drawVerse book-unlock logic
          const prev = parseInt(localStorage.getItem("wham_score") || "0", 10);
          localStorage.setItem("wham_score", String(prev + result.score));
          setGameResult(result); setScreen("gameover");
        }} />
      )}
      {screen === "gameover" && (
        <GameOver
          score={gameResult.score}
          results={gameResult.results}
          level={level}
          onReplay={() => { setScreen("level"); setGameResult(null); }}
          onHome={() => window.location.href = "/"}
        />
      )}
    </div>
  );
}
