export const MEME_IMAGES = [
  "https://media.discordapp.net/attachments/669130994846269450/1448026337121140907/image.png?ex=6ac1509d&is=6abfff1d&hm=48eb985a2f1b97c441fef33b803d00cd09e5238af9c968f13b65cce577e54a38&=&format=webp&quality=lossless",
  "https://media.discordapp.net/attachments/669130994846269450/1448026336693190709/image.png?ex=6ac1509d&is=6abfff1d&hm=ed92d4d6e6f15367cde03f69a24738305318121454d80260531fdd6132e1a101&=&format=webp&quality=lossless",
] as const;

export function pickRandomMeme(): string {
  return MEME_IMAGES[Math.floor(Math.random() * MEME_IMAGES.length)] ?? MEME_IMAGES[0];
}

export const MEME_APP_IDS = ["cocio", "broed"] as const;
export type MemeAppId = (typeof MEME_APP_IDS)[number];

export function isMemeApp(appId: string): appId is MemeAppId {
  return (MEME_APP_IDS as readonly string[]).includes(appId);
}
